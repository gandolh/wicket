import type { JobRequest, JobResult } from "@wicket/shared";
import type { Runner } from "./queue.js";

/**
 * The providers: Ollama Cloud first, the backup Ollama when the cloud fails.
 * Both speak Ollama's `POST /api/chat` with `stream: false`. Callers never
 * choose a model; these settings do.
 *
 * What counts as a cloud failure: it can't be reached, it takes longer than
 * its timeout, it answers anything but 2xx (401 and 429 included: a bad key
 * or a spent quota is exactly when the backup is wanted), or its body isn't
 * an answer. Any of those sends the same job to the backup.
 *
 * A cancel never falls back. The job's signal and the timeout are separate:
 * when the job's signal fired, the call was cancelled (the caller's DELETE, a
 * force close, a clear, shutdown) and the runner stops; when only the timeout
 * fired, it is a failure like any other.
 *
 * Text stays out of the logs: a fallback is logged with the cloud's status or
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

export interface BackupSettings {
  /** The backup Ollama, `http://wicket-ollama:11434` in the container. */
  url: string;
  model: string;
  /** Ollama's `keep_alive`: a duration string such as `1m`, or seconds as a number (`0` unloads at once). */
  keepAlive: string | number;
  timeoutMs: number;
}

export interface ProviderLog {
  warn(message: string): void;
  error(message: string): void;
}

export interface ProviderOptions {
  /** Undefined when there is no key: every job goes to the backup. */
  cloud: CloudSettings | undefined;
  backup: BackupSettings;
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

interface Endpoint {
  url: string;
  model: string;
  apiKey?: string;
  keepAlive?: string | number;
  timeoutMs: number;
}

/**
 * One chat call. Resolves with the answer's text, throws `ProviderFailure`,
 * or rethrows the abort when `signal` (the job's) fired.
 */
async function chat(endpoint: Endpoint, request: JobRequest, signal: AbortSignal, doFetch: typeof fetch): Promise<string> {
  const timeout = AbortSignal.timeout(endpoint.timeoutMs);
  const combined = AbortSignal.any([signal, timeout]);
  const body = {
    model: endpoint.model,
    messages: request.messages,
    stream: false,
    ...(request.format !== undefined ? { format: request.format } : {}),
    ...(endpoint.keepAlive !== undefined ? { keep_alive: endpoint.keepAlive } : {}),
  };
  const headers: Record<string, string> = { "content-type": "application/json", accept: "application/json" };
  if (endpoint.apiKey) headers.authorization = `Bearer ${endpoint.apiKey}`;

  let status: number;
  let raw: string;
  try {
    const res = await doFetch(`${endpoint.url}/api/chat`, { method: "POST", headers, body: JSON.stringify(body), signal: combined });
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
    throw new ProviderFailure(String(status), errorText ? `answered ${status}: ${cut(errorText, DETAIL_LENGTH)}` : `answered ${status}`);
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

/** The queue's runner: the cloud, then the backup. */
export function createRunner(options: ProviderOptions): Runner {
  const doFetch = options.fetch ?? fetch;
  const log = options.log ?? { warn: () => undefined, error: () => undefined };
  const { cloud, backup } = options;

  return async (request, { signal, attempt }): Promise<JobResult> => {
    let cloudReason: string | undefined;
    if (cloud) {
      attempt("cloud", cloud.model);
      try {
        const text = await chat(cloud, request, signal, doFetch);
        return { text, model: cloud.model, backup: false };
      } catch (error) {
        if (signal.aborted) throw error;
        const reason = reasonOf(error);
        cloudReason = reason.message;
        log.warn(`the cloud failed (${reason.kind}); asking the backup`);
      }
    }

    attempt("backup", backup.model);
    try {
      const text = await chat(backup, request, signal, doFetch);
      return { text, model: backup.model, backup: true };
    } catch (error) {
      if (signal.aborted) throw error;
      const reason = reasonOf(error);
      log.error(`the backup failed (${reason.kind})`);
      throw new Error(
        cloudReason === undefined
          ? `the backup model ${reason.message}`
          : `the cloud model ${cloudReason}, and the backup model ${reason.message}`,
        { cause: error },
      );
    }
  };
}
