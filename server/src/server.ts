import closeWithGrace from "close-with-grace";
import { buildApp } from "./app.js";
import {
  CONNECTION_TIMEOUT_MS,
  ConfigError,
  KEEP_ALIVE_TIMEOUT_MS,
  loadConfig,
  loadEnvFile,
  REQUEST_TIMEOUT_MS,
  resolveDbPath,
  SHUTDOWN_DELAY_MS,
  WEB_DIST,
  type Config,
} from "./config.js";

/**
 * Start Wicket: the API under `/v1`, sign-in under `/auth` and `/metrics`, on
 * 127.0.0.1:8808 by default. Locally the owner runs it with `npm start` or
 * `npm run dev`; on the VPS it is the `wicket-api` container. Nothing else in
 * the server listens.
 *
 * Settings come from the environment, and from the repo root's `.env` for
 * what the environment leaves unset. `config.ts` lists them and stops the
 * start with a message naming any that is wrong. The database is `WICKET_DB`,
 * or `data/wicket.sqlite` under the repo root.
 */

const envFile = loadEnvFile();

let config: Config;
try {
  config = loadConfig();
} catch (err) {
  if (!(err instanceof ConfigError)) throw err;
  console.error(`Wicket cannot start:\n${err.message}`);
  process.exit(1);
}

const app = await buildApp(config, {
  webDist: WEB_DIST,
  server: {
    logger: true,
    // Loopback, plus the proxies the sign-in lockout already trusts. Wicket reads no `request.ip`
    // itself, so this changes only the address in the request log.
    trustProxy: ["loopback", ...config.trustedProxies],
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    requestTimeout: REQUEST_TIMEOUT_MS,
    keepAliveTimeout: KEEP_ALIVE_TIMEOUT_MS,
  },
});
app.log.info(envFile === undefined ? "no .env: settings from the environment" : `settings from ${envFile}`);
app.log.info(`database: ${resolveDbPath(config.dbPath)}`);
const apps = config.appTokens.apps;
app.log.info(apps.length > 0 ? `apps: ${apps.join(", ")}` : "no WICKET_APP_TOKENS: every job call is refused");
app.log.info(
  config.cloud
    ? `cloud: ${config.cloud.model} at ${config.cloud.url}`
    : "no OLLAMA_API_KEY: every job fails until it is set",
);
app.log.info(
  config.ward ? "Sign in with Ward is on" : "WARD_OIDC_ISSUER is not set: local accounts only, no Sign in with Ward",
);

// SIGINT, SIGTERM, an uncaught error: stop taking requests, cancel and record whatever waits or runs, close the
// database (the app's onClose hooks), and exit. After the delay it exits anyway. An uncaught error is logged by
// its name and code only: its message could carry text from a call.
closeWithGrace({ delay: SHUTDOWN_DELAY_MS, logger: app.log }, async ({ signal, err }) => {
  if (err)
    app.log.error(
      { err: { name: err.name, code: (err as NodeJS.ErrnoException).code } },
      "closing on an uncaught error",
    );
  else app.log.info(`closing on ${signal ?? "exit"}`);
  await app.close();
});

try {
  await app.listen({ host: config.host, port: config.port });
} catch (err) {
  app.log.error({ err }, `Wicket cannot listen on ${config.host}:${config.port}`);
  process.exit(1);
}
