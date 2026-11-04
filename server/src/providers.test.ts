import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import type { JobRequest, JobResult } from "@wicket/shared";
import { afterEach, describe, expect, it } from "vitest";
import { createRunner, type BackupSettings, type CloudSettings } from "./providers.js";
import { Queue, type RunContext } from "./queue.js";
import type { JobRecord } from "./records.js";

/**
 * The providers against stub Ollama servers on loopback. No real model: one
 * opt-in test at the end asks the developer's own Ollama, and is skipped
 * unless WICKET_LIVE_OLLAMA=1.
 */

interface Seen {
  headers: IncomingMessage["headers"];
  body: Record<string, unknown>;
}

type Handler = (req: IncomingMessage, res: ServerResponse, body: Record<string, unknown>) => void;

interface Stub {
  url: string;
  seen: Seen[];
  /** Resolves when a request's connection closes before an answer was sent. */
  hungUp: Promise<void>;
  /** Resolves on the first request. */
  reached: Promise<void>;
  handle(handler: Handler): void;
}

const servers: Server[] = [];

async function stub(): Promise<Stub> {
  let handler: Handler = (_req, res) => answer(res, "stub answer");
  const seen: Seen[] = [];
  let hungUp!: () => void;
  let reached!: () => void;
  const hungUpPromise = new Promise<void>((resolve) => (hungUp = resolve));
  const reachedPromise = new Promise<void>((resolve) => (reached = resolve));
  const server = createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk: Buffer) => (raw += chunk.toString()));
    req.on("end", () => {
      const body = JSON.parse(raw) as Record<string, unknown>;
      seen.push({ headers: req.headers, body });
      res.on("close", () => {
        if (!res.writableEnded) hungUp();
      });
      reached();
      handler(req, res, body);
    });
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}`, seen, hungUp: hungUpPromise, reached: reachedPromise, handle: (h) => (handler = h) };
}

function answer(res: ServerResponse, content: string, status = 200): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify({ model: "x", message: { role: "assistant", content }, done: true }));
}

function refuse(res: ServerResponse, status: number, error: string): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify({ error }));
}

afterEach(async () => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

const PROMPT = "PROMPT-a-flat-near-the-park-5e1b";
const ask: JobRequest = { messages: [{ role: "user", content: PROMPT }] };
const KEY = "k".repeat(40);

function cloudAt(url: string, timeoutMs = 2_000): CloudSettings {
  return { url, model: "gpt-oss:120b", apiKey: KEY, timeoutMs };
}
function backupAt(url: string, keepAlive: string | number = "1m"): BackupSettings {
  return { url, model: "gemma3:1b", keepAlive, timeoutMs: 2_000 };
}

/** A context for calling the runner directly; records each attempt. */
function context(signal = new AbortController().signal): RunContext & { attempts: string[] } {
  const attempts: string[] = [];
  return { signal, attempts, attempt: (provider, model) => attempts.push(`${provider}:${model}`) };
}

/** A port nothing listens on: a server that was opened and closed. */
async function deadUrl(): Promise<string> {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  await new Promise((resolve) => server.close(resolve));
  return `http://127.0.0.1:${port}`;
}

describe("the cloud", () => {
  it("answers, and the backup is never asked", async () => {
    const cloud = await stub();
    const backup = await stub();
    cloud.handle((_req, res) => answer(res, "  from the cloud  "));
    const run = createRunner({ cloud: cloudAt(cloud.url), backup: backupAt(backup.url) });
    const ctx = context();
    await expect(run({ ...ask, format: "json" }, ctx)).resolves.toEqual({ text: "from the cloud", model: "gpt-oss:120b", backup: false });
    expect(backup.seen).toHaveLength(0);
    expect(ctx.attempts).toEqual(["cloud:gpt-oss:120b"]);
    expect(cloud.seen[0]!.headers.authorization).toBe(`Bearer ${KEY}`);
    expect(cloud.seen[0]!.body).toMatchObject({ model: "gpt-oss:120b", stream: false, format: "json", messages: ask.messages });
    expect(cloud.seen[0]!.body).not.toHaveProperty("keep_alive");
  });

  it("passes a JSON schema format as it is", async () => {
    const cloud = await stub();
    const schema = { type: "object", properties: { rooms: { type: "integer" } }, required: ["rooms"] };
    const run = createRunner({ cloud: cloudAt(cloud.url), backup: backupAt(await deadUrl()) });
    await run({ ...ask, format: schema }, context());
    expect(cloud.seen[0]!.body.format).toEqual(schema);
  });
});

