import {
  jobParamsSchema,
  jobQuerySchema,
  jobRequestSchema,
  MAX_RECORDS,
  recordsQuerySchema,
  type ClearResponse,
  type ErrorBody,
  type ForceCloseResponse,
  type HealthResponse,
  type JobView,
  type QueueResponse,
  type RecordsResponse,
} from "@wicket/shared";
import { existsSync } from "node:fs";
import fastifyStatic from "@fastify/static";
import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
  type FastifyServerOptions,
} from "fastify";
import type { z } from "zod";
import { createWardClient, wardAuth, type Accounts, type WardClientOptions } from "../vendor/ward/ward-auth.js";
import { openAccounts, USER_ROLE } from "./accounts.js";
import { AUTH_ROUTE_PREFIX, DEV_ORIGIN } from "./config.js";
import { openDatabase } from "./db.js";
import { Metrics } from "./metrics.js";
import { Queue, QueueClosedError, QueueFullError, type Runner } from "./queue.js";
import { Records } from "./records.js";
import { AppTokens } from "./tokens.js";

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

/** The API prefix as the browser and the apps see it, unless `WICKET_API_PREFIX` moves it. */
export const API_PREFIX = "/wicket-api";
/** Where the built page is served, unless `WICKET_BASE` moves it. */
export const PAGE_PATH = "/wicket/";
/** The session cookie's name. Unique in the estate: every app shares one origin. */
export const SESSION_COOKIE = "wicket_session";

/** The largest job body accepted: a listing page fits with room to spare. */
export const BODY_LIMIT = 1024 * 1024;

/** How many records the page gets when it doesn't say. */
const DEFAULT_RECORDS = 50;

const DAY_MS = 24 * 60 * 60 * 1000;

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
  /** Runs one job: the cloud model. */
  run: Runner;
  /** The built page, served at `webBase`; skipped when the directory does not exist. */
  webDist?: string;
  /** The apps and their tokens. Default: none, so every job call is refused. */
  appTokens?: AppTokens;
  /** The page's origin as the browser sees it. Default `http://localhost:5179`, the Vite dev server. */
  publicOrigin?: string;
  /** The API prefix as the browser sees it, and the session cookie's path. Default `/wicket-api`. */
  apiPrefix?: string;
  /** The page's base path, with a trailing slash. Default `/wicket/`. */
  webBase?: string;
  /** "Sign in with Ward". Unset, local accounts only. */
  ward?: WardClientOptions;
  /** Peers besides loopback whose `X-Forwarded-For` the login lockout believes. Default none. */
  trustedProxies?: readonly string[];
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
    /** The one queue, for the tests. */
    queue: Queue;
    /** The records, for the tests. */
    records: Records;
    /** The local accounts, for the seed's tests. */
    accounts: Accounts;
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
  const query = url.indexOf("?");
  return query === -1 ? url : url.slice(0, query);
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

/**
 * Whether a browser said the request came from this origin. Absent headers
 * pass (a script or curl sends neither); a browser that sent them and named
 * another site does not. On top of the cookie's `SameSite=Lax`, for the two
 * admin writes.
 */
