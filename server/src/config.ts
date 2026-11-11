import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { wardClientOptionsFromEnv, type WardClientOptions } from "../vendor/ward/ward-auth.js";
import { AppTokens, TokenConfigError } from "./plugins/app-tokens/tokens.js";

/**
 * The server's settings: the one reader of the environment. The entry and the
 * seed load the repo's `.env` through `loadEnvFile()`, then parse with
 * `loadConfig()` or `loadSeedConfig()`; nothing else reads `process.env`.
 */

/** The repo root. `src/` (tsx in dev) and `dist/` (built) sit at the same depth, so this holds for both. */
const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));

/** The repo's `.env`, found from this file, never from the working directory. */
const ENV_FILE = resolve(REPO_ROOT, ".env");

/** The database when `WICKET_DB` is unset. */
const DEFAULT_DB_PATH = resolve(REPO_ROOT, "data/wicket.sqlite");

/** The built page, which the server serves at the page path when it exists. */
export const WEB_DIST = resolve(REPO_ROOT, "web/dist");

/** The API prefix as the browser and the apps see it, unless `WICKET_API_PREFIX` moves it. */
export const API_PREFIX = "/wicket-api";
/** Where the built page is served, unless `WICKET_BASE` moves it. */
const PAGE_PATH = "/wicket/";
/** The session cookie's name. Unique in the estate: every app shares one origin. */
export const SESSION_COOKIE = "wicket_session";

/** The largest job body accepted: a listing page fits with room to spare. */
export const BODY_LIMIT = 1024 * 1024;

/*
 * The process's timeouts (server.ts). A long poll (`GET /v1/jobs/:id?wait=N`)
 * holds a silent response for up to `MAX_WAIT_SECONDS` (25 s), and `connectionTimeout`
 * cuts a socket silent that long, so it sits above the longest wait with 10 s
 * of margin. `requestTimeout` bounds receiving a request, never a response.
 * `keepAliveTimeout` outlives Caddy's two-minute idle keep-alive to its
 * upstream, so Caddy never reuses a socket Wicket has just closed. The
 * shutdown delay is under compose's default 10 s stop period, so the process
 * exits before Docker kills it.
 */
export const CONNECTION_TIMEOUT_MS = 35_000;
export const REQUEST_TIMEOUT_MS = 30_000;
export const KEEP_ALIVE_TIMEOUT_MS = 125_000;
export const SHUTDOWN_DELAY_MS = 5_000;

/** Where the auth plugin's routes sit as Fastify sees them; the browser reaches them under the API prefix. */
export const AUTH_ROUTE_PREFIX = "/auth";

/** The Ward callback, under the API prefix: `WARD_OIDC_REDIRECT_URI` is the origin, the prefix, then this. */
export const WARD_CALLBACK_PATH = `${AUTH_ROUTE_PREFIX}/ward/callback`;

/** The Vite dev server, where the page runs in development. */
const DEV_ORIGIN = "http://localhost:5179";

/** Ollama Cloud, as the runner asks it. */
export interface CloudSettings {
  /** `https://ollama.com` in production. */
  url: string;
  model: string;
  /** `OLLAMA_API_KEY`. A secret: never log it. */
  apiKey: string;
  timeoutMs: number;
}

/** The server's settings, read once at startup from the environment (and the repo's `.env`). */
export interface Config {
  host: string;
  port: number;
  /** `WICKET_DB`, trimmed, or undefined for the repo's `data/wicket.sqlite`; `resolveDbPath()` makes it a file path. */
  dbPath: string | undefined;
  /** The apps and their tokens, from `WICKET_APP_TOKENS`. Secrets: never log them. */
  appTokens: AppTokens;
  /** Ollama Cloud, or undefined when `OLLAMA_API_KEY` is unset and every job fails, saying so. */
  cloud: CloudSettings | undefined;
  /** The page's own origin as the browser sees it, bare. Default is the Vite dev server. */
  publicOrigin: string;
  /** The API prefix as the browser sees it, and the session cookie's path. Default `/wicket-api`. */
  apiPrefix: string;
  /** The page's base path, with a trailing slash. Default `/wicket/`. */
  webBase: string;
  /** "Sign in with Ward", or undefined for local accounts only. `clientKey` is a secret. */
  ward: WardClientOptions | undefined;
  /** `AUTH_TRUSTED_PROXIES`: peers besides loopback whose `X-Forwarded-For` the login lockout believes. */
  trustedProxies: string[];
}

