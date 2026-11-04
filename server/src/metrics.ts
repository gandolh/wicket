import type { QueueSnapshot } from "./queue.js";
import type { JobRecord } from "./records.js";

/**
 * Prometheus text for the box's Grafana, written by hand: a handful of
 * series doesn't need a client library. Counters run from the server's start,
 * as Prometheus expects; the records table keeps the history.
 *
 * - `wicket_queue_waiting`, `wicket_queue_running`: the queue now.
 * - `wicket_jobs_total{app,outcome,provider}`: finished jobs. `provider` is
 *   `none` for a job cancelled before it ran.
 * - `wicket_job_wait_seconds`, `wicket_job_run_seconds` (`_sum`, `_count`)
 *   by provider: average waits and runs over any range.
 *
 * Labels hold app names, outcomes and providers, never text from a call.
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
  private readonly jobs = new Map<string, { app: string; outcome: string; provider: string; count: number }>();
  private readonly waits = new Map<string, Totals>();
  private readonly runs = new Map<string, Totals>();

  /** Count one finished job. */
  observe(record: JobRecord): void {
    const provider = record.provider ?? "none";
    const key = `${record.app}\u0000${record.outcome}\u0000${provider}`;
    const entry = this.jobs.get(key) ?? { app: record.app, outcome: record.outcome, provider, count: 0 };
    entry.count += 1;
    this.jobs.set(key, entry);
    add(this.waits, provider, record.waitMs / 1000);
    if (record.runMs !== null) add(this.runs, provider, record.runMs / 1000);
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
      "# HELP wicket_jobs_total Jobs finished since the server started, by app, outcome and provider.",
      "# TYPE wicket_jobs_total counter",
    ];
    for (const entry of [...this.jobs.values()].sort((a, b) => (a.app + a.outcome + a.provider).localeCompare(b.app + b.outcome + b.provider))) {
      lines.push(`wicket_jobs_total${labels({ app: entry.app, outcome: entry.outcome, provider: entry.provider })} ${entry.count}`);
    }
    summary(lines, "wicket_job_wait_seconds", "Seconds jobs waited in the queue, by provider.", this.waits);
    summary(lines, "wicket_job_run_seconds", "Seconds jobs ran, by provider.", this.runs);
    return `${lines.join("\n")}\n`;
  }
}

function add(map: Map<string, Totals>, provider: string, seconds: number): void {
  const totals = map.get(provider) ?? { sum: 0, count: 0 };
  totals.sum += seconds;
  totals.count += 1;
  map.set(provider, totals);
}

function summary(lines: string[], name: string, help: string, map: Map<string, Totals>): void {
  lines.push(`# HELP ${name} ${help}`, `# TYPE ${name} summary`);
  for (const [provider, totals] of [...map.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`${name}_sum${labels({ provider })} ${totals.sum}`);
    lines.push(`${name}_count${labels({ provider })} ${totals.count}`);
  }
}
