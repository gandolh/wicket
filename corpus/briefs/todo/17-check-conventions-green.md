# Task 17: Make `npm run check` green again

**Before you start:** run `brief-board guide` ([corpus/CLAUDE.md](../../CLAUDE.md)).

Promoted 2026-11-24 from [the todo](../../todos/check-conventions-is-red.md).

## Context

`npm run check` fails in `check:conventions`: knip reports an unused file, `design/estate-redesign/manifests/wicket.tokens.css`
(the redesign board's copy of 2026-11-20, reference material, not code), and six exports nothing imports. Brief 16 did
not cause it; the failure shows with its changes stashed.

## Files you OWN

- `knip.config.js` (the todo says `.ts`; the file is `.js`)
- `web/e2e/fixtures.ts`, `web/src/api.ts`, `web/src/auth.ts`, `web/src/route.ts`, `web/src/components/ui/RadioGroup.tsx`

## Steps

1. Add `design/**` to knip's `ignore`, beside `docs-site/**`.
2. For each unused export (`NOW`, `Unauthorized`, `AUTH_BASE_PATH`, `authClient`, `pageOf`, `RadioOption`), find with
   `git log -S` and grep whether it lost its last importer or was never imported. Drop the `export` keyword if the file
   still uses it; delete the code if nothing does. `Unauthorized` is also matched by name string in `QueuePage.tsx` and
   `usePolling.ts`: check those before changing it.
3. No behaviour change: the web tests pass unchanged.

## Acceptance

- `npm run check` exits 0.
- `bash corpus/lint.sh` exits 0.
