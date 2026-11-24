import type { Format, Message } from "@wicket/shared";
import { Ajv, type ErrorObject, type ValidateFunction } from "ajv";

/**
 * What Wicket guarantees about an answer's shape, the same for every caller.
 * A `"plain"` job (or one with no `format`) gets the answer as the model
 * wrote it, and nothing here runs. A `"json"` job gets a JSON object or
 * array; a schema job gets JSON that matches the schema. For those two, the
 * conversation ends with a system message saying so, the answer is checked,
 * and a wrong answer goes back to the model once, with what was wrong. A
 * second wrong answer fails the job as `format_mismatch`.
 *
 * Nothing the model wrote reaches the caller's error: it names what was wrong
 * (not JSON, or a schema error's path and keyword), never the answer.
 */

/** A format whose answer Wicket checks. */
export type CheckedFormat = Exclude<Format, "plain">;

export function isChecked(format: Format | undefined): format is CheckedFormat {
  return format !== undefined && format !== "plain";
}

/** A job that failed for its format. The message is the caller's whole error. */
export class FormatFailure extends Error {
  /** For the log: `format_mismatch` or `bad-schema`. */
  readonly kind: string;

  constructor(kind: string, message: string) {
    super(message);
    this.kind = kind;
    this.name = "FormatFailure";
  }
}

/** One call to the model with these messages, passing `format` on. Resolves with the answer's text. */
export type Ask = (messages: Message[], format: CheckedFormat) => Promise<string>;

/**
 * A checked job: the conversation plus the format's instruction, then the
 * check, and on a wrong answer one more call with the answer and what was
 * wrong. Resolves with the checked JSON, re-serialised.
 */
export async function answerInFormat(format: CheckedFormat, messages: Message[], ask: Ask): Promise<string> {
  const check = checker(format);
  const conversation = [...messages, instruction(format)];
  const first = await ask(conversation, format);
  const firstCheck = check(first);
  if (firstCheck.ok) return firstCheck.text;

  const retry: Message[] = [
    ...conversation,
    { role: "assistant", content: first },
    { role: "user", content: firstCheck.mismatch.retry },
  ];
  const secondCheck = check(await ask(retry, format));
  if (secondCheck.ok) return secondCheck.text;
  throw new FormatFailure("format_mismatch", secondCheck.mismatch.error);
}

const JSON_ONLY = "Answer with JSON only: no prose before or after it, and no Markdown code fences.";

/** The system message a checked job's conversation ends with. */
function instruction(format: CheckedFormat): Message {
  const content =
    format === "json"
      ? `${JSON_ONLY} The answer must be a JSON object or array.`
      : `${JSON_ONLY} The answer must match this JSON schema:\n${JSON.stringify(format)}`;
  return { role: "system", content };
}

/** Why an answer failed its check. */
interface Mismatch {
  /** The user message that asks the model again. Sent once, never kept. */
  retry: string;
  /** The failed job's error. Never any of the answer's text. */
  error: string;
}

type Checked = { ok: true; text: string } | { ok: false; mismatch: Mismatch };

const NOT_JSON: Mismatch = {
  retry: "Your answer was not valid JSON. Answer again with JSON only: no prose and no code fences.",
  error: "the model's answer was not valid JSON after one retry",
};

const NOT_OBJECT: Mismatch = {
  retry: "Your answer was JSON but not an object or array. Answer again with a JSON object or array only.",
  error: "the model's answer was not a JSON object or array after one retry",
};

/** How many schema errors the retry message names. */
const RETRY_ERRORS = 3;

/** The longest path a failed job's error quotes. */
const PATH_LENGTH = 60;

/** One fenced block around the whole answer, with or without a language: ```json ... ```. */
const FENCE = /^```[^\n`]*\n([\s\S]*?)\n?```$/;

function unfence(answer: string): string {
  const trimmed = answer.trim();
  const inner = FENCE.exec(trimmed)?.[1];
  return inner === undefined ? trimmed : inner.trim();
}

/** The answer check for one job. A schema is compiled once, here, before any call. */
function checker(format: CheckedFormat): (answer: string) => Checked {
  const validate = format === "json" ? undefined : compile(format);
  const names = format === "json" ? new Set<string>() : declaredNames(format);
  return (answer) => {
    let value: unknown;
    try {
      value = JSON.parse(unfence(answer));
    } catch {
      return { ok: false, mismatch: NOT_JSON };
    }
    if (validate === undefined) {
      if (typeof value !== "object" || value === null) return { ok: false, mismatch: NOT_OBJECT };
    } else if (!validate(value)) {
      return { ok: false, mismatch: schemaMismatch(validate.errors ?? [], names) };
    }
    return { ok: true, text: JSON.stringify(value) };
  };
}

function compile(schema: Record<string, unknown>): ValidateFunction {
  // A fresh instance per job: a schema's `$id` stays registered with its instance, and a later job sending the same
  // `$id` would be refused. `logger: false` keeps ajv's warnings (an unknown `format` keyword) out of the log.
  const ajv = new Ajv({ strict: false, allErrors: true, logger: false });
  try {
    return ajv.compile(schema);
  } catch {
    throw new FormatFailure("bad-schema", "the format is not a JSON schema Wicket can check");
  }
}

function schemaMismatch(errors: ErrorObject[], names: ReadonlySet<string>): Mismatch {
  const named = errors.slice(0, RETRY_ERRORS).map((e) => `${e.instancePath || "the root"} ${e.message ?? e.keyword}`);
  const first = errors[0];
  return {
    retry: `Your answer did not match the JSON schema: ${named.join("; ")}. Answer again with JSON only, matching the schema.`,
    error: first
      ? `the model's answer did not match the schema after one retry: ${where(first, names)} (${first.keyword})`
      : "the model's answer did not match the schema after one retry",
  };
}

/**
 * The error's place in the answer, for the caller. A segment the schema
 * doesn't name (a key the model chose, under `additionalProperties` or
 * `patternProperties`) is answer text, so it shows as `*`.
 */
function where(error: ErrorObject, names: ReadonlySet<string>): string {
  if (error.instancePath === "") return "the root";
  const segments = error.instancePath.split("/").slice(1);
  const path = segments
    .map((segment) => {
      const name = segment.replace(/~1/g, "/").replace(/~0/g, "~");
      return /^\d+$/.test(name) || names.has(name) ? segment : "*";
    })
    .join("/");
  return `/${path}`.length > PATH_LENGTH ? `/${path.slice(0, PATH_LENGTH - 4)}...` : `/${path}`;
}

/** Every property name a schema declares, in `properties` or `required`, at any depth. */
function declaredNames(schema: unknown, names = new Set<string>()): Set<string> {
  if (Array.isArray(schema)) {
    for (const item of schema) declaredNames(item, names);
  } else if (typeof schema === "object" && schema !== null) {
    for (const [key, value] of Object.entries(schema)) {
      if (key === "properties" && typeof value === "object" && value !== null && !Array.isArray(value)) {
        for (const name of Object.keys(value)) names.add(name);
      }
      if (key === "required" && Array.isArray(value)) {
        for (const name of value) if (typeof name === "string") names.add(name);
      }
      declaredNames(value, names);
    }
  }
  return names;
}
