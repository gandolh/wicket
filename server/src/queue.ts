import { randomUUID } from "node:crypto";
import { FINAL_STATUSES, type JobRequest, type JobResult, type JobStatus, type JobView } from "@wicket/shared";
import type { JobRecord, Outcome } from "./records.js";

/**
 * The one queue. Every job from every app waits here, first come first
 * served, and exactly one runs at a time, whatever it runs on. It lives in
 * memory only: a restart cancels whatever waits or runs.
 *
 * Running a job means calling the runner (the cloud model) with the job's
 * messages and an abort signal. A cancel (the caller's `DELETE`, a force
 * close, a clear, shutdown) ends the job at once: the signal is aborted, the
 * job is `cancelled`, the next ticket starts, and whatever the runner does
 * after that is ignored.
 *
 * Text stays out of everything kept: the request is dropped the moment a job
 * ends, the answer is held only until the job is forgotten (`keepFinishedMs`
 * after it ends), and the record has neither.
 */

/** What a runner reports while it works, and the signal that stops it. */
export interface RunContext {
  /** Aborted when the job is cancelled. A runner must stop on it. */
  signal: AbortSignal;
  /** The runner is now asking `model`; the page shows it and the record keeps it. */
  attempt(model: string): void;
}

/** Runs one job. Throws when no model could answer; the message must never repeat the prompt. */
export type Runner = (request: JobRequest, context: RunContext) => Promise<JobResult>;

/** The waiting line is full. */
export class QueueFullError extends Error {
  constructor(readonly limit: number) {
    super(`${limit} jobs are already waiting`);
    this.name = "QueueFullError";
  }
}

/** The queue has shut down and takes no new jobs. */
export class QueueClosedError extends Error {
  constructor() {
    super("the queue is shutting down");
    this.name = "QueueClosedError";
  }
}

/** Why a job was cancelled, in the words its caller sees as `error`. */
export const CANCEL_REASONS = {
  caller: "cancelled by the caller",
  forceClose: "force closed from the queue page",
  clear: "the queue was cleared",
  shutdown: "the server restarted",
} as const;

export interface QueueOptions {
  run: Runner;
  /** Called once per job when it ends. A throw is logged and ignored. */
  record: (record: JobRecord) => void;
  /** The first ticket to hand out. */
  firstTicket?: number;
  /** How many jobs may wait at once. Default 200. */
  maxWaiting?: number;
  /** How long a finished job (and its answer) is kept for its caller. Default 10 minutes. */
  keepFinishedMs?: number;
  /** The clock, in epoch milliseconds, for tests. */
  now?: () => number;
  /** Where a failed record write is reported. */
  onError?: (message: string, error: unknown) => void;
}

/** The running job, as the queue page shows it. No text. */
export interface RunningJob {
  id: string;
  app: string;
  ticket: number;
  model: string | null;
  startedAt: number;
}

/** A waiting job, as the queue page shows it. No text. */
export interface WaitingJob {
  id: string;
  app: string;
  ticket: number;
  queuedAt: number;
}

export interface QueueSnapshot {
  nowServing: number;
  running: RunningJob | null;
  waiting: WaitingJob[];
}

interface Job {
  id: string;
  app: string;
  ticket: number;
  /** The messages, until the job ends. */
  request: JobRequest | undefined;
  status: JobStatus;
  queuedAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  model: string | null;
  result: JobResult | undefined;
  error: string | undefined;
  controller: AbortController | undefined;
}

export const DEFAULT_MAX_WAITING = 200;
export const DEFAULT_KEEP_FINISHED_MS = 10 * 60 * 1000;

/** The short message a failed job carries. The runner's own messages never hold the prompt. */
function failureMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  return text.length > 500 ? `${text.slice(0, 497)}...` : text;
}

