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

  it("counts one call for every older record that reached the model, and none for the rest", () => {
    const dir = mkdtempSync(join(tmpdir(), "wicket-db-"));
    dirs.push(dir);
    const path = join(dir, "wicket.sqlite");

    const old = new Database(path);
    for (const migration of MIGRATIONS.slice(0, 2)) old.exec(migration);
    old.pragma("user_version = 2");
    const insert = old.prepare(
      `INSERT INTO records (app, ticket, model, outcome, queued_at, started_at, finished_at, wait_ms, run_ms)
       VALUES ('ro-housing', ?, ?, ?, 1, ?, 3, 1, ?)`,
    );
    insert.run(1, "gpt-oss:120b", "ok", 2, 1);
    insert.run(2, null, "cancelled", null, null);
    old.close();

    const db = openDatabase(path);
    expect(db.pragma("user_version", { simple: true })).toBe(MIGRATIONS.length);
    expect(db.prepare("SELECT ticket, calls FROM records ORDER BY ticket").all()).toEqual([
      { ticket: 1, calls: 1 },
      { ticket: 2, calls: 0 },
    ]);
    db.close();
  });
});
