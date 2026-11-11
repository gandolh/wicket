import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Writable } from "node:stream";
import type { ErrorBody, JobView } from "@wicket/shared";
import Database from "better-sqlite3";
import type { FastifyInstance, InjectOptions } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { openDatabase } from "./db/open.js";
import { stripApiPrefix } from "./lib/paths.js";
import { AppTokens } from "./plugins/app-tokens/tokens.js";
import { Records } from "./features/records/index.js";
import { settle, stubRunner, type StubCall } from "./testing/stub-runner.js";

const BOT_TOKEN = "b".repeat(64);
const HOUSING_TOKEN = "h".repeat(64);
const TOKENS = AppTokens.parse(`just-a-bot=${BOT_TOKEN},ro-housing=${HOUSING_TOKEN}`);
const BOT = { authorization: `Bearer ${BOT_TOKEN}` };
const HOUSING = { authorization: `Bearer ${HOUSING_TOKEN}` };

let app: FastifyInstance;
let calls: StubCall[];

async function start(options: { maxWaiting?: number; dbPath?: string; logger?: object; records?: Records } = {}) {
  const stub = stubRunner();
  calls = stub.calls;
  app = await buildApp(
    { ...loadConfig({}), dbPath: options.dbPath ?? ":memory:", appTokens: TOKENS },
    { run: stub.run, maxWaiting: options.maxWaiting, server: { logger: options.logger }, records: options.records },
  );
}

beforeEach(async () => {
  await start();
});
afterEach(async () => {
  await app.close();
});

const call = (options: InjectOptions) => app.inject(options);
const submit = (content = "hello", headers: Record<string, string> = BOT) =>
  call({ method: "POST", url: "/v1/jobs", headers, payload: { messages: [{ role: "user", content }] } });

