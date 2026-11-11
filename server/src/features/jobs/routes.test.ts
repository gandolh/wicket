import { Writable } from "node:stream";
import type { ErrorBody, JobView } from "@wicket/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../../app.js";
import { loadConfig } from "../../config.js";
import { AppTokens } from "../../plugins/app-tokens/tokens.js";
import { settle, stubRunner, type StubCall } from "../../testing/stub-runner.js";

const BOT_TOKEN = "b".repeat(64);
const BOT = { authorization: `Bearer ${BOT_TOKEN}` };

let app: FastifyInstance;
let calls: StubCall[];
let logged: string;

/** The whole app with a stub runner, every log line kept in `logged`. */
async function start(): Promise<void> {
  const stub = stubRunner();
  calls = stub.calls;
  logged = "";
  const stream = new Writable({
    write(chunk: Buffer, _encoding, done) {
      logged += chunk.toString();
      done();
    },
  });
  app = await buildApp(
    { ...loadConfig({}), dbPath: ":memory:", appTokens: AppTokens.parse(`just-a-bot=${BOT_TOKEN}`) },
    { run: stub.run, server: { logger: { level: "trace", stream } } },
  );
}

afterEach(async () => {
  await app.close();
});

describe("the job routes' schemas", () => {
  it("answer a bad body with a 400 that names the field and never echoes a value", async () => {
    await start();
    const bodies = [
      { messages: [{ role: "PROMPT-a-role", content: "PROMPT-the-flat-on-strada-lalelelor" }] },
      { messages: [{ role: "user", content: "PROMPT-the-flat-on-strada-lalelelor" }], format: "PROMPT-a-format" },
    ];
    const messages: string[] = [];
    for (const payload of bodies) {
      const res = await app.inject({ method: "POST", url: "/v1/jobs", headers: BOT, payload });
      expect(res.statusCode).toBe(400);
      expect(res.body).not.toContain("PROMPT-");
      const body = res.json<ErrorBody>();
      expect(body.code).toBe("invalid_request");
      messages.push(body.message);
    }
    expect(messages[0]).toMatch(/^messages\.0\.role: /);
    expect(messages[1]).toMatch(/^format: /);
    expect(calls).toHaveLength(0);
    expect(logged).not.toContain("PROMPT-");
  });

  it("answer a reply that fails its schema with the contract's 500, with no answer text in the body or the log", async () => {
    await start();
    const { id } = (
      await app.inject({
        method: "POST",
        url: "/v1/jobs",
        headers: BOT,
        payload: { messages: [{ role: "user", content: "hello" }] },
      })
    ).json<JobView>();
    // A runner that broke its contract: a model that isn't a name.
    calls[0]!.answer({ text: "ANSWER-three-rooms-second-floor", model: 7 as unknown as string });
    await settle();
    const res = await app.inject({ url: `/v1/jobs/${id}`, headers: BOT });
    expect(res.statusCode).toBe(500);
    expect(res.json<ErrorBody>()).toEqual({ code: "internal", message: "Wicket hit an error; see its log" });
    expect(logged).toContain("a reply doesn't match its response schema");
    expect(logged).not.toContain("ANSWER-");
  });
});
