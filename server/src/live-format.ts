import { pathToFileURL } from "node:url";
import { Ajv } from "ajv";
import { liveFormatWanted, loadConfig, loadEnvFile, type CloudSettings } from "./config.js";

/**
 * One live check of `format` against Ollama Cloud: does the cloud honour a
 * JSON schema in `format`, ignore it, or refuse the request? Opt-in: without
 * `WICKET_LIVE_FORMAT=1` it prints one line and sends nothing.
 *
 *     WICKET_LIVE_FORMAT=1 npm run live:format -w @wicket/server     (development, through tsx)
 *     node server/dist/live-format.js                                  (built, as in the container)
 *
 * It sends one `POST /api/chat`, the way the runner sends a job (the model,
 * `stream: false`, `think` when set, the key as a bearer token), with a user
 * message that asks for prose and a schema in `format` that asks for JSON.
 * The two disagree on purpose: JSON matching the schema means the cloud
 * honoured `format`. Wicket's own JSON instruction is left out, so the
 * verdict is about the cloud, not about Wicket's check.
 *
 * It prints the verdict and the evidence: the HTTP status, the answer's first
 * 300 characters, whether it parses as JSON and whether it matches the
 * schema. It never prints the key or a header.
 */

/** Asks for prose, against the schema. */
export const LIVE_PROMPT =
  "In two sentences, say what the capital of Romania is and roughly how many people live there. " +
  "Answer in plain sentences, not JSON.";

export const LIVE_SCHEMA = {
  type: "object",
  properties: { city: { type: "string" }, population: { type: "integer" } },
  required: ["city", "population"],
};

/** refused: an HTTP error or an error body. honoured: JSON matching the schema. ignored: anything else. */
type Verdict = "refused" | "honoured" | "ignored";

const EVIDENCE_LENGTH = 300;

function cut(text: string): string {
  return JSON.stringify(text.length > EVIDENCE_LENGTH ? `${text.slice(0, EVIDENCE_LENGTH)}...` : text);
}

const NOT_JSON = Symbol("not JSON");

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return NOT_JSON;
  }
}

/** The one request, and the verdict with its evidence as lines to print. Throws when the cloud can't be reached. */
async function checkFormat(cloud: CloudSettings, doFetch: typeof fetch): Promise<string[]> {
  const body = {
    model: cloud.model,
    messages: [{ role: "user", content: LIVE_PROMPT }],
    stream: false,
    format: LIVE_SCHEMA,
    ...(cloud.think !== undefined ? { think: cloud.think } : {}),
  };
  const res = await doFetch(`${cloud.url}/api/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      authorization: `Bearer ${cloud.apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(cloud.timeoutMs),
  });
  const raw = parseJson(await res.text());
  const reply = raw === NOT_JSON ? undefined : raw;
  const error = (reply as { error?: unknown } | undefined)?.error;
  const content = (reply as { message?: { content?: unknown } } | undefined)?.message?.content;
  const answer = typeof content === "string" ? content : "";

  const parsed = parseJson(answer);
  const parses = parsed !== NOT_JSON;
  const matches = parses && new Ajv({ strict: false, logger: false }).compile(LIVE_SCHEMA)(parsed);

  const refused = !res.ok || typeof error === "string";
  const verdict: Verdict = refused ? "refused" : matches ? "honoured" : "ignored";
  return [
    `verdict: ${verdict}`,
    `model: ${cloud.model}`,
    `http status: ${res.status}`,
    ...(typeof error === "string" ? [`error: ${cut(error)}`] : []),
    `answer (first ${EVIDENCE_LENGTH} characters): ${cut(answer)}`,
    `parses as JSON: ${parses ? "yes" : "no"}`,
    `matches the schema: ${matches ? "yes" : "no"}`,
  ];
}

interface LiveFormatOptions {
  /** The environment, as `config.ts` reads it; the process's when left out. */
  env?: NodeJS.ProcessEnv;
  print: (line: string) => void;
  /** Loads the repo's `.env`, after the guard. Left out, nothing is loaded. */
  loadEnv?: () => void;
  fetch?: typeof fetch;
}

/** The check, guard first. Resolves with the exit code. */
export async function liveFormat(options: LiveFormatOptions): Promise<number> {
  const { print } = options;
  if (!liveFormatWanted(options.env)) {
    print("live format check: not run. Set WICKET_LIVE_FORMAT=1 to send one request to Ollama Cloud.");
    return 0;
  }
  options.loadEnv?.();
  const { cloud } = loadConfig(options.env);
  if (!cloud) {
    print("live format check: OLLAMA_API_KEY is not set, so no request was sent.");
    return 1;
  }
  try {
    for (const line of await checkFormat(cloud, options.fetch ?? fetch)) print(line);
    return 0;
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    print(`live format check: no verdict, the cloud ${timedOut ? "took too long" : "could not be reached"}.`);
    return 1;
  }
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(entry).href) {
  process.exitCode = await liveFormat({
    print: (line) => process.stdout.write(`${line}\n`),
    loadEnv: () => void loadEnvFile(),
  });
}