/** The environment cannot run the server. The message names every variable at fault. */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/** An empty value (`KEY=` copied from `.env.example`) counts as not set. */
export const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (typeof value === "string" && value.trim() === "" ? undefined : value), schema.optional());

/** An http(s) base URL, without a trailing slash. */
const baseUrl = (name: string) =>
  z
    .string()
    .refine((value) => URL.canParse(value) && /^https?:$/.test(new URL(value).protocol), {
      message: `${name} must be an http or https URL, such as https://ollama.com.`,
    })
    .transform((value) => value.replace(/\/+$/, ""));

const seconds = (name: string) =>
  z.coerce
    .number<string>()
    .int()
    .min(1)
    .max(3600, { message: `${name} must be a whole number of seconds, 1 to 3600.` });

/** The defaults the owner settled: just-a-bot's cloud model. */
export const DEFAULTS = {
  cloudUrl: "https://ollama.com",
  cloudModel: "gpt-oss:120b",
  cloudTimeoutSeconds: 120,
} as const;

const envSchema = z.object({
  HOST: optional(z.string()).transform((value) => value ?? "127.0.0.1"),
  PORT: optional(
    z.coerce.number<string>().int().min(1).max(65535, { message: "PORT must be a port number (1-65535)." }),
  ).transform((value) => value ?? 8808),
  WICKET_DB: optional(z.string().trim()),
  OLLAMA_API_KEY: optional(z.string().transform((value) => value.trim())),
  WICKET_CLOUD_URL: optional(baseUrl("WICKET_CLOUD_URL")).transform((value) => value ?? DEFAULTS.cloudUrl),
  WICKET_CLOUD_MODEL: optional(z.string().trim()).transform((value) => value ?? DEFAULTS.cloudModel),
  WICKET_CLOUD_TIMEOUT_SECONDS: optional(seconds("WICKET_CLOUD_TIMEOUT_SECONDS")).transform(
    (value) => value ?? DEFAULTS.cloudTimeoutSeconds,
  ),
  PUBLIC_ORIGIN: optional(
    z.string().refine((value) => URL.canParse(value) && new URL(value).origin === value, {
      message: "PUBLIC_ORIGIN must be a bare origin such as https://example.com: no path and no trailing slash.",
    }),
  ).transform((value) => value ?? DEV_ORIGIN),
  WICKET_API_PREFIX: optional(
    z.string().regex(/^\/[^\s?#]*[^/\s?#]$/, {
      message: "WICKET_API_PREFIX must be a path such as /wicket-api: a leading slash and no trailing slash.",
    }),
  ).transform((value) => value ?? API_PREFIX),
  WICKET_BASE: optional(
    z.string().regex(/^\/([^\s?#]*\/)?$/, {
      message: "WICKET_BASE must be a path such as /wicket/: a leading and a trailing slash.",
    }),
  ).transform((value) => value ?? PAGE_PATH),
});

export function describeIssue(issue: z.core.$ZodIssue): string {
  const key = String(issue.path[0] ?? "");
  return issue.message.startsWith(key) ? issue.message : `${key}: ${issue.message}`;
}

/**
 * The Ward settings, read by the library's own reader so the rules are its
 * (an empty `WARD_OIDC_ISSUER` means off; with it set, the client id, key and
 * redirect URI must be too). On top: the redirect URI must be the callback
 * under the API prefix, where the session cookie and the dev proxy are.
 * Messages never repeat the key.
 */
function wardSettings(
  env: NodeJS.ProcessEnv,
  apiPrefix: string | undefined,
  problems: string[],
): WardClientOptions | undefined {
  let ward: WardClientOptions | undefined;
  try {
    ward = wardClientOptionsFromEnv(env);
  } catch (error) {
    problems.push(
      `${error instanceof Error ? error.message : String(error)}. Set all of them, or leave WARD_OIDC_ISSUER empty for local accounts only.`,
    );
    return undefined;
  }
  if (ward === undefined || apiPrefix === undefined) return ward;
  const expected = `${apiPrefix}${WARD_CALLBACK_PATH}`;
  if (!URL.canParse(ward.redirectUri) || new URL(ward.redirectUri).pathname !== expected) {
    problems.push(
      `WARD_OIDC_REDIRECT_URI must be the callback as the browser reaches it: the page's origin, then ${expected}.`,
    );
  }
  return ward;
}

/** `AUTH_TRUSTED_PROXIES`, comma-separated, blanks dropped. The plugin checks each entry when it registers. */
function trustedProxies(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");
}

/** The settings from `env`, or a `ConfigError` naming every variable that is wrong. Messages never repeat a secret. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const problems: string[] = [];
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) problems.push(...parsed.error.issues.map(describeIssue));
  const ward = wardSettings(env, parsed.success ? parsed.data.WICKET_API_PREFIX : undefined, problems);
  let appTokens: AppTokens | undefined;
  try {
    appTokens = AppTokens.parse(env.WICKET_APP_TOKENS);
  } catch (error) {
    if (!(error instanceof TokenConfigError)) throw error;
    problems.push(error.message);
  }
  if (!parsed.success || problems.length > 0 || !appTokens) throw new ConfigError(problems.join("\n"));
  const values = parsed.data;
  return {
    host: values.HOST,
    port: values.PORT,
    dbPath: values.WICKET_DB,
    appTokens,
    cloud: values.OLLAMA_API_KEY
      ? {
          url: values.WICKET_CLOUD_URL,
          model: values.WICKET_CLOUD_MODEL,
          apiKey: values.OLLAMA_API_KEY,
          timeoutMs: values.WICKET_CLOUD_TIMEOUT_SECONDS * 1000,
        }
      : undefined,
    publicOrigin: values.PUBLIC_ORIGIN,
    apiPrefix: values.WICKET_API_PREFIX,
    webBase: values.WICKET_BASE,
    ward,
    trustedProxies: trustedProxies(env.AUTH_TRUSTED_PROXIES),
  };
}

/**
 * Reads the repo's `.env` into the environment when there is one, and returns
 * its path. A container has none: the deploy sets its environment. A variable
 * the environment already has keeps its value.
 */
export function loadEnvFile(path: string = ENV_FILE): string | undefined {
  if (!existsSync(path)) return undefined;
  process.loadEnvFile(path);
  return path;
}

/**
 * The database file: `WICKET_DB` resolved from the working directory, or the
 * repo's `data/wicket.sqlite` when it is unset. `:memory:` stays as it is, an
 * in-memory database for tests and throwaway runs. The server and the seed
 * share this rule.
 */
export function resolveDbPath(value: string | undefined): string {
  const path = value?.trim();
  if (path === undefined || path === "") return DEFAULT_DB_PATH;
  return path === ":memory:" ? path : resolve(path);
}

/** The seed's settings. A missing name or password is asked for on a terminal. */
export interface SeedConfig {
  /** `SEED_USERNAME`, trimmed, or undefined. */
  username: string | undefined;
  /** `SEED_PASSWORD` as given (spaces count), or undefined. A secret: never print it. */
  password: string | undefined;
  /** The database, by the server's rule. */
  dbPath: string;
}

export function loadSeedConfig(env: NodeJS.ProcessEnv = process.env): SeedConfig {
  const username = env.SEED_USERNAME?.trim();
  const password = env.SEED_PASSWORD;
  return {
    username: username === undefined || username === "" ? undefined : username,
    password: password === undefined || password === "" ? undefined : password,
    dbPath: resolveDbPath(env.WICKET_DB),
  };
}
