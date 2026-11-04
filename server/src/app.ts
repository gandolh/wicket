import {
  jobParamsSchema,
  jobQuerySchema,
  jobRequestSchema,
  type ErrorBody,
  type HealthResponse,
  type JobView,
} from "@wicket/shared";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyServerOptions } from "fastify";
import type { z } from "zod";
import { openDatabase } from "./db.js";
import { Queue, QueueClosedError, QueueFullError, type Runner } from "./queue.js";
import { Records } from "./records.js";
import { AppTokens } from "./tokens.js";

/**
 * The Wicket API. Apps reach the job routes with their own bearer token:
 *
 *   POST   /v1/jobs       put a job in the queue (202)
 *   GET    /v1/jobs/:id   the job, long-polled with ?wait=N (N up to 25)
 *   DELETE /v1/jobs/:id   cancel it
 *   GET    /v1/health     open, for the deploy's check
 *
 * The browser and the apps reach these under `/wicket-api`; Caddy strips that
 * prefix in production, and this server strips it too (`stripApiPrefix`), so
 * the same build works behind Caddy and on its own.
 *
 * Nothing here logs a body: Fastify's request log has the method and URL,
 * never the headers or the payload, so neither a token nor a prompt is
 * written anywhere.
 */

/** The API prefix as the browser and the apps see it. */
export const API_PREFIX = "/wicket-api";

/** The largest job body accepted: a listing page fits with room to spare. */
export const BODY_LIMIT = 1024 * 1024;

/** A URL without a leading API prefix, when `/`, `?` or the end follows it; any other URL as it is. */
export function stripApiPrefix(url: string, prefix: string = API_PREFIX): string {
  if (!url.startsWith(prefix)) return url;
  const rest = url.slice(prefix.length);
  if (rest === "") return "/";
  if (rest.startsWith("/")) return rest;
  if (rest.startsWith("?")) return `/${rest}`;
  return url;
}

export interface AppOptions {
  /** A file path, or `:memory:` for tests. */
  dbPath: string;
  /** Runs one job: the providers. */
  run: Runner;
  /** The apps and their tokens. Default: none, so every job call is refused. */
  appTokens?: AppTokens;
  /** The API prefix as the browser sees it. Default `/wicket-api`. */
  apiPrefix?: string;
  /** How many jobs may wait at once. Default 200. */
  maxWaiting?: number;
  /** How long a finished job is kept for its caller, in milliseconds. Default 10 minutes. */
  keepFinishedMs?: number;
  /** The clock, in epoch milliseconds, for tests. */
  now?: () => number;
  logger?: FastifyServerOptions["logger"];
}

declare module "fastify" {
  interface FastifyInstance {
    /** The one queue, for the admin routes and the tests. */
    queue: Queue;
    /** The records, for the page and the tests. */
    records: Records;
  }
  interface FastifyRequest {
    /** The app whose token the request carried, on the job routes. */
    wicketApp?: string;
  }
}

