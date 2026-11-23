# Task 16: The cloud model's reasoning level as a setting

**Before you start:** run `brief-board guide` ([corpus/CLAUDE.md](../../CLAUDE.md)).

Filed 2026-11-23 from the odysseus research ([research-odysseus.md](../../wiki/research-odysseus.md)).
Odysseus is AGPL-3.0: this brief takes one idea from it. No code, prompt or text from it is copied, and none
may be.

## Context

Wicket asks `gpt-oss:120b` every question without a `think` field (`chat()` in
`server/src/features/queue/runner.ts`), so Ollama uses the model's default reasoning level. Ollama's thinking
docs (docs.ollama.com/capabilities/thinking, read 2026-11-23) say gpt-oss takes `think` as one of `low`, `medium`
or `high`, uses `medium` when the field is left out, and can't turn reasoning off: a model that can't takes
`false` as its lowest level. The reasoning comes back in `message.thinking`, the answer in `message.content`.

Wicket runs one call at a time, so the time one call spends reasoning is time every waiting caller waits.
Neither caller obviously needs medium. ro-housing's "fill the gaps" copies fields out of one listing page into
a JSON schema, and just-a-bot's `/ask` answers a chat question. Odysseus gives its background "utility" calls
their own, lower reasoning level, and sends a level only to a model known to take one
(`src/utility_effort.py@17ff9ea`, `specs/model-providers/ollama.md@17ff9ea`, `specs/model-quirks.md@17ff9ea`).

This brief adds the level as a Wicket setting, beside the model. Callers still choose nothing, the request
body stays strict, and the API contract ([api.md](../../wiki/api.md)) doesn't change. Unset, the request body is
exactly the current one, so the deploy changes nothing until the owner sets it.

## Decisions

- **`WICKET_CLOUD_THINK`**, one of `low`, `medium`, `high`, or unset. Unset sends no `think` field. Any other
  value stops start-up with a message naming the variable and the three values, the way `config.ts` treats a
  bad `WICKET_CLOUD_TIMEOUT_SECONDS`. No `true` or `false`: the one model Wicket runs takes levels, and
  `false` would only be read as `low`.
- **One level for every call.** No level per app and no caller field: callers never pick how the model runs
  ([decisions.md](../../wiki/decisions.md), "Ollama Cloud only, and Wicket picks the model").
- **No capability check.** Wicket doesn't ask `/api/show` what the model takes. A model that refuses the field
  fails each job with Ollama's own reason, which the queue page shows. `providers.md` says to unset or recheck
  the level whenever `WICKET_CLOUD_MODEL` changes.
- **Reasoning text never leaves the runner.** The result stays `message.content`. `message.thinking` is never
  read into the result, the log or a caller's error. The runner already behaves this way; a test keeps it.
- **The records don't gain a column.** The owner compares run times before and after the change by its time.

## Files you OWN

- `server/src/config.ts`, `server/src/config.test.ts`
- `server/src/features/queue/runner.ts`, `server/src/features/queue/runner.test.ts`
- `.env.example`, `docs/getting-started.md` and `docs/owner-setup.md` (their settings tables)
- `corpus/wiki/providers.md`, `corpus/wiki/status.md`, `corpus/log.md`

## Files you must NOT touch

- `shared/src/api.ts` and `corpus/wiki/api.md`: the contract doesn't change.
- `web/`: the page doesn't show the level.
- `vendor/house-style/`, `server/vendor/`, `web/vendor/`: generated copies.

## What to do

1. `config.ts`: read `WICKET_CLOUD_THINK` as an optional enum of the three levels and add an optional
   `think` to `CloudSettings`.
2. `runner.ts`: put `think` in the request body only when the setting has a value.
3. Tests against the stub server:
   - unset: the body the stub receives has no `think` key;
   - set to `low`: the body carries `"think": "low"`;
   - a bad value (`off`, `true`, `max`): start-up fails and the message names the variable;
   - the stub answers with both `message.thinking` and `message.content`: the result is the content alone, and
     neither the log nor a failure's error holds the thinking text.
4. Docs: the new row in each settings table and in `.env.example` (commented out, like its neighbours). In
   `providers.md`: the setting, the gpt-oss facts above with the date they were read, and the line about
   rechecking the level when the model changes.
5. `docs/owner-setup.md`: the owner steps below, written as commands and checks.

## Acceptance

- [ ] Unset, the request body equals the current one (the test above); set, it carries the level.
- [ ] A bad value stops start-up and names `WICKET_CLOUD_THINK`.
- [ ] The thinking text reaches neither the result, the log nor an error (the test above).
- [ ] `npm run check` exit 0; `bash corpus/lint.sh` OK.
- [ ] End move `ready_for_deploy` (the server changes; the page doesn't).

## Owner steps (after the deploy)

Live calls are the owner's (the repo's `CLAUDE.md`: no live runs without the owner).

1. With the setting unset, run about five "Fill the gaps" in ro-housing and five `/ask` in Discord. Note each
   run time from the queue page's Recent calls, and the time you finished.
2. Set `WICKET_CLOUD_THINK=low` where `WICKET_CLOUD_MODEL` is set, restart `wicket-api`, and run similar fills
   and questions.
3. Keep `low` if the fills still find the same fields and the answers read as well, and the run times dropped.
   Otherwise try `medium` or unset it. If every job fails with an Ollama error about `think`, Ollama Cloud
   doesn't take the field for this model: unset it and note that in `providers.md`.

## Owner decisions

- The level, after the comparison in the owner steps. The brief ships it unset. `low` is the likely pick for
  the fill; whether `/ask` answers stay good enough at `low` is the owner's taste.
