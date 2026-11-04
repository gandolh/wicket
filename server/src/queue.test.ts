import type { JobRequest } from "@wicket/shared";
import { describe, expect, it } from "vitest";
import { CANCEL_REASONS, Queue, QueueFullError } from "./queue.js";
import type { JobRecord } from "./records.js";
import { settle, stubRunner } from "./testing.js";

const ask = (content = "hello"): JobRequest => ({ messages: [{ role: "user", content }] });

function setup(options: { maxWaiting?: number; keepFinishedMs?: number; firstTicket?: number } = {}) {
  const stub = stubRunner();
  const records: JobRecord[] = [];
  let clock = 1_000_000;
  const queue = new Queue({ run: stub.run, record: (record) => records.push(record), now: () => clock, ...options });
  return {
    queue,
    calls: stub.calls,
    records,
    tick: (ms: number) => {
      clock += ms;
    },
  };
}

describe("the queue", () => {
  it("runs one job at a time, first come first served", async () => {
    const { queue, calls } = setup();
    const a = queue.submit("just-a-bot", ask("a"));
    const b = queue.submit("ro-housing", ask("b"));
    const c = queue.submit("just-a-bot", ask("c"));
    expect(calls).toHaveLength(1);
    expect(calls[0]!.request.messages[0]!.content).toBe("a");
    expect(queue.get(a.id, "just-a-bot")!.status).toBe("running");
    expect(queue.get(b.id, "ro-housing")!.status).toBe("queued");

    calls[0]!.answer();
    await settle();
    expect(calls).toHaveLength(2);
    expect(calls[1]!.request.messages[0]!.content).toBe("b");
    expect(queue.get(c.id, "just-a-bot")!.status).toBe("queued");

    calls[1]!.answer();
    await settle();
    expect(calls).toHaveLength(3);
    expect(calls[2]!.request.messages[0]!.content).toBe("c");
  });

  it("never runs two at once, even when a runner fails", async () => {
    const { queue, calls } = setup();
    queue.submit("app", ask());
    queue.submit("app", ask());
    calls[0]!.fail("the cloud and the backup both failed");
    await settle();
    expect(calls).toHaveLength(2);
    expect(queue.snapshot().running?.ticket).toBe(2);
    expect(queue.snapshot().waiting).toHaveLength(0);
  });

  it("hands out tickets that count up, with now serving and position", async () => {
    const { queue, calls } = setup({ firstTicket: 41 });
    const a = queue.submit("app", ask());
    const b = queue.submit("app", ask());
    const c = queue.submit("app", ask());
    expect([a.ticket, b.ticket, c.ticket]).toEqual([41, 42, 43]);
    expect(a).toMatchObject({ status: "running", position: 0, nowServing: 41 });
    expect(b).toMatchObject({ status: "queued", position: 1, nowServing: 41 });
    expect(c).toMatchObject({ status: "queued", position: 2, nowServing: 41 });

    calls[0]!.answer({ text: "first" });
    await settle();
    expect(queue.get(a.id, "app")).toMatchObject({
      status: "done",
      position: 0,
      nowServing: 42,
      result: { text: "first", model: "stub-model", backup: false },
    });
    expect(queue.get(c.id, "app")).toMatchObject({ position: 1, nowServing: 42 });
  });

  it("keeps now serving at the last ticket that ran once idle, and 0 before any", async () => {
    const { queue, calls } = setup();
    expect(queue.snapshot().nowServing).toBe(0);
    const a = queue.submit("app", ask());
    calls[0]!.answer();
    await settle();
    expect(queue.snapshot()).toMatchObject({ nowServing: a.ticket, running: null, waiting: [] });
  });

  it("answers another app's job as unknown", () => {
    const { queue } = setup();
    const a = queue.submit("just-a-bot", ask());
    expect(queue.get(a.id, "ro-housing")).toBeUndefined();
    expect(queue.cancel(a.id, "ro-housing")).toBeUndefined();
    expect(queue.get(a.id, "just-a-bot")!.status).toBe("running");
  });

  it("cancels a waiting job, which leaves the line", () => {
    const { queue, calls, records } = setup();
    queue.submit("app", ask());
    const b = queue.submit("app", ask());
    const c = queue.submit("app", ask());
    expect(queue.cancel(b.id, "app")).toMatchObject({ status: "cancelled", error: CANCEL_REASONS.caller, position: 0 });
    expect(queue.get(c.id, "app")!.position).toBe(1);
    expect(calls).toHaveLength(1);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ ticket: b.ticket, outcome: "cancelled", provider: null, model: null, runMs: null });
  });

  it("cancels a running job at once, aborts its request and starts the next", async () => {
    const { queue, calls, records } = setup();
    const a = queue.submit("app", ask());
    queue.submit("app", ask());
    const signal = calls[0]!.signal;
    expect(queue.cancel(a.id, "app")).toMatchObject({ status: "cancelled", error: CANCEL_REASONS.caller });
    expect(signal.aborted).toBe(true);
    expect(calls).toHaveLength(2);
    // Whatever the aborted runner does afterwards changes nothing.
    calls[0]!.answer({ text: "too late" });
    await settle();
    expect(queue.get(a.id, "app")).toMatchObject({ status: "cancelled" });
    expect(queue.get(a.id, "app")!.result).toBeUndefined();
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ outcome: "cancelled", provider: "cloud", model: "stub-model" });
  });

  it("leaves a finished job as it was when cancelled", async () => {
    const { queue, calls } = setup();
    const a = queue.submit("app", ask());
    calls[0]!.answer();
    await settle();
    expect(queue.cancel(a.id, "app")).toMatchObject({ status: "done" });
  });

  it("force closes the running job, and does nothing when idle", async () => {
    const { queue, calls } = setup();
    expect(queue.forceClose()).toBe(false);
    const a = queue.submit("app", ask());
    const b = queue.submit("app", ask());
    expect(queue.forceClose()).toBe(true);
    expect(calls[0]!.signal.aborted).toBe(true);
    expect(queue.get(a.id, "app")).toMatchObject({ status: "cancelled", error: CANCEL_REASONS.forceClose });
    expect(queue.get(b.id, "app")!.status).toBe("running");
  });

  it("clears the waiting line and leaves the running job alone", () => {
    const { queue, calls, records } = setup();
    const a = queue.submit("app", ask());
    const b = queue.submit("app", ask());
    const c = queue.submit("other", ask());
    expect(queue.clear()).toBe(2);
    expect(queue.get(a.id, "app")!.status).toBe("running");
    expect(queue.get(b.id, "app")).toMatchObject({ status: "cancelled", error: CANCEL_REASONS.clear });
    expect(queue.get(c.id, "other")).toMatchObject({ status: "cancelled", error: CANCEL_REASONS.clear });
    expect(calls[0]!.signal.aborted).toBe(false);
    expect(calls).toHaveLength(1);
    expect(records.map((r) => r.outcome)).toEqual(["cancelled", "cancelled"]);
    expect(queue.clear()).toBe(0);
  });

  it("refuses a job when the line is full", () => {
    const { queue } = setup({ maxWaiting: 2 });
    queue.submit("app", ask()); // runs
    queue.submit("app", ask());
    queue.submit("app", ask());
    expect(() => queue.submit("app", ask())).toThrow(QueueFullError);
  });

  it("records wait and run times, and the outcome", async () => {
    const { queue, calls, records, tick } = setup();
    queue.submit("just-a-bot", ask());
    queue.submit("ro-housing", ask());
    tick(1500);
    calls[0]!.answer({ backup: true, model: "backup-model" });
    await settle();
    tick(500);
    calls[1]!.fail("both failed");
    await settle();
    expect(records).toEqual([
      expect.objectContaining({ app: "just-a-bot", outcome: "ok", provider: "backup", model: "backup-model", waitMs: 0, runMs: 1500 }),
      expect.objectContaining({ app: "ro-housing", outcome: "failed", provider: "cloud", model: "stub-model", waitMs: 1500, runMs: 500 }),
    ]);
  });

  it("forgets a finished job after the keep time", async () => {
    const { queue, calls, tick } = setup({ keepFinishedMs: 60_000 });
    const a = queue.submit("app", ask());
    calls[0]!.answer();
    await settle();
    tick(59_000);
    expect(queue.get(a.id, "app")!.status).toBe("done");
    tick(2_000);
    expect(queue.get(a.id, "app")).toBeUndefined();
  });

  it("cancels everything on close and takes no more", () => {
    const { queue, calls, records } = setup();
    const a = queue.submit("app", ask());
    const b = queue.submit("app", ask());
    queue.close();
    expect(calls[0]!.signal.aborted).toBe(true);
    expect(queue.get(a.id, "app")).toMatchObject({ status: "cancelled", error: CANCEL_REASONS.shutdown });
    expect(queue.get(b.id, "app")).toMatchObject({ status: "cancelled", error: CANCEL_REASONS.shutdown });
    expect(records).toHaveLength(2);
    expect(() => queue.submit("app", ask())).toThrow();
  });
});

