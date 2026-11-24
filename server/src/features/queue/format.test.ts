import type { Message } from "@wicket/shared";
import { describe, expect, it } from "vitest";
import { answerInFormat, FormatFailure, isChecked, type Ask, type CheckedFormat } from "./format.js";

/**
 * The format check on its own: a fake `ask` answers from a list and keeps
 * what it was sent. The runner's tests drive the same path against a stub
 * Ollama server.
 */

const ASKED: Message[] = [{ role: "user", content: "the listing" }];

/** An ask that answers in turn from `answers`, keeping each conversation it was sent. */
function asker(...answers: string[]): Ask & { sent: Message[][] } {
  const sent: Message[][] = [];
  const ask = (messages: Message[]): Promise<string> => {
    sent.push(messages);
    const next = answers.shift();
    if (next === undefined) throw new Error("asked more often than the test expected");
    return Promise.resolve(next);
  };
  return Object.assign(ask, { sent });
}

/** The last message of the `n`th conversation an ask was sent. */
function last(ask: { sent: Message[][] }, n: number): Message {
  const message = ask.sent[n]?.at(-1);
  if (!message) throw new Error(`the ask was not sent conversation ${n}`);
  return message;
}

async function failure(format: CheckedFormat, ask: Ask): Promise<FormatFailure> {
  const error = await answerInFormat(format, ASKED, ask).catch((e: unknown) => e);
  expect(error).toBeInstanceOf(FormatFailure);
  return error as FormatFailure;
}

/** ro-housing's Fill the gaps sends a schema of this shape. */
const FILL_SCHEMA = {
  type: "object",
  properties: {
    rooms: { type: ["number", "null"] },
    partitioning: { type: ["string", "null"], enum: ["decomandat", "semidecomandat", null] },
  },
  required: ["rooms", "partitioning"],
  additionalProperties: false,
};

describe("which formats are checked", () => {
  it("checks json and a schema, never plain or no format", () => {
    expect(isChecked(undefined)).toBe(false);
    expect(isChecked("plain")).toBe(false);
    expect(isChecked("json")).toBe(true);
    expect(isChecked({ type: "object" })).toBe(true);
  });
});

describe("json", () => {
  const accepted: [string, string, string][] = [
    ["bare", '{"rooms": 2}', '{"rooms":2}'],
    ["fenced with a language", '```json\n{"rooms": 2}\n```', '{"rooms":2}'],
    ["fenced without one", "  ```\n[1, 2]\n```  ", "[1,2]"],
    ["with space around it", '\n\n {"a": [true, null]} \n', '{"a":[true,null]}'],
  ];
  for (const [name, answer, text] of accepted) {
    it(`takes an answer ${name}, re-serialised, in one call`, async () => {
      const ask = asker(answer);
      await expect(answerInFormat("json", ASKED, ask)).resolves.toBe(text);
      expect(ask.sent).toHaveLength(1);
    });
  }

  it("ends the conversation with one system message asking for JSON only", async () => {
    const ask = asker("{}");
    await answerInFormat("json", ASKED, ask);
    const sent = ask.sent[0] ?? [];
    expect(sent.slice(0, -1)).toEqual(ASKED);
    expect(sent.at(-1)).toMatchObject({ role: "system" });
    expect(last(ask, 0).content).toMatch(/JSON only/);
    expect(last(ask, 0).content).toMatch(/object or array/);
  });

  it("asks again once after prose, with the answer and what was wrong", async () => {
    const ask = asker("Here you go: two rooms.", '{"rooms": 2}');
    await expect(answerInFormat("json", ASKED, ask)).resolves.toBe('{"rooms":2}');
    expect(ask.sent).toHaveLength(2);
    const [first, second] = ask.sent as [Message[], Message[]];
    expect(second.slice(0, first.length)).toEqual(first);
    expect(second.slice(first.length)).toEqual([
      { role: "assistant", content: "Here you go: two rooms." },
      { role: "user", content: expect.stringMatching(/not valid JSON/) },
    ]);
  });

  it("takes a number or a string as not an object or array", async () => {
    const error = await failure("json", asker("42", '"two rooms"'));
    expect(error.kind).toBe("format_mismatch");
    expect(error.message).toBe("the model's answer was not a JSON object or array after one retry");
  });

  it("fails as format_mismatch after a second wrong answer, without the answer's text", async () => {
    const MARKER = "ANSWER-prose-twice-4d1a";
    const ask = asker(`${MARKER} first`, `${MARKER} second`);
    const error = await failure("json", ask);
    expect(error.kind).toBe("format_mismatch");
    expect(error.message).toBe("the model's answer was not valid JSON after one retry");
    expect(error.message).not.toContain(MARKER);
    expect(ask.sent).toHaveLength(2);
  });

  it("drops one fence only: a fence inside the JSON's text stays", async () => {
    const ask = asker('```json\n{"code": "```x```"}\n```');
    await expect(answerInFormat("json", ASKED, ask)).resolves.toBe('{"code":"```x```"}');
  });
});