describe("tokens", () => {
  it("refuses a job call with no token, a bad header or an unknown token", async () => {
    const refused: Record<string, string>[] = [
      {},
      { authorization: "Basic abc" },
      { authorization: `Bearer ${"x".repeat(64)}` },
    ];
    for (const headers of refused) {
      const res = await submit("hi", headers);
      expect(res.statusCode).toBe(401);
      expect(res.json<ErrorBody>().code).toBe("unauthorized");
    }
    expect((await call({ url: "/v1/jobs/anything" })).statusCode).toBe(401);
    expect((await call({ method: "DELETE", url: "/v1/jobs/anything" })).statusCode).toBe(401);
  });

  it("leaves health open", async () => {
    const res = await call({ url: "/v1/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });
});

describe("jobs", () => {
  it("queues a job and answers 202 with its ticket and place", async () => {
    const first = await submit();
    expect(first.statusCode).toBe(202);
    expect(first.json<JobView>()).toMatchObject({ ticket: 1, nowServing: 1, position: 0, status: "running" });
    const second = await submit("again", HOUSING);
    expect(second.json<JobView>()).toMatchObject({ ticket: 2, nowServing: 1, position: 1, status: "queued" });
    expect(typeof second.json<JobView>().id).toBe("string");
  });

  it("answers a done job with its result", async () => {
    const { id } = (await submit()).json<JobView>();
    calls[0]!.answer({ text: "forty-two", model: "gpt-oss:120b" });
    await settle();
    const res = await call({ url: `/v1/jobs/${id}`, headers: BOT });
    expect(res.statusCode).toBe(200);
    expect(res.json<JobView>()).toMatchObject({ status: "done", result: { text: "forty-two", model: "gpt-oss:120b" } });
  });

  it("answers a failed job with a short error", async () => {
    const { id } = (await submit()).json<JobView>();
    calls[0]!.fail("the cloud model answered 429: you have reached your usage limit");
    await settle();
    expect((await call({ url: `/v1/jobs/${id}`, headers: BOT })).json<JobView>()).toMatchObject({
      status: "failed",
      error: "the cloud model answered 429: you have reached your usage limit",
    });
  });

  it("answers another app's job, and an unknown one, as 404", async () => {
    const { id } = (await submit()).json<JobView>();
    expect((await call({ url: `/v1/jobs/${id}`, headers: HOUSING })).statusCode).toBe(404);
    expect((await call({ method: "DELETE", url: `/v1/jobs/${id}`, headers: HOUSING })).statusCode).toBe(404);
    expect((await call({ url: "/v1/jobs/no-such-job", headers: BOT })).json<ErrorBody>().code).toBe("not_found");
  });

  it("cancels the caller's own running job and aborts its request", async () => {
    const { id } = (await submit()).json<JobView>();
    const res = await call({ method: "DELETE", url: `/v1/jobs/${id}`, headers: BOT });
    expect(res.statusCode).toBe(200);
    expect(res.json<JobView>()).toMatchObject({ status: "cancelled", error: "cancelled by the caller" });
    expect(calls[0]!.signal.aborted).toBe(true);
  });

  it("long-polls until the job changes", async () => {
    await submit();
    const { id } = (await submit("second")).json<JobView>();
    setTimeout(() => calls[0]!.answer(), 30);
    const started = Date.now();
    const res = await call({ url: `/v1/jobs/${id}?wait=10`, headers: BOT });
    expect(Date.now() - started).toBeLessThan(5_000);
    expect(res.json<JobView>()).toMatchObject({ status: "running", position: 0 });
  });

  it("holds a long wait to 25 seconds and refuses a negative one", async () => {
    const { id } = (await submit()).json<JobView>();
    calls[0]!.answer();
    await settle();
    expect((await call({ url: `/v1/jobs/${id}?wait=600`, headers: BOT })).statusCode).toBe(200);
    expect((await call({ url: `/v1/jobs/${id}?wait=-1`, headers: BOT })).statusCode).toBe(400);
    expect((await call({ url: `/v1/jobs/${id}?wait=soon`, headers: BOT })).statusCode).toBe(400);
  });

  it("refuses an unknown field, a bad role and no messages", async () => {
    const bodies = [
      { messages: [{ role: "user", content: "hi" }], model: "llama3" },
      { messages: [{ role: "user", content: "hi" }], stream: true },
      { messages: [{ role: "tool", content: "hi" }] },
      { messages: [] },
      { format: "json" },
    ];
    for (const payload of bodies) {
      const res = await call({ method: "POST", url: "/v1/jobs", headers: BOT, payload });
      expect(res.statusCode).toBe(400);
      expect(res.json<ErrorBody>().code).toBe("invalid_request");
    }
  });

  it("takes json or a schema as the format", async () => {
    for (const format of ["json", { type: "object", properties: { rooms: { type: "integer" } } }]) {
      const res = await call({
        method: "POST",
        url: "/v1/jobs",
        headers: BOT,
        payload: { messages: [{ role: "user", content: "hi" }], format },
      });
      expect(res.statusCode).toBe(202);
    }
    expect(calls[0]!.request.format).toBe("json");
  });

  it("answers a body that isn't JSON without quoting it", async () => {
    const res = await call({
      method: "POST",
      url: "/v1/jobs",
      headers: { ...BOT, "content-type": "application/json" },
      payload: "{secret listing",
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).not.toContain("secret listing");
  });

  it("answers 503 queue_full when the line is full", async () => {
    await app.close();
    await start({ maxWaiting: 1 });
    await submit(); // runs
    await submit(); // waits
    const res = await submit();
    expect(res.statusCode).toBe(503);
    expect(res.json<ErrorBody>().code).toBe("queue_full");
  });

  it("serves the same routes under /wicket-api", async () => {
    expect((await call({ url: "/wicket-api/v1/health" })).statusCode).toBe(200);
    expect(stripApiPrefix("/wicket-api")).toBe("/");
    expect(stripApiPrefix("/wicket-api?x=1")).toBe("/?x=1");
    expect(stripApiPrefix("/wicket-apix/v1")).toBe("/wicket-apix/v1");
  });
});

describe("the guards and the response schemas", () => {
  it("refuse every signed-out /v1 call in the contract's shape: no route declares a 401", async () => {
    const routes = [
      ["POST", "/v1/jobs"],
      ["GET", "/v1/jobs/some-job"],
      ["DELETE", "/v1/jobs/some-job"],
      ["PATCH", "/v1/jobs/some-job"],
      ["GET", "/v1/queue"],
      ["POST", "/v1/queue/running/cancel"],
      ["POST", "/v1/queue/clear"],
      ["GET", "/v1/records"],
    ] as const;
    for (const [method, url] of routes) {
      for (const prefix of ["", "/wicket-api"]) {
        const res = await call({ method, url: `${prefix}${url}` });
        expect(res.statusCode, `${method} ${prefix}${url}`).toBe(401);
        expect(res.json<ErrorBody>()).toEqual({ code: "unauthorized", message: expect.any(String) });
      }
    }
  });
});

describe("records", () => {
  it("keep no prompt or answer text, in the database or the log", async () => {
    await app.close();
    const dir = mkdtempSync(join(tmpdir(), "wicket-records-"));
    const dbPath = join(dir, "wicket.sqlite");
    let logged = "";
    const stream = new Writable({
      write(chunk: Buffer, _encoding, done) {
        logged += chunk.toString();
        done();
      },
    });
    // The test's own handle on the same file, passed in, so it can read the records back.
    const recordsDb = openDatabase(dbPath);
    const records = new Records(recordsDb);
    try {
      await start({ dbPath, logger: { level: "trace", stream }, records });
      const prompt = "PROMPT-the-flat-on-strada-lalelelor-7f3a";
      const answer = "ANSWER-three-rooms-second-floor-9c1d";
      const { id } = (await submit(prompt)).json<JobView>();
      calls[0]!.answer({ text: answer });
      await settle();
      expect((await call({ url: `/v1/jobs/${id}`, headers: BOT })).json<JobView>().result?.text).toBe(answer);
      // A cancelled and a failed one too.
      const cancelled = (await submit(`${prompt}-cancelled`)).json<JobView>();
      await call({ method: "DELETE", url: `/v1/jobs/${cancelled.id}`, headers: BOT });
      await submit(`${prompt}-failed`);
      calls[2]!.fail("the cloud model answered 500");
      await settle();

      expect(
        records
          .recent(10)
          .map((r) => r.outcome)
          .sort(),
      ).toEqual(["cancelled", "failed", "ok"]);
      await app.close();
      recordsDb.close();

      const db = new Database(dbPath, { readonly: true });
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[];
      for (const { name } of tables) {
        const rows = JSON.stringify(db.prepare(`SELECT * FROM "${name}"`).all());
        expect(rows).not.toContain("PROMPT-");
        expect(rows).not.toContain("ANSWER-");
      }
      db.close();
      for (const file of [dbPath, `${dbPath}-wal`]) {
        if (!existsSync(file)) continue;
        const bytes = readFileSync(file).toString("latin1");
        expect(bytes).not.toContain("PROMPT-");
        expect(bytes).not.toContain("ANSWER-");
      }
      expect(logged.length).toBeGreaterThan(0);
      expect(logged).not.toContain("PROMPT-");
      expect(logged).not.toContain("ANSWER-");
      expect(logged).not.toContain(BOT_TOKEN);
    } finally {
      if (recordsDb.open) recordsDb.close();
      rmSync(dir, { recursive: true, force: true });
      // afterEach closes again; a closed app closes quietly.
    }
  });

  it("keep counting tickets up across a restart", async () => {
    await app.close();
    const dir = mkdtempSync(join(tmpdir(), "wicket-tickets-"));
    const dbPath = join(dir, "wicket.sqlite");
    try {
      await start({ dbPath });
      await submit();
      await submit();
      await app.close(); // cancels and records both
      await start({ dbPath });
      expect((await submit()).json<JobView>().ticket).toBe(3);
    } finally {
      await app.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
