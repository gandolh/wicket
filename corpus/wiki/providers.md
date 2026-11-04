---
summary: How a job reaches a model, as built 2026-11-04. Ollama Cloud first, then the backup Ollama; the settings and their defaults (gpt-oss:120b, 120 s; gemma3:1b, 1m keep-alive, 300 s); what counts as a cloud failure (anything but a cancel); why a cancel never falls back and how the code tells it from a timeout; what the caller's error and the log say (never the prompt); running with no key; how it was tested (stub servers, one opt-in live test).
updated: 2026-11-04
---

# Providers

[`server/src/providers.ts`](../../server/src/providers.ts) builds the queue's
runner. Why the cloud comes first and the backup is small is in
[decisions.md](decisions.md); this page is how it works.

## One call

Both providers get Ollama's `POST /api/chat` with `model`, `messages`,
`stream: false`, the caller's `format` when given, and for the backup
`keep_alive`. The cloud also gets `Authorization: Bearer <OLLAMA_API_KEY>`.
The answer is `message.content`, trimmed.

## Settings

| Variable | Default | |
|---|---|---|
| `OLLAMA_API_KEY` | unset | Secret. Unset sends every job straight to the backup. |
| `WICKET_CLOUD_URL` | `https://ollama.com` | |
| `WICKET_CLOUD_MODEL` | `gpt-oss:120b` | just-a-bot's default. |
| `WICKET_CLOUD_TIMEOUT_SECONDS` | 120 | |
| `WICKET_BACKUP_URL` | `http://127.0.0.1:11434` | `http://wicket-ollama:11434` in the container. |
| `WICKET_BACKUP_MODEL` | `gemma3:1b` | Locally, any model you already have. |
| `WICKET_BACKUP_KEEP_ALIVE` | `1m` | Seconds (sent as a number, `0` unloads at once) or a duration. |
| `WICKET_BACKUP_TIMEOUT_SECONDS` | 300 | Generous: one core is slow. |

[`config.ts`](../../server/src/config.ts) checks them at start and names any
that is wrong, never repeating the key.

## What counts as a cloud failure

Anything but a cancel: the cloud can't be reached, takes longer than its
timeout, answers anything but 2xx (401 and 429 included, since a bad key or a
spent quota is exactly when the backup is wanted), sends a body that isn't
JSON, sends `error` in a 200, or sends an empty answer. The same job then goes
to the backup, and its result says `backup: true`.

## A cancel never falls back

Each call listens to two signals: the job's (aborted by the queue on a
caller's `DELETE`, a force close, a clear or shutdown) and its own timeout,
joined with `AbortSignal.any`. When the call ends early, the runner checks the
job's signal first: if it fired, the job was cancelled and the runner stops.
Only a timeout on its own counts as a failure. Aborting the request is what
stops Ollama generating: it stops when the connection closes. The tests watch
the stub server see the connection close, and the backup never called.

## What the caller and the log see

- A caller's `error` on a failed job names both failures, like "the cloud
  model answered 429: you have reached your usage limit, and the backup model
  took longer than 300 s". Ollama's own error text is cut to 120 characters.
- The log gets one line per fallback and per backup failure, with a status
  code or a kind (`timeout`, `unreachable`, `bad-body`, `error-body`,
  `empty`) and never Ollama's text, which could in principle quote the prompt.

## How it was tested (2026-11-04)

Against stub Ollama servers on loopback: the cloud answering; falling back on a
500, 429, 401, a non-JSON body, an empty answer, an error in a 200, a timeout
and an unreachable cloud; no key; keep-alive as a duration and as seconds;
both failing; and force close or the caller's cancel aborting the request with
no fallback. One opt-in test (`WICKET_LIVE_OLLAMA=1`) asks the developer's own
Ollama with `llama3.2:1b` while the cloud stub fails; it answered in about 4 s.
No model was pulled.
