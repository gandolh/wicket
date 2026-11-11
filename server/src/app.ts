import {
  jobParamsSchema,
  jobQuerySchema,
  jobRequestSchema,
  MAX_RECORDS,
  recordsQuerySchema,
  type ClearResponse,
  type ForceCloseResponse,
  type HealthResponse,
  type JobView,
  type QueueResponse,
  type RecordsResponse,
} from "@wicket/shared";
import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
  type FastifyServerOptions,
} from "fastify";
import type { z } from "zod";
import type { Accounts } from "../vendor/ward/ward-auth.js";
import { BODY_LIMIT, resolveDbPath, type Config } from "./config.js";
import { openDatabase } from "./db.js";
import { pathOf, stripApiPrefix } from "./lib/paths.js";
import { Metrics } from "./metrics.js";
import { appTokensPlugin, callerOf } from "./plugins/app-tokens/index.js";
import { openAccounts } from "./plugins/auth/accounts.js";
import { authPlugin } from "./plugins/auth/index.js";
import { errors, fail } from "./plugins/errors.js";
import { pagePlugin } from "./plugins/page.js";
import { createRunner } from "./providers.js";
import { Queue, QueueClosedError, QueueFullError, type Runner } from "./queue.js";
import { Records } from "./records.js";

/**
 * The Wicket API. Two families of routes, each with its own guard:
 *
 * Apps, with their own bearer token (never a session):
 *   POST   /v1/jobs       put a job in the queue (202)
 *   GET    /v1/jobs/:id   the job, long-polled with ?wait=N (N up to 25)
 *   DELETE /v1/jobs/:id   cancel it
 *
 * The queue page, with a signed-in session (never a token):
 *   GET    /v1/queue                  now serving, the running job, the waiting line
 *   POST   /v1/queue/running/cancel   force close
 *   POST   /v1/queue/clear            clear the queue
 *   GET    /v1/records                recent records and counts per app
 *
 * Open: `GET /v1/health` for the deploy's check, and `GET /metrics` for the
 * box's Prometheus, which is refused on any request that came through a proxy.
 * Sign-in lives under `/auth`, from the vendored ward-auth plugin. The built
 * page is served at `/wicket/` (in production Caddy serves it instead), and
 * `/` redirects there.
 *
 * The browser and the apps reach all of it under `/wicket-api`; Caddy strips
 * that prefix in production, and this server strips it too (`stripApiPrefix`),
 * so the same build works behind Caddy and on its own.
 *
 * Nothing here logs a body: Fastify's request log has the method and URL,
 * never the headers or the payload, so neither a token, a cookie nor a prompt
 * is written anywhere.
 */

/** How many records the page gets when it doesn't say. */
const DEFAULT_RECORDS = 50;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Fastify's options that belong to the process: server.ts sets them, and a test leaves them out. */
type ServerOptions = Pick<
  FastifyServerOptions,
  "logger" | "trustProxy" | "connectionTimeout" | "requestTimeout" | "keepAliveTimeout"
>;

export interface BuildAppOptions {
  server?: ServerOptions;
  /** Runs one job. Default: the cloud model from the settings. Tests pass a stub. */
  run?: Runner;
  /** The built page, served at the page path; skipped when the directory does not exist. */
  webDist?: string;
  /** How many jobs may wait at once. Default 200. */
  maxWaiting?: number;
  /** How long a finished job is kept for its caller, in milliseconds. Default 10 minutes. */
  keepFinishedMs?: number;
  /** The clock, in epoch milliseconds, for tests. */
  now?: () => number;
  /** The records. Default: on the app's database. A test that reads them back passes its own. */
  records?: Records;
  /** The local accounts. Default: on the app's database. A test that seeds a user passes its own. */
  accounts?: Accounts;
}

/** Parse with a contract schema, or answer 400 and return undefined. Messages name the field, never its value. */
function parse<S extends z.ZodType>(schema: S, value: unknown, reply: FastifyReply): z.output<S> | undefined {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  void fail(reply, 400, {
    code: "invalid_request",
    message: issue ? `${issue.path.join(".") || "request"}: ${issue.message}` : "invalid request",
  });
  return undefined;
}

/**
 * Whether a browser said the request came from this origin. Absent headers
 * pass (a script or curl sends neither); a browser that sent them and named
 * another site does not. On top of the cookie's `SameSite=Lax`, for the two
 * admin writes.
 */
function sameOrigin(request: FastifyRequest, publicOrigin: string): boolean {
  const fetchSite = request.headers["sec-fetch-site"];
  if (typeof fetchSite === "string" && fetchSite !== "" && fetchSite !== "same-origin") return false;
  const origin = request.headers.origin;
  if (typeof origin === "string" && origin !== "") {
    try {
      return new URL(origin).origin === publicOrigin;
    } catch {
      return false;
    }
  }
  return true;
}

/** A request that came through a proxy: Caddy always adds `X-Forwarded-For`. */
function forwarded(request: FastifyRequest): boolean {
  return request.headers["x-forwarded-for"] !== undefined || request.headers.forwarded !== undefined;
}