export class Queue {
  private readonly jobs = new Map<string, Job>();
  private readonly waiting: Job[] = [];
  private running: Job | undefined;
  private nextTicket: number;
  private lastServed = 0;
  private closed = false;
  private readonly listeners = new Set<() => void>();
  private readonly run: Runner;
  private readonly record: (record: JobRecord) => void;
  private readonly maxWaiting: number;
  private readonly keepFinishedMs: number;
  private readonly now: () => number;
  private readonly onError: (message: string, error: unknown) => void;

  constructor(options: QueueOptions) {
    this.run = options.run;
    this.record = options.record;
    this.nextTicket = Math.max(1, options.firstTicket ?? 1);
    this.maxWaiting = options.maxWaiting ?? DEFAULT_MAX_WAITING;
    this.keepFinishedMs = options.keepFinishedMs ?? DEFAULT_KEEP_FINISHED_MS;
    this.now = options.now ?? Date.now;
    this.onError = options.onError ?? (() => undefined);
  }

  /** Put a job in line. Throws `QueueFullError` when the line is full. */
  submit(app: string, request: JobRequest): JobView {
    if (this.closed) throw new QueueClosedError();
    this.sweep();
    if (this.waiting.length >= this.maxWaiting) throw new QueueFullError(this.maxWaiting);
    const job: Job = {
      id: randomUUID(),
      app,
      ticket: this.nextTicket++,
      request,
      status: "queued",
      queuedAt: this.now(),
      startedAt: null,
      finishedAt: null,
      model: null,
      result: undefined,
      error: undefined,
      controller: undefined,
    };
    this.jobs.set(job.id, job);
    this.waiting.push(job);
    this.pump();
    this.changed();
    return this.view(job);
  }

  /** The job as its app sees it; undefined for an unknown id, a forgotten job or another app's. */
  get(id: string, app: string): JobView | undefined {
    this.sweep();
    const job = this.jobs.get(id);
    return job && job.app === app ? this.view(job) : undefined;
  }

  /**
   * The job once its status, position or now serving changes, or as it is
   * after `ms`. A finished job answers at once. `signal` ends the wait early
   * (the caller hung up).
   */
  waitForChange(id: string, app: string, ms: number, signal?: AbortSignal): Promise<JobView | undefined> {
    const first = this.get(id, app);
    if (!first || FINAL_STATUSES.has(first.status) || ms <= 0 || signal?.aborted) return Promise.resolve(first);
    const before = signature(first);
    return new Promise((resolve) => {
      const finish = () => {
        clearTimeout(timer);
        this.listeners.delete(check);
        signal?.removeEventListener("abort", finish);
        resolve(this.get(id, app));
      };
      const check = () => {
        const current = this.get(id, app);
        if (!current || signature(current) !== before) finish();
      };
      const timer = setTimeout(finish, ms);
      this.listeners.add(check);
      signal?.addEventListener("abort", finish, { once: true });
    });
  }

  /** The caller cancels its own job. A finished job is left as it was. */
  cancel(id: string, app: string): JobView | undefined {
    const job = this.jobs.get(id);
    if (!job || job.app !== app) return undefined;
    if (!FINAL_STATUSES.has(job.status)) this.end(job, "cancelled", CANCEL_REASONS.caller);
    return this.view(job);
  }

  /** Abort the running job. False when nothing runs. */
  forceClose(): boolean {
    const job = this.running;
    if (!job) return false;
    this.end(job, "cancelled", CANCEL_REASONS.forceClose);
    return true;
  }

  /** Drop every waiting job; the running one is left alone. How many were dropped. */
  clear(): number {
    const dropped = this.waiting.splice(0);
    for (const job of dropped) this.settle(job, "cancelled", CANCEL_REASONS.clear);
    if (dropped.length > 0) this.changed();
    return dropped.length;
  }

  /** Now serving, the running job and the waiting line, for the queue page. */
  snapshot(): QueueSnapshot {
    this.sweep();
    const running = this.running;
    return {
      nowServing: this.nowServing(),
      running: running
        ? {
            id: running.id,
            app: running.app,
            ticket: running.ticket,
            model: running.model,
            startedAt: running.startedAt ?? running.queuedAt,
          }
        : null,
      waiting: this.waiting.map((job) => ({ id: job.id, app: job.app, ticket: job.ticket, queuedAt: job.queuedAt })),
    };
  }

