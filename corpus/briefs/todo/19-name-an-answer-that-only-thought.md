# Task 19: Name an answer that only thought

**Before you start:** run `brief-board guide` ([corpus/CLAUDE.md](../../CLAUDE.md)).

**Depends on:** nothing. Brief 16 (the reasoning level) is built and changed the same function; read its outcome
first.

**Builder:** Sonnet: one function, one failure kind, one test.

## Context

From [the todo](../../todos/name-an-answer-that-only-thought.md) and the odysseus research of 2026-11-23
([research-odysseus.md](../../wiki/research-odysseus.md)). Odysseus is AGPL-3.0: this brief takes the idea of
naming the case. No code, prompt or text from it is copied, and none may be.

gpt-oss returns its reasoning in `message.thinking` and its answer in `message.content`. `chat()` in
`server/src/features/queue/runner.ts` reads only `content` and fails a blank one as `empty` ("sent an empty
answer"). That stays right: reasoning never stands in for the answer. But a model that spent its whole turn
reasoning and wrote no answer (a long `format` job could) reads the same as a blank reply, so neither the caller
nor the owner can tell the two apart.

Nobody has seen the failure yet. The owner asked on 2026-11-25 to promote it anyway, and the change is small
and sits in the function brief 16 already touched.

## Decisions

- **A new failure kind, `thinking-only`**, thrown when `content` is blank and `message.thinking` is a non-blank
  string. The message is fixed: "answered with reasoning and no answer". A blank `content` with no `thinking`
  stays `empty`.
- **Only the kind and the fixed message.** The thinking text reaches neither the log, the job's stored error
  nor the caller's answer, by the "no prompt or answer text at rest" rule. The runner may check that `thinking`
  is non-blank; it never stores, logs or returns it.
- **No fallback.** Reasoning never becomes the answer (the odysseus OpenAI-style path does that; Wicket doesn't).
- **The API contract doesn't change.** The kind is a free string in the job's failure reason today; confirm in
  `shared/src/api.ts` that no enum lists the kinds. If one does, stop and report: `api.md` is other repos'
  contract (just-a-bot and ro-housing quote it) and the owner must hear first.

## Files you OWN

- `server/src/features/queue/runner.ts`, `server/src/features/queue/runner.test.ts`
- `corpus/wiki/status.md`, `corpus/wiki/providers.md` (one line naming the kind), `corpus/log.md`
- `corpus/todos/name-an-answer-that-only-thought.md` (status promoted, then the closeout)

## Files you must NOT touch

- `shared/src/api.ts` and `corpus/wiki/api.md` (see the last decision).
- `web/`, `vendor/house-style/`, `server/vendor/`, `web/vendor/`.
- `corpus/todos/check-format-against-ollama-cloud.md`: the owner is being asked about it.

## Steps

1. In `chat()`, after reading `content` and before the `empty` throw: when `content` is blank and
   `message.thinking` is a non-blank string, throw `ProviderFailure("thinking-only", "answered with reasoning
   and no answer")`. Update the header comment that says `thinking` is never read: it is now only checked for
   being blank, never kept.
2. Tests against the stub server:
   - `content` blank, `thinking` set to a marker string: the job fails with kind `thinking-only` and the fixed
     message, and neither the log lines nor the job's error contain the marker;
   - both blank, and `thinking` missing: still `empty`;
   - `content` and `thinking` both set: the result is the content alone (brief 16's test still passes).
3. `providers.md`: one line listing the failure kinds the runner names, with the new one. `status.md` and
   `log.md` as the repo does at a closeout.

## Acceptance

- [ ] A reasoning-only reply fails as `thinking-only` with the fixed message; the marker text appears in no log
      line and no stored error (the test above).
- [ ] A blank reply with no reasoning still fails as `empty`.
- [ ] `npm run check` exit 0; `bash corpus/lint.sh` OK.
- [ ] End move `ready_for_deploy` (server only).

## Owner steps

None beyond the deploy. No live call is needed: the stub proves it.

## Owner decisions

- Settled 2026-11-25 (owner): promote it.
- Mine (technical): the kind name `thinking-only`, the fixed message, no fallback, and no change to the API
  contract unless the check in the last decision finds an enum.
