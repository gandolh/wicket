import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { MIGRATIONS, openDatabase } from "./open.js";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("the schema", () => {
  it("drops the provider column from a database made before Wicket was cloud only, keeping its records", () => {
    const dir = mkdtempSync(join(tmpdir(), "wicket-db-"));
    dirs.push(dir);
    const path = join(dir, "wicket.sqlite");

    const old = new Database(path);
    old.exec(MIGRATIONS[0]!);
    old.pragma("user_version = 1");
    old
      .prepare(
        `INSERT INTO records (app, ticket, model, provider, outcome, queued_at, started_at, finished_at, wait_ms, run_ms)
         VALUES ('just-a-bot', 7, 'gemma3:1b', 'backup', 'ok', 1, 2, 3, 1, 1)`,
      )
      .run();
    old.close();

    const db = openDatabase(path);
    const columns = (db.prepare("PRAGMA table_info(records)").all() as { name: string }[]).map((c) => c.name);
    expect(columns).not.toContain("provider");
    expect(db.pragma("user_version", { simple: true })).toBe(MIGRATIONS.length);
    expect(db.prepare("SELECT app, ticket, outcome FROM records").all()).toEqual([
      { app: "just-a-bot", ticket: 7, outcome: "ok" },
    ]);
    db.close();
  });
});
