import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildApp } from "./app.js";
import { ConfigError, loadConfig, type Config } from "./config.js";
import { createRunner } from "./providers.js";

/**
 * Start Wicket: the API under `/v1`, sign-in under `/auth` and `/metrics`, on
 * 127.0.0.1:8808 by default. Locally the owner runs it with `npm start` or
 * `npm run dev`; on the VPS it is the `wicket-api` container.
 *
 * Settings come from the environment, and from the repo root's `.env` for
 * what the environment leaves unset. `config.ts` lists them and stops the
 * start with a message naming any that is wrong. The database is `WICKET_DB`,
 * or `data/wicket.sqlite` under the repo root.
 */

/** `src/` (tsx in dev) and `dist/` (built) sit at the same depth, so this resolves the same from both. */
const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));

try {
  process.loadEnvFile(`${REPO_ROOT}.env`);
} catch (err) {
  if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
}

let config: Config;
try {
  config = loadConfig(process.env);
} catch (err) {
  if (!(err instanceof ConfigError)) throw err;
  console.error(`Wicket cannot start:\n${err.message}`);
  process.exit(1);
}

const dbPath = config.dbPath ? resolve(config.dbPath) : resolve(REPO_ROOT, "data/wicket.sqlite");

const app = await buildApp({
  dbPath,
  webDist: resolve(REPO_ROOT, "web/dist"),
  run: createRunner({
    cloud: config.cloud,
    // Called only once jobs run, after `app` exists.
    log: { error: (message) => app.log.error(message) },
  }),
  appTokens: config.appTokens,
  publicOrigin: config.publicOrigin,
  apiPrefix: config.apiPrefix,
  webBase: config.webBase,
  ward: config.ward,
  trustedProxies: config.trustedProxies,
  logger: true,
});
app.log.info(`database: ${dbPath}`);
const apps = config.appTokens.apps;
app.log.info(apps.length > 0 ? `apps: ${apps.join(", ")}` : "no WICKET_APP_TOKENS: every job call is refused");
app.log.info(
  config.cloud
    ? `cloud: ${config.cloud.model} at ${config.cloud.url}`
    : "no OLLAMA_API_KEY: every job fails until it is set",
);
app.log.info(config.ward ? "Sign in with Ward is on" : "WARD_OIDC_ISSUER is not set: local accounts only, no Sign in with Ward");

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    app.close().then(
      () => process.exit(0),
      (err: unknown) => {
        app.log.error({ err }, `shutdown on ${signal} failed`);
        process.exit(1);
      },
    );
  });
}

try {
  await app.listen({ host: config.host, port: config.port });
} catch (err) {
  app.log.error({ err }, `Wicket cannot listen on ${config.host}:${config.port}`);
  process.exit(1);
}
