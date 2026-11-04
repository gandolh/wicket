import type { QueueSnapshot } from "./queue.js";
import type { JobRecord } from "./records.js";

/**
 * Prometheus text for the box's Grafana, written by hand: a handful of
 * series doesn't need a client library. Counters run from the server's start,
 * as Prometheus expects; the records table keeps the history.
 *
 * - `wicket_queue_waiting`, `wicket_queue_running`: the queue now.
 * - `wicket_jobs_total{app,outcome}`: finished jobs.
 * - `wicket_job_wait_seconds`, `wicket_job_run_seconds` (`_sum`, `_count`):
 *   average waits and runs over any range. A job cancelled before it ran
 *   counts in the waits only.
 *
 * Labels hold app names and outcomes, never text from a call.
 */

interface Totals {
  sum: number;
  count: number;
}

function escape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

function labels(values: Record<string, string>): string {
  return `{${Object.entries(values)
    .map(([key, value]) => `${key}="${escape(value)}"`)
    .join(",")}}`;
}

export class Metrics {
  private readonly jobs = new Map<string, { app: string; outcome: string; count: number }>();
  private readonly waits: Totals = { sum: 0, count: 0 };
  private readonly runs: Totals = { sum: 0, count: 0 };

  /** Count one finished job. */
  observe(record: JobRecord): void {
    const key = `${record.app}\u0000${record.outcome}`;
    const entry = this.jobs.get(key) ?? { app: record.app, outcome: record.outcome, count: 0 };
    entry.count += 1;
    this.jobs.set(key, entry);
    add(this.waits, record.waitMs / 1000);
    if (record.runMs !== null) add(this.runs, record.runMs / 1000);
  }

  /** The exposition text, with the queue as it is now. */
  render(queue: QueueSnapshot): string {
    const lines: string[] = [
      "# HELP wicket_queue_waiting Jobs waiting in the queue.",
      "# TYPE wicket_queue_waiting gauge",
      `wicket_queue_waiting ${queue.waiting.length}`,
      "# HELP wicket_queue_running Whether a job is running: 1 or 0.",
      "# TYPE wicket_queue_running gauge",
      `wicket_queue_running ${queue.running ? 1 : 0}`,
      "# HELP wicket_jobs_total Jobs finished since the server started, by app and outcome.",
      "# TYPE wicket_jobs_total counter",
    ];
    for (const entry of [...this.jobs.values()].sort((a, b) => (a.app + a.outcome).localeCompare(b.app + b.outcome))) {
      lines.push(`wicket_jobs_total${labels({ app: entry.app, outcome: entry.outcome })} ${entry.count}`);
    }
    summary(lines, "wicket_job_wait_seconds", "Seconds jobs waited in the queue.", this.waits);
    summary(lines, "wicket_job_run_seconds", "Seconds jobs ran.", this.runs);
    return `${lines.join("\n")}\n`;
  }
}

function add(totals: Totals, seconds: number): void {
  totals.sum += seconds;
  totals.count += 1;
}

function summary(lines: string[], name: string, help: string, totals: Totals): void {
  lines.push(`# HELP ${name} ${help}`, `# TYPE ${name} summary`, `${name}_sum ${totals.sum}`, `${name}_count ${totals.count}`);
}
