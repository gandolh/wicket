import { afterEach, describe, expect, it } from "vitest";
import { LIVE_PROMPT, LIVE_SCHEMA, liveFormat } from "./live-format.js";
import { answer, closeStubs, refuse, stub, type Handler } from "./testing/ollama-stub.js";

/**
 * The live check against the stub Ollama server: one stub answer per verdict,
 * and the guard. No real model is asked, and no `.env` is loaded.
 */

afterEach(closeStubs);

const KEY = "k".repeat(40);

/** Runs the check against `url` with the variable set, and what it printed. */
async function run(url: string, extra: NodeJS.ProcessEnv = {}): Promise<{ code: number; printed: string[] }> {
  const printed: string[] = [];
  const env = { WICKET_LIVE_FORMAT: "1", OLLAMA_API_KEY: KEY, WICKET_CLOUD_URL: url, ...extra };
  const code = await liveFormat({ env, print: (line) => printed.push(line) });
  return { code, printed };
}

async function verdictFor(handler: Handler): Promise<string[]> {
  const cloud = await stub();
  cloud.handle(handler);
  const { code, printed } = await run(cloud.url);
  expect(code).toBe(0);
  expect(cloud.seen).toHaveLength(1);
  return printed;
}

describe("the guard", () => {
  for (const value of [undefined, "", "0", "true", "yes"]) {
    it(`sends nothing when WICKET_LIVE_FORMAT is ${JSON.stringify(value)}`, async () => {
      const cloud = await stub();
      const printed: string[] = [];
      let fetched = 0;
      const env = { OLLAMA_API_KEY: KEY, WICKET_CLOUD_URL: cloud.url, WICKET_LIVE_FORMAT: value };
      const code = await liveFormat({
        env,
        print: (line) => printed.push(line),
        fetch: () => {
          fetched++;
          return Promise.reject(new Error("no request may be sent"));
        },
        loadEnv: () => {
          throw new Error("no .env may be loaded");
        },
      });
      expect(code).toBe(0);
      expect(fetched).toBe(0);
      expect(cloud.seen).toHaveLength(0);
      expect(printed).toEqual([
        "live format check: not run. Set WICKET_LIVE_FORMAT=1 to send one request to Ollama Cloud.",
      ]);
    });
  }

  it("sends nothing without a key", async () => {
    const cloud = await stub();
    const printed: string[] = [];
    const code = await liveFormat({
      env: { WICKET_LIVE_FORMAT: "1", WICKET_CLOUD_URL: cloud.url },
      print: (line) => printed.push(line),
    });
    expect(code).toBe(1);
    expect(cloud.seen).toHaveLength(0);
    expect(printed).toEqual(["live format check: OLLAMA_API_KEY is not set, so no request was sent."]);
  });
});

describe("the request", () => {
  it("is one chat call as the runner sends a job: prose asked for, the schema in format, nothing of Wicket's", async () => {
    const cloud = await stub();
    const { printed } = await run(cloud.url, { WICKET_CLOUD_THINK: "low" });
    expect(cloud.seen).toHaveLength(1);
    expect(cloud.seen[0]?.headers.authorization).toBe(`Bearer ${KEY}`);
    expect(cloud.seen[0]?.body).toEqual({
      model: "gpt-oss:120b",
      messages: [{ role: "user", content: LIVE_PROMPT }],
      stream: false,
      format: LIVE_SCHEMA,
      think: "low",
    });
    expect(printed.join("\n")).not.toContain(KEY);
  });
});

describe("the verdict", () => {
  it("honoured: JSON matching the schema, despite the prose asked for", async () => {
    const printed = await verdictFor((_req, res) => answer(res, '{"city": "Bucharest", "population": 1700000}'));
    expect(printed).toEqual([
      "verdict: honoured",
      "model: gpt-oss:120b",
      "http status: 200",
      'answer (first 300 characters): "{\\"city\\": \\"Bucharest\\", \\"population\\": 1700000}"',
      "parses as JSON: yes",
      "matches the schema: yes",
    ]);
  });

  it("ignored: prose", async () => {
    const prose = `Bucharest is the capital of Romania. ${"About 1.7 million people live there. ".repeat(20)}`;
    const printed = await verdictFor((_req, res) => answer(res, prose));
    expect(printed[0]).toBe("verdict: ignored");
    expect(printed).toContain("parses as JSON: no");
    expect(printed).toContain("matches the schema: no");
    const evidence = printed.find((line) => line.startsWith("answer"));
    expect(evidence).toBe(`answer (first 300 characters): ${JSON.stringify(`${prose.slice(0, 300)}...`)}`);
  });

  it("ignored: JSON that doesn't match the schema", async () => {
    const printed = await verdictFor((_req, res) => answer(res, '{"city": "Bucharest", "population": "1.7 million"}'));
    expect(printed[0]).toBe("verdict: ignored");
    expect(printed).toContain("parses as JSON: yes");
    expect(printed).toContain("matches the schema: no");
  });

  it("refused: an HTTP error", async () => {
    const printed = await verdictFor((_req, res) => refuse(res, 400, "format is not supported for cloud models"));
    expect(printed.slice(0, 4)).toEqual([
      "verdict: refused",
      "model: gpt-oss:120b",
      "http status: 400",
      'error: "format is not supported for cloud models"',
    ]);
  });

  it("refused: an error body in a 200", async () => {
    const printed = await verdictFor((_req, res) => refuse(res, 200, "invalid format"));
    expect(printed[0]).toBe("verdict: refused");
    expect(printed).toContain("http status: 200");
  });

  it("no verdict when the cloud can't be reached", async () => {
    const printed: string[] = [];
    const code = await liveFormat({
      env: { WICKET_LIVE_FORMAT: "1", OLLAMA_API_KEY: KEY },
      print: (line) => printed.push(line),
      fetch: () => Promise.reject(new TypeError("fetch failed")),
    });
    expect(code).toBe(1);
    expect(printed).toEqual(["live format check: no verdict, the cloud could not be reached."]);
  });
});
