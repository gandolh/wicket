import { serializerCompiler, validatorCompiler } from "@fastify/type-provider-zod";
import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import type { Accounts } from "../vendor/ward/ward-auth.js";
import { BODY_LIMIT, resolveDbPath, type Config } from "./config.js";
import { openDatabase } from "./db/open.js";
import { healthRoutes } from "./features/health/index.js";
import { jobRoutes } from "./features/jobs/index.js";
import { Metrics, metricsRoutes } from "./features/metrics/index.js";
import { createRunner, Queue, queueRoutes, type Runner } from "./features/queue/index.js";
import { recordRoutes, Records } from "./features/records/index.js";
import { stripApiPrefix } from "./lib/paths.js";
import { appTokensPlugin } from "./plugins/app-tokens/index.js";
import { openAccounts } from "./plugins/auth/accounts.js";
import { authPlugin } from "./plugins/auth/index.js";
import { errors } from "./plugins/errors.js";
import { pagePlugin } from "./plugins/page.js";

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

/** Fastify's options that belong to the process: server.ts sets them, and a test leaves them out. */
type ServerOptions = Pick<
  FastifyServerOptions,
  "logger" | "trustProxy" | "connectionTimeout" | "requestTimeout" | "keepAliveTimeout"
>;

/**
 * What the features are handed: built once here, and passed whole to each
 * feature as its plugin options. Each feature names the part it uses in its
 * own options type, so none imports this file.
 */
interface FeatureContext {
  queue: Queue;
  records: Records;
  metrics: Metrics;
  /** The clock, in epoch milliseconds. */
  now: () => number;
  /** The page's origin as the browser sees it. */
  publicOrigin: string;
}

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

/**
 * The app, ready and not listening: server.ts listens, and tests drive it with
 * `inject()`. It registers in a fixed order: the zod compilers, the error
 * handler, the session guard and sign-in, the token guard, the features, then
 * the page and the 404 handler. Closing it cancels the queue and closes the
 * database.
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
  // Zod checks each request and encodes each reply, in every plugin registered below, for the
  // routes that declare a schema.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

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
  // Closing: first cancel and record whatever waits or runs, before Fastify waits for the requests in flight,
  // so a held long poll answers `cancelled` at once instead of holding the close for up to 25 s. Then, once
  // every request has finished, close the file.
  app.addHook("preClose", async () => {
    queue.close();
  });
  app.addHook("onClose", async () => {
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

  const context: FeatureContext = { queue, records, metrics, now, publicOrigin };
  await app.register(healthRoutes, context);
  await app.register(metricsRoutes, context);
  await app.register(jobRoutes, context);
  await app.register(queueRoutes, context);
  await app.register(recordRoutes, context);

  await app.register(pagePlugin, { webDist: options.webDist, webBase });

  return app;
}
