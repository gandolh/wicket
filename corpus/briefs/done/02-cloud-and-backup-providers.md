# Task 02: The cloud and the backup, and falling back

## Context

Brief 01 left the queue with a runner that fails every job. This brief gives it
the real one: Ollama Cloud first, the backup Ollama when the cloud fails
([decisions.md](../../wiki/decisions.md), "Ollama Cloud first" and "The backup
is gemma3:1b"). Both speak Ollama's `POST /api/chat` with `stream: false`;
just-a-bot's `/ask` already calls the cloud this way, with
`Authorization: Bearer <OLLAMA_API_KEY>` against `https://ollama.com`.

No Ollama Cloud key is available to the build. Test the cloud with a stub
server. The developer machine has its own Ollama on `127.0.0.1:11434` with
`llama3.2:1b`; one opt-in test uses it as the backup. **Pull no model.**

Depends on 01.

## Files you OWN

- `server/src/providers.ts` (new) and its test
- `server/src/config.ts`, `server/src/index.ts`, `server/src/app.ts` (only
  the wiring), `.env.example`
- `corpus/wiki/architecture.md`, `corpus/wiki/status.md`, `corpus/log.md`,
  and a new `corpus/wiki/providers.md`

## What to do

1. **One Ollama chat call.** `model`, `messages`, `format` (passed as it is),
   `stream: false`, and for the backup `keep_alive`. Answer with
   `message.content`, trimmed; an empty answer, a body with `error`, a non-2xx
   or a body that isn't JSON is a failure. Error messages carry the status code
   and Ollama's error, cut short, never the prompt.
2. **The runner.**
   - With `OLLAMA_API_KEY` set, ask the cloud with `WICKET_CLOUD_MODEL`
     (default `gpt-oss:120b`) at `WICKET_CLOUD_URL` (default
     `https://ollama.com`), under `WICKET_CLOUD_TIMEOUT_SECONDS` (default 120).
   - On any cloud failure (network, timeout, 4xx including 401 and 429, 5xx,
     a bad body), ask the backup: `WICKET_BACKUP_MODEL` (default `gemma3:1b`)
     at `WICKET_BACKUP_URL` (default `http://127.0.0.1:11434`), with
     `keep_alive` from `WICKET_BACKUP_KEEP_ALIVE` (default `1m`), under
     `WICKET_BACKUP_TIMEOUT_SECONDS` (default 300). The result has
     `backup: true`.
   - With no key, every job goes straight to the backup, and the start logs
     that once. The server must start without a key.
   - **A cancel never falls back.** Combine the job's signal with the timeout
     (`AbortSignal.any`) and check which fired: the timeout goes to the
     backup, the job's signal ends the job `cancelled`.
   - Both failing makes the job `failed`, with both short reasons.
   - The record gets the provider and model that answered, or the last one
     tried.
3. **Logs.** One line per fallback with the cloud's status or error kind, and
   one per backup failure. Never message text.
4. **`corpus/wiki/providers.md`.** The settings, what counts as a failure,
   timeouts, keep-alive, and why a cancel never falls back.

## Acceptance

- `npm run typecheck`, `npm run lint` and `npm test` pass.
- Tests against stub HTTP servers (one for the cloud, one for the backup): the
  cloud answers and the backup is never called; a cloud 500, 429, 401, a
  timeout and an unreachable cloud each fall back with `backup: true`; no key
  goes straight to the backup; both failing is `failed` with no prompt text in
  the error; `format` and `keep_alive` reach the server as sent; **force close
  aborts the request** (the stub sees the connection close) and the backup is
  not called afterwards.
- An opt-in test (`WICKET_LIVE_OLLAMA=1`) with the cloud stub failing and the
  backup set to the local Ollama with `llama3.2:1b` answers with
  `backup: true`. Run it once by hand and say so; it is skipped by default.
- `bash corpus/lint.sh` passes.

## Outcome (2026-11-04)

Built as specified; how it works is in
[providers.md](../../wiki/providers.md).

- **Failures** also include an `error` field in a 200 answer.
- **The caller's error** carries Ollama's own error text, cut to 120
  characters; the **log** carries only a status code or a kind, since
  Ollama's text could in principle quote the prompt.
- **Keep-alive** is sent as a number when the setting is whole seconds (`0`
  unloads at once) and as a string for a duration (`1m`), because Ollama reads
  a bare `"60"` string as a bad duration.
- `index.ts` logs at start which cloud model and backup model are in use, and
  says so when there is no key.

Checks: `npm run typecheck`, `npm run lint`, `npm test` (5 files, 63 tests,
1 skipped: 17 new for the providers, 4 for their settings). The opt-in live
test ran once by hand (`WICKET_LIVE_OLLAMA=1`) against the developer's Ollama
with `llama3.2:1b` and passed in about 4 s. By hand: the built server with no
key took a `format: "json"` job and answered `{"ok": true}` from
`llama3.2:1b` with `backup: true`; its record held app, ticket, model,
provider, outcome and times only. No model was pulled.
