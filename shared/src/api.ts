import { z } from "zod";

/**
 * The API contract as zod schemas. The server validates with them and the
 * page parses with them, so the two cannot drift. The words follow the
 * corpus glossary: a job, its ticket, now serving, its position.
 */

/** The roles a chat message may have, as Ollama's chat API takes them. */
export const MESSAGE_ROLES = ["system", "user", "assistant"] as const;

export const messageSchema = z
  .object({
    role: z.enum(MESSAGE_ROLES),
    content: z.string(),
  })
  .strict();
export type Message = z.infer<typeof messageSchema>;

/** `"json"` for any JSON, or a JSON schema for structured output. Passed to Ollama as it is. */
export const formatSchema = z.union([z.literal("json"), z.record(z.string(), z.unknown())]);
export type Format = z.infer<typeof formatSchema>;

/**
 * `POST /v1/jobs`. Strict: an unknown field (a `model`, a `stream`) is a 400,
 * because callers never choose a model and a silent ignore would hide that.
 */
export const jobRequestSchema = z
  .object({
    messages: z.array(messageSchema).min(1, { message: "send at least one message" }),
    format: formatSchema.optional(),
  })
  .strict();
export type JobRequest = z.infer<typeof jobRequestSchema>;

/** A live job's status. `done`, `failed` and `cancelled` are final. */
export const JOB_STATUSES = ["queued", "running", "done", "failed", "cancelled"] as const;
export const jobStatusSchema = z.enum(JOB_STATUSES);
export type JobStatus = z.infer<typeof jobStatusSchema>;

export const FINAL_STATUSES: ReadonlySet<JobStatus> = new Set(["done", "failed", "cancelled"]);

/** Where a job ran. */
export const PROVIDERS = ["cloud", "backup"] as const;
export const providerSchema = z.enum(PROVIDERS);
export type Provider = z.infer<typeof providerSchema>;

/** The answer, on a `done` job only. `backup` is true when the backup model answered. */
export const resultSchema = z.object({
  text: z.string(),
  model: z.string(),
  backup: z.boolean(),
});
export type JobResult = z.infer<typeof resultSchema>;

/** What a caller sees of its job, from `POST`, `GET` and `DELETE`. */
export const jobViewSchema = z.object({
  id: z.string(),
  ticket: z.number().int().positive(),
  /** The running ticket, or the last that ran when idle; 0 before the first. */
  nowServing: z.number().int().nonnegative(),
  /** The place in the waiting line, 1 runs next; 0 once running or finished. */
  position: z.number().int().nonnegative(),
  status: jobStatusSchema,
  result: resultSchema.optional(),
  error: z.string().optional(),
});
export type JobView = z.infer<typeof jobViewSchema>;

export const jobParamsSchema = z.object({ id: z.string().min(1).max(100) });

/** The longest a `GET` long-polls, in seconds. A larger `wait` is held to this. */
export const MAX_WAIT_SECONDS = 25;

export const jobQuerySchema = z.object({
  wait: z.coerce
    .number<string>()
    .min(0, { message: "wait is a number of seconds, 0 to 25" })
    .transform((value) => Math.min(value, MAX_WAIT_SECONDS))
    .optional(),
});

/** The error codes the API answers with. */
export const ERROR_CODES = ["invalid_request", "unauthorized", "not_found", "queue_full", "cross_site", "internal"] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export const errorBodySchema = z.object({
  code: z.string(),
  message: z.string(),
});
export type ErrorBody = { code: ErrorCode; message: string };

export const healthResponseSchema = z.object({ ok: z.literal(true) });
export type HealthResponse = z.infer<typeof healthResponseSchema>;
