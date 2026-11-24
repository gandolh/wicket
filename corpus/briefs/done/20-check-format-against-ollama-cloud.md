# Task 20: One live check of `format` against Ollama Cloud

**Before you start:** run `brief-board guide` ([corpus/CLAUDE.md](../../CLAUDE.md)).

**Depends on:** nothing.

**Builder:** Sonnet: one opt-in script, its unit test against the stub, and two wiki lines.

## Context

From [the todo](../../todos/check-format-against-ollama-cloud.md) (2026-11-23). Wicket's contract offers `format`
(`"json"` or a JSON schema) and the runner passes it to Ollama Cloud as it is ([providers.md](../../wiki/providers.md),
[api.md](../../wiki/api.md)). Ollama's cloud page says cloud models don't support structured outputs, and every `format`
test so far ran against the stub. Nobody knows whether the cloud honours `format`, ignores it, or refuses the request.

ro-housing, the one caller that sends a schema, already checks every answer itself (`mergeFill`, in its
saved feature: JSON, an object, only the asked fields, the right types, sane ranges), so
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
3. **The wiki, ready for the result:** in providers.md, add a line for `format` saying the check exists, how the
   owner runs it, and "result: pending the owner's run". Brief 21 makes Wicket enforce the answer's format whatever
   the cloud does; this check only says whether passing `format` on to the cloud helps.

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
providers.md says so, and brief 21's own check is what holds the format; **refused** → a fix brief, since ro-housing's Fill the gaps
fails today.

## Owner decisions

- Settled 2026-11-25 (owner, grill): find out with this check and one live call by the owner.
- Settled 2026-11-25 (owner, grill, then revisited the same night): Wicket enforces the answer's format, for
  consistency among its callers ([brief 21](21-wicket-enforces-the-answers-format.md)); callers may keep their own checks.
- Mine (technical): a prompt that asks for prose while the schema asks for JSON, so "honoured" and "ignored" differ.

## Outcome

Built 2026-11-24 (74187af code, cd3c24a docs). `server/src/live-format.ts` sends one `POST /api/chat`, built the way
the runner sends a job (the model, `stream: false`, `think` when set, the key as a bearer token), with the prose prompt
above and the two-field schema in `format`, and prints the verdict (honoured, ignored, refused), the model, the HTTP
status, any error text, the answer's first 300 characters, and whether it parses as JSON and matches the schema
(ajv). It leaves out brief 21's JSON instruction, so the verdict is about the cloud and not Wicket's check; a fenced
JSON answer counts as ignored. An error body in a 200 counts as refused too, whether or not it names `format`; the
printed error says which. The guard reads `WICKET_LIVE_FORMAT` through `liveFormatWanted()` in `config.ts` (the one
reader of the environment), before any `.env` is loaded; only `1` runs it. The test runs the same function against
the stub server (moved to `server/src/testing/ollama-stub.ts` by brief 21): each verdict, the guard, no key, and an
unreachable cloud. `node server/dist/live-format.js` and `npm run live:format -w @wicket/server` were run with the
variable unset only: one line, exit 0, no request. The owner's steps are in `docs/owner-setup.md` section 11.

Ready for test: the owner runs it once after `node cli.ts wicket server` and pastes the output (question 1 on the
ticket); the controller then records the verdict in `providers.md`.
