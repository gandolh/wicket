import type { JobRequest, JobResult } from "@wicket/shared";
import type { Runner } from "./queue.js";

/**
 * The provider: Ollama Cloud, over Ollama's `POST /api/chat` with
 * `stream: false`. Callers never choose a model; these settings do. There is
 * no second model to fall back to: when the cloud fails, the job fails with
 * the reason and the queue moves on to the next ticket.
 *
 * What counts as a failure: no key is set, the cloud can't be reached, it
 * takes longer than its timeout, it answers anything but 2xx (a bad key is a
 * 401, a spent quota a 429), or its body isn't an answer.
 *
 * A cancel is not a failure. The job's signal and the timeout are separate:
 * when the job's signal fired, the call was cancelled (the caller's DELETE, a
 * force close, a clear, shutdown) and the abort is rethrown for the queue;
 * when only the timeout fired, the job failed.
 *
 * Text stays out of the logs: a failure is logged with the cloud's status or
 * the kind of failure, never a message or Ollama's error text.
 */

export interface CloudSettings {
  /** `https://ollama.com` in production. */
  url: string;
  model: string;
  /** `OLLAMA_API_KEY`. A secret: never log it. */
  apiKey: string;
  timeoutMs: number;
}

export interface ProviderLog {
  error(message: string): void;
}

export interface ProviderOptions {
  /** Undefined when there is no key: every job fails at once, saying so. */
  cloud: CloudSettings | undefined;
  log?: ProviderLog;
  /** For tests. */
  fetch?: typeof fetch;
}

/** Why one Ollama call failed. `detail` is for the caller only, never the log. */
export class ProviderFailure extends Error {
  constructor(
    /** For the log: a status code or a kind of failure, never text from the call. */
    readonly kind: string,
    message: string,
  ) {
    super(message);
    this.name = "ProviderFailure";
  }
}

/** How much of Ollama's own error text a caller sees. */
const DETAIL_LENGTH = 120;

function cut(text: string, length: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > length ? `${flat.slice(0, length - 3)}...` : flat;
}

/**
 * One chat call. Resolves with the answer's text, throws `ProviderFailure`,
 * or rethrows the abort when `signal` (the job's) fired.
 */
async function chat(
  endpoint: CloudSettings,
  request: JobRequest,
  signal: AbortSignal,
  doFetch: typeof fetch,
): Promise<string> {
  const timeout = AbortSignal.timeout(endpoint.timeoutMs);
  const combined = AbortSignal.any([signal, timeout]);
  const body = {
    model: endpoint.model,
    messages: request.messages,
    stream: false,
    ...(request.format !== undefined ? { format: request.format } : {}),
  };
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json",
    authorization: `Bearer ${endpoint.apiKey}`,
  };

  let status: number;
  let raw: string;
  try {
    const res = await doFetch(`${endpoint.url}/api/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: combined,
    });
    status = res.status;
    raw = await res.text();
  } catch (error) {
    if (signal.aborted) throw error;
    if (timeout.aborted) {
      throw new ProviderFailure("timeout", `took longer than ${Math.round(endpoint.timeoutMs / 1000)} s`);
    }
    throw new ProviderFailure("unreachable", "could not be reached");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = undefined;
  }
  const errorText =
    typeof parsed === "object" && parsed !== null && typeof (parsed as { error?: unknown }).error === "string"
      ? (parsed as { error: string }).error
      : undefined;
  if (status < 200 || status > 299) {
    throw new ProviderFailure(
      String(status),
      errorText ? `answered ${status}: ${cut(errorText, DETAIL_LENGTH)}` : `answered ${status}`,
    );
  }
  if (parsed === undefined) throw new ProviderFailure("bad-body", "sent a body that is not JSON");
  if (errorText) throw new ProviderFailure("error-body", `sent an error: ${cut(errorText, DETAIL_LENGTH)}`);
  const content = (parsed as { message?: { content?: unknown } }).message?.content;
  if (typeof content !== "string" || content.trim() === "") throw new ProviderFailure("empty", "sent an empty answer");
  return content.trim();
}

function reasonOf(error: unknown): { kind: string; message: string } {
  if (error instanceof ProviderFailure) return { kind: error.kind, message: error.message };
  return { kind: "unexpected", message: "failed unexpectedly" };
}

/** What a job without a key fails with. */
export const NO_KEY_ERROR = "the cloud model can't be asked: OLLAMA_API_KEY is not set";

/** The queue's runner: one call to the cloud, and the job fails if that does. */
export function createRunner(options: ProviderOptions): Runner {
  const doFetch = options.fetch ?? fetch;
  const log = options.log ?? { error: () => undefined };
  const { cloud } = options;

  return async (request, { signal, attempt }): Promise<JobResult> => {
    if (!cloud) {
      log.error("a job failed: no OLLAMA_API_KEY");
      throw new Error(NO_KEY_ERROR);
    }
    attempt(cloud.model);
    try {
      const text = await chat(cloud, request, signal, doFetch);
      return { text, model: cloud.model };
    } catch (error) {
      if (signal.aborted) throw error;
      const reason = reasonOf(error);
      log.error(`the cloud failed (${reason.kind})`);
      throw new Error(`the cloud model ${reason.message}`, { cause: error });
    }
  };
}
