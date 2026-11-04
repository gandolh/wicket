import type { JobRequest, JobResult } from "@wicket/shared";
import type { Runner } from "./queue.js";

/**
 * Test helpers: a runner the test drives by hand. Each call waits until the
 * test answers or fails it, and keeps the signal it was given, so a test can
 * see that a cancel aborted the request. Not imported by the server.
 */
export interface StubCall {
  request: JobRequest;
  signal: AbortSignal;
  answer(result?: Partial<JobResult>): void;
  fail(message: string): void;
}

export function stubRunner(): { run: Runner; calls: StubCall[] } {
  const calls: StubCall[] = [];
  const run: Runner = (request, context) =>
    new Promise<JobResult>((resolve, reject) => {
      context.attempt("stub-model");
      calls.push({
        request,
        signal: context.signal,
        answer: (result) => resolve({ text: "an answer", model: "stub-model", ...result }),
        fail: (message) => reject(new Error(message)),
      });
    });
  return { run, calls };
}

/** Let pending promise callbacks run. */
export function settle(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}