export function sameOrigin(request: FastifyRequest, publicOrigin: string): boolean {
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
/**
 * The app whose token a job route's request carried. The token hook answers 401 before a job route
 * runs without one, so a request without an app here is a bug.
 */
function callerOf(request: FastifyRequest): string {
  if (request.wicketApp === undefined) throw new Error("a job route ran without an app token");
  return request.wicketApp;
}

function forwarded(request: FastifyRequest): boolean {
  return request.headers["x-forwarded-for"] !== undefined || request.headers.forwarded !== undefined;
}

const UNAUTHORIZED_TOKEN = "send your app's token as Authorization: Bearer <token>";
const UNAUTHORIZED_SESSION = "sign in to Wicket's page; app tokens don't open the admin routes";

export async function buildApp(options: AppOptions): Promise<FastifyInstance> {
  const db = openDatabase(options.dbPath);
  const records = new Records(db);
  const metrics = new Metrics();
  const appTokens = options.appTokens ?? AppTokens.parse(undefined);
  const apiPrefix = options.apiPrefix ?? API_PREFIX;
  const webBase = options.webBase ?? PAGE_PATH;
  const publicOrigin = options.publicOrigin ?? DEV_ORIGIN;
  const now = options.now ?? Date.now;
  const app = Fastify({
    logger: options.logger ?? false,
    bodyLimit: BODY_LIMIT,
    rewriteUrl: (request) => stripApiPrefix(request.url ?? "/", apiPrefix),
  });

  const queue = new Queue({
    run: options.run,
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

  // The session guard, first, so every route after it is behind it.
  const accounts = openAccounts(db);
  app.decorate("accounts", accounts);
  // Checks the settings and imports the key now; talks to Ward only on first use, so Wicket starts while Ward is down.
  const ward = options.ward && (await createWardClient(options.ward));
  await app.register(wardAuth, {
    accounts,
    cookieName: SESSION_COOKIE,
    // The API prefix as the browser sees it: every request that needs the session is under it.
    cookiePath: apiPrefix,
    publicOrigin,
    routePrefix: AUTH_ROUTE_PREFIX,
    publicRoutes: ["GET /v1/health", "GET /metrics"],
    // The page offers no rename, and the seed matches accounts by name.
    allowRename: false,
    isPublic: (request) => {
      const path = pathOf(request.url);
      // The apps' routes: their token decides (the hook below), never a session.
      if (isUnder(path, "/v1/jobs")) return true;
      // Every other API route needs a session; the plugin's own list decides under /auth.
      if (isUnder(path, "/v1") || isUnder(path, AUTH_ROUTE_PREFIX)) return false;
      // The page's files, the redirect to them, /metrics and a 404: the login page has to load.
      return true;
    },
    trustedProxies: options.trustedProxies ?? [],
    ...(ward && {
      ward: {
        client: ward,
        loginPath: `${webBase}login`,
        settingsPath: `${webBase}account`,
        afterSignInPath: webBase,
        roleFor: () => USER_ROLE,
      },
    }),
  });

  // The guard answers `{ error: "unauthorized" }`; under `/v1` the contract's
  // error shape is `{ code, message }`. The sign-in routes keep the plugin's
  // shape for its hooks.
  app.addHook("onSend", async (request, reply, payload) => {
    if (reply.statusCode !== 401 || typeof payload !== "string" || !isUnder(pathOf(request.url), "/v1")) return payload;
    let body: unknown;
    try {
      body = JSON.parse(payload);
    } catch {
      return payload;
    }
    if (typeof body !== "object" || body === null || !("error" in body) || "code" in body) return payload;
    const refused: ErrorBody = { code: "unauthorized", message: UNAUTHORIZED_SESSION };
    return JSON.stringify(refused);
  });

  // The apps' routes: a token, or 401. The token names the app.
  app.addHook("onRequest", async (request, reply) => {
    if (!isUnder(pathOf(request.url), "/v1/jobs")) return;
    const name = appTokens.appFor(request.headers.authorization);
    if (name === undefined) return fail(reply, 401, { code: "unauthorized", message: UNAUTHORIZED_TOKEN });
    request.wicketApp = name;
  });

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

  // The built page at `webBase`; any other path under it is the page too (index.html).
  const webDist = options.webDist;
  const serving = webDist !== undefined && existsSync(webDist);
  if (serving) await app.register(fastifyStatic, { root: webDist, prefix: webBase });
  if (webBase !== "/") app.get("/", async (_request, reply) => reply.redirect(webBase));
  app.setNotFoundHandler((request, reply) => {
    const path = pathOf(request.url);
    if (serving && request.method === "GET" && webBase !== "/" && path === webBase.slice(0, -1))
      return reply.redirect(webBase);
    if (serving && (request.method === "GET" || request.method === "HEAD") && path.startsWith(webBase)) {
      return reply.sendFile("index.html");
    }
    return fail(reply, 404, { code: "not_found", message: `no route ${request.method} ${path}` });
  });

  return app;
}