/** A path is `prefix` or under it. */
export function isUnder(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

export function pathOf(url: string): string {
  return url.split("?")[0]!;
}

export function fail(reply: FastifyReply, status: number, body: ErrorBody): FastifyReply {
  return reply.status(status).send(body);
}

/** Parse with a contract schema, or answer 400 and return undefined. Messages name the field, never its value. */
export function parse<S extends z.ZodType>(schema: S, value: unknown, reply: FastifyReply): z.output<S> | undefined {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  void fail(reply, 400, {
    code: "invalid_request",
    message: issue ? `${issue.path.join(".") || "request"}: ${issue.message}` : "invalid request",
  });
  return undefined;
}

const UNAUTHORIZED_MESSAGE = "send your app's token as Authorization: Bearer <token>";

export async function buildApp(options: AppOptions): Promise<FastifyInstance> {
  const db = openDatabase(options.dbPath);
  const records = new Records(db);
  const appTokens = options.appTokens ?? AppTokens.parse(undefined);
  const apiPrefix = options.apiPrefix ?? API_PREFIX;
  const app = Fastify({
    logger: options.logger ?? false,
    bodyLimit: BODY_LIMIT,
    rewriteUrl: (request) => stripApiPrefix(request.url ?? "/", apiPrefix),
  });

  const queue = new Queue({
    run: options.run,
    record: (record) => records.add(record),
    firstTicket: records.maxTicket() + 1,
    maxWaiting: options.maxWaiting,
    keepFinishedMs: options.keepFinishedMs,
    now: options.now,
    onError: (message, error) => app.log.error({ err: error }, message),
  });
  app.decorate("queue", queue);
  app.decorate("records", records);
  // Cancel and record whatever waits or runs, then close the file.
  app.addHook("onClose", async () => {
    queue.close();
    db.close();
  });

  // Fastify's own 4xx (bad JSON, a body too large) in the contract's shape.
  // A JSON parse error's message can quote the body, so it is never passed on.
  app.setErrorHandler((error: Error & { statusCode?: number; code?: string }, request, reply) => {
    const status = error.statusCode ?? 500;
    if (status >= 500) {
      request.log.error({ err: { name: error.name, code: error.code } }, "unhandled error");
      return fail(reply, 500, { code: "internal", message: "Wicket hit an error; see its log" });
    }
    const message =
      error.code === "FST_ERR_CTP_INVALID_JSON_BODY" || error.name === "SyntaxError"
        ? "the body is not valid JSON"
        : error.code === "FST_ERR_CTP_BODY_TOO_LARGE"
          ? `the body is larger than ${BODY_LIMIT} bytes`
          : error.code === "FST_ERR_CTP_INVALID_MEDIA_TYPE"
            ? "send the body as application/json"
            : "the request is not valid";
    return fail(reply, status, { code: "invalid_request", message });
  });

  // The job routes: an app's token, or 401. The token names the app.
  app.addHook("onRequest", async (request, reply) => {
    if (!isUnder(pathOf(request.url), "/v1/jobs")) return;
    const name = appTokens.appFor(request.headers.authorization);
    if (name === undefined) return fail(reply, 401, { code: "unauthorized", message: UNAUTHORIZED_MESSAGE });
    request.wicketApp = name;
  });

  app.get("/v1/health", async (): Promise<HealthResponse> => ({ ok: true }));

  app.post("/v1/jobs", async (request, reply) => {
    const body = parse(jobRequestSchema, request.body, reply);
    if (!body) return reply;
    try {
      const view: JobView = queue.submit(request.wicketApp!, body);
      return reply.status(202).send(view);
    } catch (error) {
      if (error instanceof QueueFullError) {
        return fail(reply, 503, { code: "queue_full", message: `${error.limit} jobs are already waiting; try again later` });
      }
      if (error instanceof QueueClosedError) {
        return fail(reply, 503, { code: "internal", message: "Wicket is restarting; try again in a moment" });
      }
      throw error;
    }
  });

  const notFound = (reply: FastifyReply) =>
    fail(reply, 404, { code: "not_found", message: "no such job for this app (a restart forgets every job)" });

  app.get("/v1/jobs/:id", async (request, reply) => {
    const params = parse(jobParamsSchema, request.params, reply);
    if (!params) return reply;
    const query = parse(jobQuerySchema, request.query, reply);
    if (!query) return reply;
    const caller = request.wicketApp!;
    let view: JobView | undefined;
    if (query.wait && query.wait > 0) {
      // A caller that hangs up ends its wait.
      const hungUp = new AbortController();
      const onClose = () => hungUp.abort();
      request.raw.once("close", onClose);
      try {
        view = await queue.waitForChange(params.id, caller, query.wait * 1000, hungUp.signal);
      } finally {
        request.raw.off("close", onClose);
      }
    } else {
      view = queue.get(params.id, caller);
    }
    return view ?? notFound(reply);
  });

  app.delete("/v1/jobs/:id", async (request, reply) => {
    const params = parse(jobParamsSchema, request.params, reply);
    if (!params) return reply;
    return queue.cancel(params.id, request.wicketApp!) ?? notFound(reply);
  });

  app.setNotFoundHandler((request, reply) =>
    fail(reply, 404, { code: "not_found", message: `no route ${request.method} ${pathOf(request.url)}` }),
  );

  return app;
}
