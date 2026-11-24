# Task 20: One live check of `format` against Ollama Cloud

**Before you start:** run `brief-board guide` ([corpus/CLAUDE.md](../../CLAUDE.md)).

**Depends on:** nothing.

**Builder:** Sonnet: one opt-in script, its unit test against the stub, and two wiki lines.

## Context

From [the todo](../../todos/check-format-against-ollama-cloud.md) (2026-11-23). Wicket's contract offers `format`
(`"json"` or a JSON schema) and the runner passes it to Ollama Cloud as it is ([providers.md](../wiki/providers.md),
[api.md](../wiki/api.md)). Ollama's cloud page says cloud models don't support structured outputs, and every `format`
test so far ran against the stub. Nobody knows whether the cloud honours `format`, ignores it, or refuses the request.

ro-housing, the one caller that sends a schema, already checks every answer itself (`mergeFill` in its
`api/src/features/saved/details/fill.ts`: JSON, an object, only the asked fields, the right types, sane ranges), so
nothing breaks today whatever the answer is.

The repo's hard rule: no real model without the owner's word. The owner gave it on 2026-11-25 for **one** live call,
run by the owner (builders can't read the key).

## Files you OWN

- `server/src/live-format.ts` (new): the opt-in check, compiled with the server
- its test beside it, against the stub server the runner's tests use
- a `live:format` script in `server/package.json`
- `corpus/wiki/providers.md` and `corpus/wiki/api.md` (the lines named in step 3), `corpus/log.md`

## Files you must NOT touch

- `.env` files: never read them. The runner, the queue and the API: this brief changes no behaviour.

## Steps

1. **The check** (`server/src/live-format.ts`): exits at once with a one-line note unless `WICKET_LIVE_FORMAT=1`.
   With it, it reads the settings through `config.ts` (so `OLLAMA_API_KEY`, the cloud URL and `WICKET_CLOUD_MODEL`
   come from where the server reads them), and sends **one** `POST /api/chat` to Ollama Cloud, built the way the runner
   builds a job's request, with:
   - a user message that asks for **prose**: "In two sentences, say what the capital of Romania is and roughly how
     many people live there. Answer in plain sentences, not JSON." (prompt and schema disagree on purpose);
   - `format` set to a small schema: an object with `city` (string) and `population` (integer), both required.
   It prints one verdict line and the evidence: HTTP status; the answer's first 300 characters; whether it parses as
   JSON; whether it matches the schema. Verdict: **refused** (an HTTP error, or an error body naming `format`),
   **honoured** (JSON matching the schema, despite the prose request), **ignored** (prose, or JSON that doesn't match).
   It never prints the key or any header.
2. **The test** runs the same function against the stub (no network): one stub answer per verdict, and the
   `WICKET_LIVE_FORMAT` guard.
3. **The wiki, ready for the result:** in providers.md, replace "Whether Ollama Cloud takes ..." for `format` with a
   line saying the check exists, how the owner runs it, and "result: pending the owner's run". In api.md, under
   `format`, add: callers check the answer themselves (the owner's call of 2026-11-25); Wicket passes `format` through
   and does not validate the answer.

## Acceptance

- [ ] `npm run check` passes; the new test covers the three verdicts and the guard.
- [ ] Without `WICKET_LIVE_FORMAT=1` the script makes no request (the test proves it).
- [ ] The script is in the server's build output (`server/dist/live-format.js`), so it runs in the container too.
- [ ] `bash corpus/lint.sh` passes.
- [ ] End move `ready_for_test` with the owner step below and one `--question`: "Paste the live check's output".

## Owner steps

Run the check once, where the key is. On the box, after `node cli.ts wicket server` ships this brief, as the
services account in the API's server folder:

```
export DOCKER_HOST=unix:///run/user/$(id -u)/docker.sock
docker compose -f infrastructure/docker-compose.yml exec -e WICKET_LIVE_FORMAT=1 wicket-api node server/dist/live-format.js
```

(or locally, with `OLLAMA_API_KEY` in your shell: `WICKET_LIVE_FORMAT=1 npm run live:format -w @wicket/server`).
Paste the output. The controller then records the result: **honoured** → providers.md with the date; **ignored** →
the api.md line stands (callers check), nothing else; **refused** → a fix brief, since ro-housing's Fill the gaps
fails today.

## Owner decisions

- Settled 2026-11-25 (owner, grill): find out with this check and one live call by the owner.
- Settled 2026-11-25 (owner, grill): callers check `format` answers themselves; Wicket stays a pass-through.
- Mine (technical): a prompt that asks for prose while the schema asks for JSON, so "honoured" and "ignored" differ.