/**
 * The app, ready and not listening: server.ts listens, and tests drive it with
 * `inject()`. It registers in a fixed order: the error handler, the session
 * guard and sign-in, the token guard, the routes, then the page and the 404
 * handler. Closing it cancels the queue and closes the database.
 */
export async function buildApp(config: Config, options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const db = openDatabase(resolveDbPath(config.dbPath));
  const records = options.records ?? new Records(db);
  const accounts = options.accounts ?? openAccounts(db);
  const metrics = new Metrics();
  const { apiPrefix, webBase, publicOrigin } = config;
  const now = options.now ?? Date.now;
  const app = Fastify({
    ...options.server,
    bodyLimit: BODY_LIMIT,
    rewriteUrl: (request) => stripApiPrefix(request.url ?? "/", apiPrefix),
  });

  const queue = new Queue({
    run:
      options.run ??
      createRunner({
        cloud: config.cloud,
        // Called only once jobs run, after `app` exists.
        log: { error: (message) => app.log.error(message) },
      }),
    record: (record) => {
      metrics.observe(record);
      records.add(record);
    },
    firstTicket: records.maxTicket() + 1,
    maxWaiting: options.maxWaiting,
    keepFinishedMs: options.keepFinishedMs,
    now,
    onError: (message, error) => app.log.error({ err: error }, message),
  });
  // Cancel and record whatever waits or runs, then close the file.
  app.addHook("onClose", async () => {
    queue.close();
    db.close();
  });

  await app.register(errors);
  await app.register(authPlugin, {
    accounts,
    ward: config.ward,
    publicOrigin,
    apiPrefix,
    webBase,
    trustedProxies: config.trustedProxies,
  });
  await app.register(appTokensPlugin, { appTokens: config.appTokens });

  app.get("/v1/health", async (): Promise<HealthResponse> => ({ ok: true }));

  app.get("/metrics", async (request, reply) => {
    // Loopback only: through Caddy it would publish app names and counts.
    if (forwarded(request))
      return fail(reply, 404, { code: "not_found", message: `no route GET ${pathOf(request.url)}` });
    return reply.type("text/plain; version=0.0.4; charset=utf-8").send(metrics.render(queue.snapshot()));
  });

  // ---- the apps' routes ---------------------------------------------------

  app.post("/v1/jobs", async (request, reply) => {
    const body = parse(jobRequestSchema, request.body, reply);
    if (!body) return reply;
    try {
      const view: JobView = queue.submit(callerOf(request), body);
      return reply.status(202).send(view);
    } catch (error) {
      if (error instanceof QueueFullError) {
        return fail(reply, 503, {
          code: "queue_full",
          message: `${error.limit} jobs are already waiting; try again later`,
        });
      }
      if (error instanceof QueueClosedError) {
        return fail(reply, 503, { code: "internal", message: "Wicket is restarting; try again in a moment" });
      }
      throw error;
    }
  });

  const noSuchJob = (reply: FastifyReply) =>
    fail(reply, 404, { code: "not_found", message: "no such job for this app (a restart forgets every job)" });

  app.get("/v1/jobs/:id", async (request, reply) => {
    const params = parse(jobParamsSchema, request.params, reply);
    if (!params) return reply;
    const query = parse(jobQuerySchema, request.query, reply);
    if (!query) return reply;
    const caller = callerOf(request);
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
    return view ?? noSuchJob(reply);
  });

  app.delete("/v1/jobs/:id", async (request, reply) => {
    const params = parse(jobParamsSchema, request.params, reply);
    if (!params) return reply;
    return queue.cancel(params.id, callerOf(request)) ?? noSuchJob(reply);
  });

  // ---- the queue page's routes (a session) --------------------------------

  /** The two writes refuse a browser that says it came from another site. */
  const crossSite = (request: FastifyRequest, reply: FastifyReply): boolean => {
    if (sameOrigin(request, publicOrigin)) return false;
    void fail(reply, 403, { code: "cross_site", message: "open Wicket's page from its own address" });
    return true;
  };

  app.get("/v1/queue", async (): Promise<QueueResponse> => ({ serverTime: now(), ...queue.snapshot() }));

  app.post("/v1/queue/running/cancel", async (request, reply) => {
    if (crossSite(request, reply)) return reply;
    const closed = queue.forceClose();
    if (closed) request.log.info("force closed the running job from the queue page");
    const body: ForceCloseResponse = { closed };
    return body;
  });

  app.post("/v1/queue/clear", async (request, reply) => {
    if (crossSite(request, reply)) return reply;
    const cleared = queue.clear();
    if (cleared > 0) request.log.info(`cleared ${cleared} waiting job(s) from the queue page`);
    const body: ClearResponse = { cleared };
    return body;
  });

  app.get("/v1/records", async (request, reply) => {
    const query = parse(recordsQuerySchema, request.query, reply);
    if (!query) return reply;
    const at = now();
    const body: RecordsResponse = {
      records: records.recent(Math.min(query.limit ?? DEFAULT_RECORDS, MAX_RECORDS)),
      counts: { day: records.countsSince(at - DAY_MS), week: records.countsSince(at - 7 * DAY_MS) },
    };
    return body;
  });

  await app.register(pagePlugin, { webDist: options.webDist, webBase });

  return app;
}
