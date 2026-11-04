import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";

/**
 * Wicket's SQLite file: the records, and from sign-in on the accounts (whose
 * `auth_*` tables the vendored library migrates itself). The schema is
 * versioned with `PRAGMA user_version`: each migration runs once, in order,
 * inside a transaction, and bumps the version. The library never touches
 * `user_version`.
 *
 * A record holds counts and timings only. No column holds a prompt or an
 * answer, and none may: `app` and `model` are names, the rest are numbers.
 * Times are epoch milliseconds.
 */
export type Db = Database.Database;

export const MIGRATIONS: string[] = [
  `
  CREATE TABLE records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app TEXT NOT NULL,
    ticket INTEGER NOT NULL,
    model TEXT,
    provider TEXT CHECK (provider IN ('cloud', 'backup')),
    outcome TEXT NOT NULL CHECK (outcome IN ('ok', 'failed', 'cancelled')),
    queued_at INTEGER NOT NULL,
    started_at INTEGER,
    finished_at INTEGER NOT NULL,
    wait_ms INTEGER NOT NULL,
    run_ms INTEGER
  );
  CREATE INDEX records_by_finished ON records (finished_at);
  `,
];

function migrate(db: Db): void {
  const current = db.pragma("user_version", { simple: true }) as number;
  if (current > MIGRATIONS.length) {
    throw new Error(`the database is at schema ${current}, newer than this server knows (${MIGRATIONS.length})`);
  }
  for (let version = current; version < MIGRATIONS.length; version++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[version]!);
      db.pragma(`user_version = ${version + 1}`);
    })();
  }
}

export function openDatabase(path: string): Db {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}
