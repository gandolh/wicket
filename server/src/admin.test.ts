import type { ClearResponse, ErrorBody, ForceCloseResponse, JobView, QueueResponse, RecordsResponse } from "@wicket/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { seedUser } from "./accounts.js";
import { buildApp, SESSION_COOKIE } from "./app.js";
import { settle, stubRunner, type StubCall } from "./testing.js";
import { AppTokens } from "./tokens.js";

const ORIGIN = "http://localhost:5179";
const BOT_TOKEN = "b".repeat(64);
const BOT = { authorization: `Bearer ${BOT_TOKEN}` };
const PASSWORD = "p".repeat(12);

let app: FastifyInstance;
let calls: StubCall[];
let clock: number;

beforeEach(async () => {
  const stub = stubRunner();
  calls = stub.calls;
  clock = Date.UTC(2026, 10, 4, 12);
  app = await buildApp({
    dbPath: ":memory:",
    run: stub.run,
    appTokens: AppTokens.parse(`just-a-bot=${BOT_TOKEN}`),
    publicOrigin: ORIGIN,
    now: () => clock,
  });
});
afterEach(async () => {
  await app.close();
});

async function signIn(): Promise<string> {
  await seedUser(app.accounts, { username: "owner", password: PASSWORD });
  const res = await app.inject({ method: "POST", url: "/wicket-api/auth/login", payload: { username: "owner", password: PASSWORD } });
  expect(res.statusCode).toBe(200);
  const header = res.headers["set-cookie"];
  const lines = header === undefined ? [] : Array.isArray(header) ? header : [header];
  const line = lines.find((l) => l.startsWith(`${SESSION_COOKIE}=`));
  expect(line).toContain("Path=/wicket-api");
  expect(line).toContain("SameSite=Lax");
  return line!.split(";")[0]!;
}

const submit = async (content = "hello") =>
  (await app.inject({ method: "POST", url: "/wicket-api/v1/jobs", headers: BOT, payload: { messages: [{ role: "user", content }] } })).json<JobView>();

