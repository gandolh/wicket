import {
  clearResponseSchema,
  forceCloseResponseSchema,
  queueResponseSchema,
  recordsResponseSchema,
  type ClearResponse,
  type ForceCloseResponse,
  type QueueResponse,
  type RecordsResponse,
} from "@wicket/shared";
import { API_BASE } from "./base";

/**
 * The page's four requests: the queue and the records (read every few
 * seconds), and the two buttons. Answers are parsed with the shared contract,
 * so a server that drifted shows as an error, not as a half-drawn page.
 *
 * A 401 means the session is over (or never was): the listeners hear of it
 * (`auth.ts` asks the server again, and the gate shows the login page), and
 * the request rejects with `Unauthorized`, which the polling does not count
 * as the API being down.
 */

/** The request was refused for want of a session. */
export class Unauthorized extends Error {
  override readonly name = "Unauthorized";
}

const unauthorizedListeners = new Set<() => void>();

/** Hear of every 401. Returns a function that stops listening. */
export function onUnauthorized(listener: () => void): () => void {
  unauthorizedListeners.add(listener);
  return () => {
    unauthorizedListeners.delete(listener);
  };
}

async function request<T>(method: "GET" | "POST", path: string, parse: (value: unknown) => T, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { method, headers: { accept: "application/json" }, signal });
  if (res.status === 401) {
    for (const listener of unauthorizedListeners) listener();
    throw new Unauthorized(`${path} needs a session`);
  }
  if (!res.ok) throw new Error(`${path} answered ${res.status}`);
  return parse(await res.json());
}

export function fetchQueue(signal?: AbortSignal): Promise<QueueResponse> {
  return request("GET", "/v1/queue", (v) => queueResponseSchema.parse(v), signal);
}

export function fetchRecords(signal?: AbortSignal): Promise<RecordsResponse> {
  return request("GET", "/v1/records?limit=50", (v) => recordsResponseSchema.parse(v), signal);
}

/** Force close: abort the running call. `closed` is false when nothing was running. */
export function forceClose(): Promise<ForceCloseResponse> {
  return request("POST", "/v1/queue/running/cancel", (v) => forceCloseResponseSchema.parse(v));
}

/** Clear queue: drop every waiting ticket. */
export function clearQueue(): Promise<ClearResponse> {
  return request("POST", "/v1/queue/clear", (v) => clearResponseSchema.parse(v));
}