describe("waiting for a change", () => {
  it("returns as soon as the job's position or status changes", async () => {
    const { queue, calls } = setup();
    queue.submit("app", ask());
    const b = queue.submit("app", ask());
    const started = Date.now();
    const waiting = queue.waitForChange(b.id, "app", 5_000);
    setTimeout(() => calls[0]!.answer(), 20);
    const view = await waiting;
    expect(Date.now() - started).toBeLessThan(2_000);
    expect(view).toMatchObject({ status: "running", position: 0 });
  });

  it("wakes on a clear", async () => {
    const { queue } = setup();
    queue.submit("app", ask());
    const b = queue.submit("app", ask());
    const waiting = queue.waitForChange(b.id, "app", 5_000);
    queue.clear();
    expect(await waiting).toMatchObject({ status: "cancelled" });
  });

  it("answers as it is when nothing changes in time", async () => {
    const { queue } = setup();
    queue.submit("app", ask());
    const b = queue.submit("app", ask());
    const view = await queue.waitForChange(b.id, "app", 30);
    expect(view).toMatchObject({ status: "queued", position: 1 });
  });

  it("answers a finished job at once, and an unknown one as undefined", async () => {
    const { queue, calls } = setup();
    const a = queue.submit("app", ask());
    calls[0]!.answer();
    await settle();
    expect(await queue.waitForChange(a.id, "app", 60_000)).toMatchObject({ status: "done" });
    expect(await queue.waitForChange("nope", "app", 60_000)).toBeUndefined();
  });

  it("stops waiting when the caller hangs up", async () => {
    const { queue } = setup();
    queue.submit("app", ask());
    const b = queue.submit("app", ask());
    const hangUp = new AbortController();
    const waiting = queue.waitForChange(b.id, "app", 60_000, hangUp.signal);
    hangUp.abort();
    expect(await waiting).toMatchObject({ status: "queued" });
  });
});
