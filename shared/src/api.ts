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

/** The answer, on a `done` job only: its text and the cloud model that wrote it. */
export const resultSchema = z.object({
  text: z.string(),
  model: z.string(),
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
export const ERROR_CODES = [
  "invalid_request",
  "unauthorized",
  "not_found",
  "queue_full",
  "cross_site",
  "internal",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export const errorBodySchema = z.object({
  code: z.string(),
  message: z.string(),
});
export type ErrorBody = { code: ErrorCode; message: string };

export const healthResponseSchema = z.object({ ok: z.literal(true) });
export type HealthResponse = z.infer<typeof healthResponseSchema>;

/*
 * The admin routes, for the queue page. A signed-in session only, never an
 * app token. Times are epoch milliseconds; `serverTime` lets the page tick an
 * elapsed time without trusting the browser's clock.
 */

export const runningJobSchema = z.object({
  id: z.string(),
  app: z.string(),
  ticket: z.number().int().positive(),
  /** Null for the instant before the runner names the model it asks. */
  model: z.string().nullable(),
  startedAt: z.number(),
});
export type RunningJob = z.infer<typeof runningJobSchema>;

export const waitingJobSchema = z.object({
  id: z.string(),
  app: z.string(),
  ticket: z.number().int().positive(),
  queuedAt: z.number(),
});
export type WaitingJob = z.infer<typeof waitingJobSchema>;

/** `GET /v1/queue`. */
export const queueResponseSchema = z.object({
  serverTime: z.number(),
  nowServing: z.number().int().nonnegative(),
  running: runningJobSchema.nullable(),
  waiting: z.array(waitingJobSchema),
});
export type QueueResponse = z.infer<typeof queueResponseSchema>;

/** `POST /v1/queue/running/cancel`: false when nothing ran. */
export const forceCloseResponseSchema = z.object({ closed: z.boolean() });
export type ForceCloseResponse = z.infer<typeof forceCloseResponseSchema>;

/** `POST /v1/queue/clear`: how many waiting jobs were dropped. */
export const clearResponseSchema = z.object({ cleared: z.number().int().nonnegative() });
export type ClearResponse = z.infer<typeof clearResponseSchema>;

export const OUTCOMES = ["ok", "failed", "cancelled"] as const;
export const outcomeSchema = z.enum(OUTCOMES);
export type Outcome = z.infer<typeof outcomeSchema>;

/** One finished job as kept: names and numbers, never text. */
export const recordSchema = z.object({
  id: z.number().int(),
  app: z.string(),
  ticket: z.number().int(),
  model: z.string().nullable(),
  outcome: outcomeSchema,
  queuedAt: z.number(),
  startedAt: z.number().nullable(),
  finishedAt: z.number(),
  waitMs: z.number(),
  runMs: z.number().nullable(),
});
export type RecordView = z.infer<typeof recordSchema>;

/** Per app, over a window: how many calls, and how they ended. */
export const appCountsSchema = z.object({
  app: z.string(),
  total: z.number().int(),
  ok: z.number().int(),
  failed: z.number().int(),
  cancelled: z.number().int(),
});
export type AppCounts = z.infer<typeof appCountsSchema>;

/** The most records `GET /v1/records` answers with. */
export const MAX_RECORDS = 200;

export const recordsQuerySchema = z.object({
  limit: z.coerce.number<string>().int().min(1).max(MAX_RECORDS).optional(),
});

/** `GET /v1/records`. */
export const recordsResponseSchema = z.object({
  records: z.array(recordSchema),
  counts: z.object({
    day: z.array(appCountsSchema),
    week: z.array(appCountsSchema),
  }),
});
export type RecordsResponse = z.infer<typeof recordsResponseSchema>;
