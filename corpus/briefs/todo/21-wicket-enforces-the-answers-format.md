# Task 21: Wicket enforces the answer's format: plain, JSON, or a JSON schema

**Before you start:** run `brief-board guide` ([corpus/CLAUDE.md](../../CLAUDE.md)).

**Depends on:** brief 19 (it adds a failure kind in the same runner function): build it first.

**Builder:** Opus: a contract change other repos read, a validator, and a retry inside one job.

## Context

The owner, 2026-11-25: "we can enforce the format on wicket tho. For consistency amongst them. Something like plain
or json as options when doing requests." Today `format` (`"json"` or a JSON schema, [api.md](../../wiki/api.md)) is
passed to Ollama Cloud as it is and the answer comes back unchecked; Ollama's cloud page says cloud models don't
support structured outputs ([brief 20](20-check-format-against-ollama-cloud.md) checks what really happens). So each
caller has to check the answer itself, as ro-housing's Fill the gaps does. Wicket should guarantee the shape instead,
the same way for every caller.

## Files you OWN

- `shared/src/api.ts` (`formatSchema`, the failure kinds if listed there)
- the runner (`server/src/features/queue/runner.ts`) and a new `server/src/features/queue/format.ts` (the instruction,
  the parse, the check), their tests against the stub
- `server/package.json` (one validator dependency, pinned exactly)
- `corpus/wiki/api.md` (`format`, `result`, `error`), `corpus/wiki/providers.md` (one line), `corpus/wiki/decisions-server.md`
  (its entry of 2026-11-25 is already there; update it if the build differs), `corpus/wiki/status.md`, `corpus/log.md`, `docs/` pages that quote `format`

## Files you must NOT touch

- Other repos. ro-housing keeps its own checks (a second layer is fine); say in the outcome that it needs no change.

## Steps

1. **The contract:** `format` is `"plain"` (new; what an absent `format` means), `"json"` (any JSON object or array),
   or a JSON schema (an object, as today). Existing callers keep working unchanged.
2. **plain:** nothing added; the answer as today.
3. **json and a schema:**
   - append one system message: answer with JSON only, no prose, no code fences, and for a schema, the schema itself;
   - keep passing `format` to Ollama Cloud (harmless if it ignores it; brief 20 tells whether it helps);
   - read the answer: trim, drop one surrounding Markdown code fence if present, `JSON.parse`, then for a schema
     validate it (ajv 8, pinned exactly, `strict: false`; compile each schema once per job);
   - on a failure, **one** retry inside the same job: the conversation plus the model's answer and a short user message
     naming what was wrong (not JSON; or the first three validation errors), asking for the answer again in the format;
   - still wrong: the job ends `failed` with a new failure kind `format_mismatch` and an error that never repeats the
     answer or the prompt ("the model's answer was not valid JSON after one retry", or "... did not match the schema
     after one retry: <first error's path and keyword>");
   - on success `result.text` is the answer re-serialised (`JSON.stringify` of the parsed value), so callers can always
     `JSON.parse` it.
4. **The retry counts:** it is a second cloud call in the same queue slot; the job's records say so (one flag or a
   count), and the time limit covers both calls.
5. **The docs:** api.md's `format`, `result` and `error` describe the above; add `format_mismatch` wherever failure kinds
   are listed. decisions-server.md has the entry already; correct it if the build differs.

## Acceptance

- [ ] `npm run check` passes. Tests against the stub: plain untouched; json with a fenced answer accepted; a prose
      answer retried once then accepted; twice wrong → `failed`/`format_mismatch` with no answer text in the error;
      a schema mismatch retried with the validation error in the retry message; a request with no `format` behaves as
      before; the request body still rejects unknown `format` strings.
- [ ] api.md matches the code (`"plain"`, the retry, `format_mismatch`, `result.text` re-serialised).
- [ ] `bash corpus/lint.sh` passes.
- [ ] End move `ready_for_deploy`; owner step `node cli.ts wicket server`, then use Fill the gaps once in ro-housing.

## Owner steps

- `node cli.ts wicket server`, then one Fill the gaps in ro-housing (it should behave as before).

## Owner decisions

- Settled 2026-11-25 (owner): Wicket enforces the format, with plain and JSON as the options, for consistency among
  callers.
- Mine (technical): a JSON schema stays accepted (ro-housing sends one; a schema is JSON plus a shape); one retry, not
  more (a second cloud call doubles the cost); ajv 8 (the standard JSON-schema validator); the answer re-serialised so
  `JSON.parse` always works.