describe("the admin routes", () => {
  it("refuse a signed-out request, in the API's error shape", async () => {
    for (const [method, url] of [
      ["GET", "/wicket-api/v1/queue"],
      ["POST", "/wicket-api/v1/queue/running/cancel"],
      ["POST", "/wicket-api/v1/queue/clear"],
      ["GET", "/wicket-api/v1/records"],
    ] as const) {
      const res = await app.inject({ method, url });
      expect(res.statusCode, `${method} ${url}`).toBe(401);
      expect(res.json<ErrorBody>().code).toBe("unauthorized");
    }
  });

  it("refuse an app token", async () => {
    const res = await app.inject({ url: "/wicket-api/v1/queue", headers: BOT });
    expect(res.statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/wicket-api/v1/queue/clear", headers: BOT })).statusCode).toBe(401);
  });

  it("show the queue to a signed-in session, with no text", async () => {
    const cookie = await signIn();
    const first = await submit("PROMPT-first");
    clock += 5_000;
    const second = await submit("PROMPT-second");
    const res = await app.inject({ url: "/wicket-api/v1/queue", headers: { cookie } });
    expect(res.statusCode).toBe(200);
    expect(res.json<QueueResponse>()).toEqual({
      serverTime: clock,
      nowServing: first.ticket,
      running: { id: first.id, app: "just-a-bot", ticket: first.ticket, provider: "cloud", model: "stub-model", startedAt: clock - 5_000 },
      waiting: [{ id: second.id, app: "just-a-bot", ticket: second.ticket, queuedAt: clock }],
    });
    expect(res.body).not.toContain("PROMPT-");
  });

  it("force close the running job: its request is aborted and its caller sees cancelled", async () => {
    const cookie = await signIn();
    const first = await submit();
    const second = await submit();
    const res = await app.inject({ method: "POST", url: "/wicket-api/v1/queue/running/cancel", headers: { cookie, origin: ORIGIN } });
    expect(res.json<ForceCloseResponse>()).toEqual({ closed: true });
    expect(calls[0]!.signal.aborted).toBe(true);
    const seen = await app.inject({ url: `/wicket-api/v1/jobs/${first.id}`, headers: BOT });
    expect(seen.json<JobView>()).toMatchObject({ status: "cancelled", error: "force closed from the queue page" });
    expect((await app.inject({ url: `/wicket-api/v1/jobs/${second.id}`, headers: BOT })).json<JobView>().status).toBe("running");
  });

  it("answer closed: false with nothing running", async () => {
    const cookie = await signIn();
    const res = await app.inject({ method: "POST", url: "/wicket-api/v1/queue/running/cancel", headers: { cookie } });
    expect(res.json<ForceCloseResponse>()).toEqual({ closed: false });
  });

  it("clear the waiting line, always", async () => {
    const cookie = await signIn();
    const empty = await app.inject({ method: "POST", url: "/wicket-api/v1/queue/clear", headers: { cookie } });
    expect(empty.json<ClearResponse>()).toEqual({ cleared: 0 });
    await submit();
    const b = await submit();
    await submit();
    const res = await app.inject({ method: "POST", url: "/wicket-api/v1/queue/clear", headers: { cookie } });
    expect(res.json<ClearResponse>()).toEqual({ cleared: 2 });
    expect((await app.inject({ url: `/wicket-api/v1/jobs/${b.id}`, headers: BOT })).json<JobView>()).toMatchObject({
      status: "cancelled",
      error: "the queue was cleared",
    });
  });

  it("refuse a write from another site", async () => {
    const cookie = await signIn();
    await submit();
    for (const headers of [
      { cookie, origin: "https://elsewhere.example.com" },
      { cookie, "sec-fetch-site": "cross-site" },
      { cookie, origin: "null" },
    ]) {
      const res = await app.inject({ method: "POST", url: "/wicket-api/v1/queue/running/cancel", headers });
      expect(res.statusCode).toBe(403);
      expect(res.json<ErrorBody>().code).toBe("cross_site");
    }
    expect(calls[0]!.signal.aborted).toBe(false);
  });

  it("show recent records and counts per app", async () => {
    const cookie = await signIn();
    await submit();
    await submit();
    calls[0]!.answer({ backup: true, model: "gemma3:1b" });
    await settle();
    calls[1]!.fail("both failed");
    await settle();
    await submit();
    await app.inject({ method: "POST", url: "/wicket-api/v1/queue/running/cancel", headers: { cookie } });
    const res = await app.inject({ url: "/wicket-api/v1/records?limit=2", headers: { cookie } });
    const body = res.json<RecordsResponse>();
    expect(body.records).toHaveLength(2);
    expect(body.records.map((r) => r.outcome)).toEqual(["cancelled", "failed"]);
    const counts = { app: "just-a-bot", total: 3, ok: 1, failed: 1, cancelled: 1, backup: 1 };
    expect(body.counts).toEqual({ day: [counts], week: [counts] });
    expect((await app.inject({ url: "/wicket-api/v1/records?limit=900", headers: { cookie } })).statusCode).toBe(400);
  });
});

describe("the job routes", () => {
  it("refuse a session with no token", async () => {
    const cookie = await signIn();
    const res = await app.inject({ method: "POST", url: "/wicket-api/v1/jobs", headers: { cookie }, payload: { messages: [{ role: "user", content: "hi" }] } });
    expect(res.statusCode).toBe(401);
    expect(res.json<ErrorBody>().code).toBe("unauthorized");
  });
});

describe("sign-in", () => {
  it("has no rename and no sign-up", async () => {
    const cookie = await signIn();
    const rename = await app.inject({ method: "POST", url: "/wicket-api/auth/username", headers: { cookie }, payload: { username: "someone" } });
    expect(rename.statusCode).toBe(404);
    // Signed out, the guard refuses it before the router can say it doesn't exist.
    const payload = { username: "x", password: PASSWORD };
    expect((await app.inject({ method: "POST", url: "/wicket-api/auth/register", payload })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/wicket-api/auth/register", headers: { cookie }, payload })).statusCode).toBe(404);
  });

  it("leaves health open", async () => {
    expect((await app.inject({ url: "/wicket-api/v1/health" })).json()).toEqual({ ok: true });
  });
});

describe("/metrics", () => {
  it("answers on loopback with the queue and the counts", async () => {
    await submit();
    await submit();
    clock += 2_000;
    calls[0]!.answer();
    await settle();
    const res = await app.inject({ url: "/metrics" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/plain");
    expect(res.body).toContain("wicket_queue_waiting 0\n");
    expect(res.body).toContain("wicket_queue_running 1\n");
    expect(res.body).toContain('wicket_jobs_total{app="just-a-bot",outcome="ok",provider="cloud"} 1\n');
    expect(res.body).toContain('wicket_job_run_seconds_sum{provider="cloud"} 2\n');
    expect(res.body).toContain('wicket_job_wait_seconds_count{provider="cloud"} 1\n');
  });

  it("is refused through a proxy", async () => {
    for (const url of ["/metrics", "/wicket-api/metrics"]) {
      const res = await app.inject({ url, headers: { "x-forwarded-for": "203.0.113.9" } });
      expect(res.statusCode).toBe(404);
    }
    expect((await app.inject({ url: "/metrics", headers: { forwarded: "for=203.0.113.9" } })).statusCode).toBe(404);
  });
});
