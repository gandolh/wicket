import { z } from "zod";
import type { BackupSettings, CloudSettings } from "./providers.js";
import { AppTokens, TokenConfigError } from "./tokens.js";

/** The server's settings, read once at startup from the environment (and the repo's `.env`). */
export interface Config {
  host: string;
  port: number;
  /** `WICKET_DB` as given, or undefined for the repo's `data/wicket.sqlite`. */
  dbPath: string | undefined;
  /** The apps and their tokens, from `WICKET_APP_TOKENS`. Secrets: never log them. */
  appTokens: AppTokens;
  /** Ollama Cloud, or undefined when `OLLAMA_API_KEY` is unset and every job goes to the backup. */
  cloud: CloudSettings | undefined;
  backup: BackupSettings;
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
      message: `${name} must be an http or https URL, such as http://127.0.0.1:11434.`,
    })
    .transform((value) => value.replace(/\/+$/, ""));

const seconds = (name: string) =>
  z.coerce.number<string>().int().min(1).max(3600, { message: `${name} must be a whole number of seconds, 1 to 3600.` });

/**
 * Ollama's `keep_alive`: whole seconds (sent as a number, `0` unloads at
 * once) or a Go duration such as `1m` or `30s` (sent as a string).
 */
const keepAlive = z
  .string()
  .regex(/^(-?\d+|-?(\d+(\.\d+)?(ms|s|m|h))+)$/, {
    message: "WICKET_BACKUP_KEEP_ALIVE must be seconds (0 unloads at once) or a duration such as 1m.",
  })
  .transform((value): string | number => (/^-?\d+$/.test(value) ? Number(value) : value));

/** The defaults the owner settled: just-a-bot's cloud model, and the small backup. */
export const DEFAULTS = {
  cloudUrl: "https://ollama.com",
  cloudModel: "gpt-oss:120b",
  cloudTimeoutSeconds: 120,
  backupUrl: "http://127.0.0.1:11434",
  backupModel: "gemma3:1b",
  backupKeepAlive: "1m",
  backupTimeoutSeconds: 300,
} as const;

const envSchema = z.object({
  HOST: optional(z.string()).transform((value) => value ?? "127.0.0.1"),
  PORT: optional(z.coerce.number<string>().int().min(1).max(65535, { message: "PORT must be a port number (1-65535)." })).transform(
    (value) => value ?? 8808,
  ),
  WICKET_DB: optional(z.string()),
  OLLAMA_API_KEY: optional(z.string().transform((value) => value.trim())),
  WICKET_CLOUD_URL: optional(baseUrl("WICKET_CLOUD_URL")).transform((value) => value ?? DEFAULTS.cloudUrl),
  WICKET_CLOUD_MODEL: optional(z.string().trim()).transform((value) => value ?? DEFAULTS.cloudModel),
  WICKET_CLOUD_TIMEOUT_SECONDS: optional(seconds("WICKET_CLOUD_TIMEOUT_SECONDS")).transform(
    (value) => value ?? DEFAULTS.cloudTimeoutSeconds,
  ),
  WICKET_BACKUP_URL: optional(baseUrl("WICKET_BACKUP_URL")).transform((value) => value ?? DEFAULTS.backupUrl),
  WICKET_BACKUP_MODEL: optional(z.string().trim()).transform((value) => value ?? DEFAULTS.backupModel),
  WICKET_BACKUP_KEEP_ALIVE: optional(keepAlive).transform((value) => value ?? DEFAULTS.backupKeepAlive),
  WICKET_BACKUP_TIMEOUT_SECONDS: optional(seconds("WICKET_BACKUP_TIMEOUT_SECONDS")).transform(
    (value) => value ?? DEFAULTS.backupTimeoutSeconds,
  ),
});

export function describeIssue(issue: z.core.$ZodIssue): string {
  const key = String(issue.path[0] ?? "");
  return issue.message.startsWith(key) ? issue.message : `${key}: ${issue.message}`;
}

/** The settings from `env`, or a `ConfigError` naming every variable that is wrong. Messages never repeat a secret. */
export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const problems: string[] = [];
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) problems.push(...parsed.error.issues.map(describeIssue));
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
    backup: {
      url: values.WICKET_BACKUP_URL,
      model: values.WICKET_BACKUP_MODEL,
      keepAlive: values.WICKET_BACKUP_KEEP_ALIVE,
      timeoutMs: values.WICKET_BACKUP_TIMEOUT_SECONDS * 1000,
    },
  };
}