describe("a JSON schema", () => {
  const schema = {
    type: "object",
    properties: { rooms: { type: "integer" }, floor: { type: "integer" } },
    required: ["rooms"],
  };

  it("puts the schema in the system message", async () => {
    const ask = asker('{"rooms": 2}');
    await answerInFormat(schema, ASKED, ask);
    expect(last(ask, 0).content).toContain(JSON.stringify(schema));
  });

  it("asks again with up to three validation errors, then takes a matching answer", async () => {
    const wrong = JSON.stringify({ rooms: "two", floor: "first" });
    const ask = asker(wrong, '{"rooms": 2}');
    await expect(answerInFormat(schema, ASKED, ask)).resolves.toBe('{"rooms":2}');
    const retry = last(ask, 1);
    expect(retry.role).toBe("user");
    expect(retry.content).toContain("/rooms must be integer");
    expect(retry.content).toContain("/floor must be integer");
  });

  it("names no more than three errors in the retry", async () => {
    const many = {
      type: "object",
      properties: Object.fromEntries("abcde".split("").map((k) => [k, { type: "integer" }])),
    };
    const ask = asker(JSON.stringify({ a: "x", b: "x", c: "x", d: "x", e: "x" }), '{"a": 1}');
    await answerInFormat(many, ASKED, ask);
    expect(last(ask, 1).content.match(/must be integer/g)).toHaveLength(3);
  });

  it("fails with the first error's path and keyword, never the answer", async () => {
    const MARKER = "ANSWER-not-a-number-77c2";
    const error = await failure(schema, asker(JSON.stringify({ rooms: MARKER }), JSON.stringify({ rooms: MARKER })));
    expect(error.kind).toBe("format_mismatch");
    expect(error.message).toBe("the model's answer did not match the schema after one retry: /rooms (type)");
    expect(error.message).not.toContain(MARKER);
  });

  it("says the root when the error is on the whole answer", async () => {
    const error = await failure(schema, asker("{}", "{}"));
    expect(error.message).toBe("the model's answer did not match the schema after one retry: the root (required)");
  });

  it("shows a key the model chose as *, and keeps the keys the schema names", async () => {
    const open = {
      type: "object",
      properties: { units: { type: "array", items: { type: "object", additionalProperties: { type: "integer" } } } },
    };
    const MARKER = "KEY-the-model-wrote-a90e";
    const wrong = JSON.stringify({ units: [{ [MARKER]: "x" }] });
    const error = await failure(open, asker(wrong, wrong));
    expect(error.message).toBe("the model's answer did not match the schema after one retry: /units/0/* (type)");
    expect(error.message).not.toContain(MARKER);
  });

  it("takes ro-housing's fill schema, and asks again for a field it doesn't name", async () => {
    const ok = asker('{"rooms": 3, "partitioning": null}');
    await expect(answerInFormat(FILL_SCHEMA, ASKED, ok)).resolves.toBe('{"rooms":3,"partitioning":null}');

    const extra = asker('{"rooms": 3, "partitioning": "decomandat", "floor": 2}', '{"rooms": 3, "partitioning": null}');
    await expect(answerInFormat(FILL_SCHEMA, ASKED, extra)).resolves.toBe('{"rooms":3,"partitioning":null}');
    expect(last(extra, 1).content).toMatch(/additional properties/);
  });

  it("takes the same $id in a second job", async () => {
    const withId = { $id: "https://example.com/fill.json", type: "object" };
    await expect(answerInFormat(withId, ASKED, asker("{}"))).resolves.toBe("{}");
    await expect(answerInFormat(withId, ASKED, asker("{}"))).resolves.toBe("{}");
  });

  it("fails a schema it can't compile at once, asking nothing", async () => {
    const ask = asker();
    const error = await failure({ type: "a-type-that-does-not-exist" }, ask);
    expect(error.kind).toBe("bad-schema");
    expect(error.message).toBe("the format is not a JSON schema Wicket can check");
    expect(ask.sent).toHaveLength(0);
  });
});