  /** Cancel everything and take no more jobs: the server is stopping. */
  close(): void {
    if (this.closed) return;
    this.closed = true;
    const dropped = this.waiting.splice(0);
    for (const job of dropped) this.settle(job, "cancelled", CANCEL_REASONS.shutdown);
    if (this.running) this.settle(this.running, "cancelled", CANCEL_REASONS.shutdown);
    this.changed();
  }

  private nowServing(): number {
    return this.running?.ticket ?? this.lastServed;
  }

  private view(job: Job): JobView {
    const position = job.status === "queued" ? this.waiting.indexOf(job) + 1 : 0;
    return {
      id: job.id,
      ticket: job.ticket,
      nowServing: this.nowServing(),
      position,
      status: job.status,
      ...(job.status === "done" && job.result ? { result: { ...job.result } } : {}),
      ...(job.error !== undefined && (job.status === "failed" || job.status === "cancelled") ? { error: job.error } : {}),
    };
  }

  /** Start the next job if nothing runs. */
  private pump(): void {
    if (this.running || this.closed) return;
    const job = this.waiting.shift();
    if (!job) return;
    const request = job.request!;
    const controller = new AbortController();
    job.status = "running";
    job.startedAt = this.now();
    job.controller = controller;
    this.running = job;
    this.lastServed = job.ticket;
    void this.execute(job, request, controller.signal);
  }

  private async execute(job: Job, request: JobRequest, signal: AbortSignal): Promise<void> {
    try {
      const result = await this.run(request, {
        signal,
        attempt: (model) => {
          if (job.status !== "running") return;
          job.model = model;
          this.changed();
        },
      });
      if (job.status !== "running") return;
      job.result = result;
      job.model = result.model;
      this.end(job, "done");
    } catch (error) {
      if (job.status !== "running") return;
      this.end(job, "failed", failureMessage(error));
    }
  }

  /** End a job, start the next, tell the waiters. */
  private end(job: Job, status: "done" | "failed" | "cancelled", error?: string): void {
    const at = this.waiting.indexOf(job);
    if (at !== -1) this.waiting.splice(at, 1);
    this.settle(job, status, error);
    this.pump();
    this.changed();
  }

  /** Mark a job finished, abort its request if it was running, and write its record. */
  private settle(job: Job, status: "done" | "failed" | "cancelled", error?: string): void {
    const wasRunning = this.running === job;
    job.status = status;
    job.finishedAt = this.now();
    job.error = error;
    job.request = undefined;
    if (wasRunning) {
      this.running = undefined;
      if (status === "cancelled") job.controller?.abort();
    }
    job.controller = undefined;
    const outcome: Outcome = status === "done" ? "ok" : status;
    try {
      this.record({
        app: job.app,
        ticket: job.ticket,
        model: job.model,
        outcome,
        queuedAt: job.queuedAt,
        startedAt: job.startedAt,
        finishedAt: job.finishedAt,
        waitMs: (job.startedAt ?? job.finishedAt) - job.queuedAt,
        runMs: job.startedAt === null ? null : job.finishedAt - job.startedAt,
      });
    } catch (recordError) {
      this.onError(`could not write the record for ticket ${job.ticket}`, recordError);
    }
  }

  /** Forget jobs that finished more than `keepFinishedMs` ago, answer and all. */
  private sweep(): void {
    const cutoff = this.now() - this.keepFinishedMs;
    for (const [id, job] of this.jobs) {
      if (job.finishedAt !== null && job.finishedAt <= cutoff) this.jobs.delete(id);
    }
  }

  private changed(): void {
    for (const listener of [...this.listeners]) listener();
  }
}

/** What a long-poll watches: a change in any of these wakes it. */
function signature(view: JobView): string {
  return `${view.status}|${view.position}|${view.nowServing}`;
}
