import type { Provider } from "@wicket/shared";
import type { Db } from "./db.js";

/** How a record's job ended. `ok` is a job whose status was `done`. */
export type Outcome = "ok" | "failed" | "cancelled";

/**
 * One finished job, as kept: who, which ticket, where it ran and how long it
 * took. Never any text; see `db.ts`.
 */
export interface JobRecord {
  app: string;
  ticket: number;
  /** The model that answered, or the last one tried; null if the job never ran. */
  model: string | null;
  provider: Provider | null;
  outcome: Outcome;
  queuedAt: number;
  startedAt: number | null;
  finishedAt: number;
  waitMs: number;
  /** Null if the job never ran. */
  runMs: number | null;
}

export interface StoredRecord extends JobRecord {
  id: number;
}

interface Row {
  id: number;
  app: string;
  ticket: number;
  model: string | null;
  provider: Provider | null;
  outcome: Outcome;
  queued_at: number;
  started_at: number | null;
  finished_at: number;
  wait_ms: number;
  run_ms: number | null;
}

function fromRow(row: Row): StoredRecord {
  return {
    id: row.id,
    app: row.app,
    ticket: row.ticket,
    model: row.model,
    provider: row.provider,
    outcome: row.outcome,
    queuedAt: row.queued_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    waitMs: row.wait_ms,
    runMs: row.run_ms,
  };
}

/** The records table: written once per finished job, read by the page. */
export class Records {
  private readonly insert;
  private readonly maxTicketStmt;
  private readonly recentStmt;

  constructor(db: Db) {
    this.insert = db.prepare(
      `INSERT INTO records (app, ticket, model, provider, outcome, queued_at, started_at, finished_at, wait_ms, run_ms)
       VALUES (@app, @ticket, @model, @provider, @outcome, @queuedAt, @startedAt, @finishedAt, @waitMs, @runMs)`,
    );
    this.maxTicketStmt = db.prepare("SELECT COALESCE(MAX(ticket), 0) AS max FROM records");
    this.recentStmt = db.prepare("SELECT * FROM records ORDER BY finished_at DESC, id DESC LIMIT ?");
  }

  add(record: JobRecord): void {
    this.insert.run(record);
  }

  /** The highest ticket ever recorded, so a restart keeps counting up. */
  maxTicket(): number {
    return (this.maxTicketStmt.get() as { max: number }).max;
  }

  /** The newest records first. */
  recent(limit: number): StoredRecord[] {
    return (this.recentStmt.all(limit) as Row[]).map(fromRow);
  }
}
