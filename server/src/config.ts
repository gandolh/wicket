import { z } from "zod";
import { AppTokens, TokenConfigError } from "./tokens.js";

/** The server's settings, read once at startup from the environment (and the repo's `.env`). */
export interface Config {
  host: string;
  port: number;
  /** `WICKET_DB` as given, or undefined for the repo's `data/wicket.sqlite`. */
  dbPath: string | undefined;
  /** The apps and their tokens, from `WICKET_APP_TOKENS`. Secrets: never log them. */
  appTokens: AppTokens;
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

const envSchema = z.object({
  HOST: optional(z.string()).transform((value) => value ?? "127.0.0.1"),
  PORT: optional(z.coerce.number<string>().int().min(1).max(65535, { message: "PORT must be a port number (1-65535)." })).transform(
    (value) => value ?? 8808,
  ),
  WICKET_DB: optional(z.string()),
});

export function describeIssue(issue: z.core.$ZodIssue): string {
  const key = String(issue.path[0] ?? "");
  return issue.message.startsWith(key) ? issue.message : `${key}: ${issue.message}`;
}

/** The settings from `env`, or a `ConfigError` naming every variable that is wrong. */
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
  return {
    host: parsed.data.HOST,
    port: parsed.data.PORT,
    dbPath: parsed.data.WICKET_DB,
    appTokens,
  };
}
