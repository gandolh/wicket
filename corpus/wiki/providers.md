---
summary: How a job reaches the model, as built 2026-11-04 and made cloud only the same day (brief 08). Ollama Cloud only, no model on the box; the settings and their defaults (gpt-oss:120b, 120 s); what counts as a failure (no key, unreachable, a timeout, anything but 2xx, a bad body) and that it fails the job with the reason; how a cancel is told from a timeout; what the caller's error and the log say (never the prompt); running with no key; how it was tested (stub servers).
updated: 2026-11-04
---

# Providers

[`server/src/providers.ts`](../../server/src/providers.ts) builds the queue's
runner. Why Wicket asks Ollama Cloud only is in [decisions.md](decisions.md)
("Ollama Cloud only"); this page is how it works. The page keeps its name from
when there were two providers, a cloud and a backup; the backup was dropped on
2026-11-04.

## One call

The runner sends Ollama's `POST /api/chat` with `model`, `messages`,
`stream: false`, the caller's `format` when given, and
`Authorization: Bearer <OLLAMA_API_KEY>`. The answer is `message.content`,
trimmed, and the job's result is `{ text, model }`.

## Settings

| Variable | Default | |
|---|---|---|
| `OLLAMA_API_KEY` | unset | Secret. Unset, every job fails at once, saying so. |
| `WICKET_CLOUD_URL` | `https://ollama.com` | |
| `WICKET_CLOUD_MODEL` | `gpt-oss:120b` | just-a-bot's default. |
| `WICKET_CLOUD_TIMEOUT_SECONDS` | 120 | |

[`config.ts`](../../server/src/config.ts) checks them at start and names any
that is wrong, never repeating the key. Old `WICKET_BACKUP_*` lines in an
`.env` are ignored.

## What counts as a failure

No key is set; the cloud can't be reached; it takes longer than its timeout;
it answers anything but 2xx (a bad key is a 401, a spent quota a 429); it
sends a body that isn't JSON, `error` in a 200, or an empty answer. Each ends
the job `failed` with the reason, and the queue starts the next ticket. There
is no second model to ask.

## A cancel is not a failure

Each call listens to two signals: the job's (aborted by the queue on a
caller's `DELETE`, a force close, a clear or shutdown) and its own timeout,
joined with `AbortSignal.any`. When the call ends early, the runner checks the
job's signal first: if it fired, the job was cancelled and the abort goes back
to the queue, which has already marked it `cancelled`. Only a timeout on its
own is a failure. Aborting the request is what stops Ollama generating: it
stops when the connection closes. The tests watch the stub server see the
connection close.

## What the caller and the log see

- A caller's `error` on a failed job says what the cloud did, like "the cloud
  model answered 429: you have reached your usage limit", "the cloud model
  took longer than 120 s", or "the cloud model can't be asked:
  OLLAMA_API_KEY is not set". Ollama's own error text is cut to 120
  characters.
- The log gets one line per failure, with a status code or a kind
  (`timeout`, `unreachable`, `bad-body`, `error-body`, `empty`) and never
  Ollama's text, which could in principle quote the prompt.

## How it was tested (2026-11-04)

Against a stub Ollama server on loopback: the cloud answering, with `format`
as `"json"` and as a schema; failing on a 500, 429, 401, a non-JSON body, an
empty answer, an error in a 200, a timeout and an unreachable cloud; failing at
once with no key; a failure in the queue followed by the next ticket running;
and force close or the caller's cancel aborting the request. The image was
run with no key and a job ended `failed` with the no-key reason. No real model
was asked.