describe("falling back", () => {
  const failures: [string, Handler][] = [
    ["a 500", (_req, res) => refuse(res, 500, "internal error")],
    ["a 429 (quota)", (_req, res) => refuse(res, 429, "you have reached your usage limit")],
    ["a 401 (bad key)", (_req, res) => refuse(res, 401, "unauthorized")],
    ["a body that isn't JSON", (_req, res) => res.end("<html>bad gateway</html>")],
    ["an empty answer", (_req, res) => answer(res, "   ")],
    ["an error in a 200", (_req, res) => refuse(res, 200, "model not loaded")],
  ];

  for (const [name, handler] of failures) {
    it(`falls back on ${name}`, async () => {
      const cloud = await stub();
      const backup = await stub();
      cloud.handle(handler);
      backup.handle((_req, res) => answer(res, "from the backup"));
      const warnings: string[] = [];
      const run = createRunner({
        cloud: cloudAt(cloud.url),
        backup: backupAt(backup.url),
        log: { warn: (m) => warnings.push(m), error: (m) => warnings.push(m) },
      });
      const ctx = context();
      await expect(run(ask, ctx)).resolves.toEqual({ text: "from the backup", model: "gemma3:1b", backup: true });
      expect(ctx.attempts).toEqual(["cloud:gpt-oss:120b", "backup:gemma3:1b"]);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toMatch(/^the cloud failed \(/);
    });
  }

  it("falls back when the cloud takes too long, and aborts its request", async () => {
    const cloud = await stub();
    const backup = await stub();
    cloud.handle(() => undefined); // never answers
    const run = createRunner({ cloud: cloudAt(cloud.url, 100), backup: backupAt(backup.url) });
    await expect(run(ask, context())).resolves.toMatchObject({ backup: true });
    await cloud.hungUp;
  });

  it("falls back when the cloud can't be reached", async () => {
    const backup = await stub();
    const run = createRunner({ cloud: cloudAt(await deadUrl()), backup: backupAt(backup.url) });
    await expect(run(ask, context())).resolves.toMatchObject({ backup: true });
  });

  it("goes straight to the backup with no key", async () => {
    const backup = await stub();
    const run = createRunner({ cloud: undefined, backup: backupAt(backup.url) });
    const ctx = context();
    await expect(run(ask, ctx)).resolves.toEqual({ text: "stub answer", model: "gemma3:1b", backup: true });
    expect(ctx.attempts).toEqual(["backup:gemma3:1b"]);
    expect(backup.seen[0]!.headers.authorization).toBeUndefined();
  });

  it("sends the backup's keep-alive, as a duration or as seconds", async () => {
    const backup = await stub();
    await createRunner({ cloud: undefined, backup: backupAt(backup.url, "1m") })(ask, context());
    await createRunner({ cloud: undefined, backup: backupAt(backup.url, 0) })(ask, context());
    expect(backup.seen.map((s) => s.body.keep_alive)).toEqual(["1m", 0]);
    expect(backup.seen[0]!.body).toMatchObject({ model: "gemma3:1b", stream: false });
  });

  it("fails with both short reasons when both fail, and never the prompt", async () => {
    const cloud = await stub();
    const backup = await stub();
    // An Ollama that quoted the prompt back would still not reach the log.
    cloud.handle((_req, res) => refuse(res, 503, `overloaded while reading ${PROMPT}`));
    backup.handle((_req, res) => refuse(res, 500, "out of memory"));
    const logged: string[] = [];
    const run = createRunner({
      cloud: cloudAt(cloud.url),
      backup: backupAt(backup.url),
      log: { warn: (m) => logged.push(m), error: (m) => logged.push(m) },
    });
    const error = await run(ask, context()).catch((e: unknown) => e as Error);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(/^the cloud model answered 503: .*, and the backup model answered 500: out of memory$/);
    expect(logged).toEqual(["the cloud failed (503); asking the backup", "the backup failed (500)"]);
    expect(logged.join("\n")).not.toContain(PROMPT);
  });
});

describe("cancelling", () => {
  function queueWith(cloud: CloudSettings | undefined, backup: BackupSettings) {
    const records: JobRecord[] = [];
    const queue = new Queue({ run: createRunner({ cloud, backup }), record: (r) => records.push(r) });
    return { queue, records };
  }

  it("force close aborts the cloud's request, and the backup is never asked", async () => {
    const cloud = await stub();
    const backup = await stub();
    cloud.handle(() => undefined);
    const { queue, records } = queueWith(cloudAt(cloud.url, 10_000), backupAt(backup.url));
    const job = queue.submit("app", ask);
    await cloud.reached;
    expect(queue.forceClose()).toBe(true);
    await cloud.hungUp;
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(backup.seen).toHaveLength(0);
    expect(queue.get(job.id, "app")).toMatchObject({ status: "cancelled" });
    expect(records[0]).toMatchObject({ outcome: "cancelled", provider: "cloud", model: "gpt-oss:120b" });
  });

  it("the caller's cancel aborts the backup's request", async () => {
    const backup = await stub();
    backup.handle(() => undefined);
    const { queue, records } = queueWith(undefined, backupAt(backup.url));
    const job = queue.submit("app", ask);
    await backup.reached;
    queue.cancel(job.id, "app");
    await backup.hungUp;
    expect(records[0]).toMatchObject({ outcome: "cancelled", provider: "backup", model: "gemma3:1b" });
  });

  it("a runner whose signal is already aborted rethrows the abort instead of falling back", async () => {
    const cloud = await stub();
    const backup = await stub();
    cloud.handle(() => undefined);
    const run = createRunner({ cloud: cloudAt(cloud.url), backup: backupAt(backup.url) });
    const controller = new AbortController();
    const result: Promise<JobResult> = run(ask, context(controller.signal));
    await cloud.reached;
    controller.abort();
    await expect(result).rejects.toThrow();
    expect(backup.seen).toHaveLength(0);
  });
});

describe.skipIf(process.env.WICKET_LIVE_OLLAMA !== "1")("the developer's own Ollama (WICKET_LIVE_OLLAMA=1)", () => {
  it("answers as the backup when the cloud fails", { timeout: 180_000 }, async () => {
    const cloud = await stub();
    cloud.handle((_req, res) => refuse(res, 500, "down"));
    const run = createRunner({
      cloud: cloudAt(cloud.url),
      backup: {
        url: process.env.WICKET_LIVE_BACKUP_URL ?? "http://127.0.0.1:11434",
        model: process.env.WICKET_LIVE_BACKUP_MODEL ?? "llama3.2:1b",
        keepAlive: 0,
        timeoutMs: 170_000,
      },
    });
    const result = await run({ messages: [{ role: "user", content: "Reply with the single word: yes" }] }, context());
    expect(result.backup).toBe(true);
    expect(result.model).toBe(process.env.WICKET_LIVE_BACKUP_MODEL ?? "llama3.2:1b");
    expect(result.text.length).toBeGreaterThan(0);
  });
});
