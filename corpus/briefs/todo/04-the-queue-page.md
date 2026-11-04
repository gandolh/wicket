# Task 04: The queue page

## Context

The owner's view of Wicket, at `/wicket/` behind sign-in: what runs, what
waits, what happened, and the two buttons
([decisions.md](../../wiki/decisions.md), "A queue page with force close and
clear queue"). Conventional and familiar: a header, a page, plain tables. The
owner rejects metaphor-heavy navigation, so no counter-booth drawings.

Copy brief-board's web shell: `AuthGate.tsx`, `LoginPage.tsx`,
`AccountPage.tsx`, `auth.ts`, `route.ts`, `base.ts`, `messages.ts`, the 401
handling in `api.ts`, `usePolling.ts`, and `vite.config.ts`'s dev proxy, with
the names changed.

Depends on 03.

## Files you OWN

- `web/` (all of it): `index.html`, `vite.config.ts`, `tsconfig.json`,
  `package.json`, `src/`, and `web/vendor/ward/` (vendored the same way as
  brief 03's server copy)
- Root `package.json` and `tsconfig.json` only to wire the web typecheck and
  build
- `corpus/wiki/architecture.md`, `corpus/wiki/status.md`, `corpus/log.md`

## What to do

1. **Shell.** Vite dev on port 5179 (`strictPort`), preview on 4179, base
   `/wicket/` (`WICKET_BASE` moves it), the dev proxy for `/wicket-api` with
   brief-board's Origin rewrite. Login, account and sign-out pages as
   brief-board's, saying "Wicket".
2. **The queue page**, polling `GET /v1/queue` every 2 seconds and
   `GET /v1/records` every 10, paused while the tab is hidden:
   - "Now serving" with the ticket number, large.
   - The running call: app, ticket, elapsed time (ticking each second),
     Cloud or Backup, the model. "Nothing running" when idle.
   - The waiting tickets: a table with ticket, app and time waited, oldest
     first; "Nobody waiting" when empty.
   - **Force close** next to the running call and **Clear queue** above the
     waiting table, each behind a Base UI `AlertDialog` that says what
     happens to the callers. Clear queue stays enabled even with nothing
     waiting, so it is always there as the fallback.
   - Recent records: a table with time, app, ticket, Cloud or Backup, model,
     wait, run and outcome; and counts per app for the last 24 hours and 7
     days (ok, failed, cancelled, of which backup).
   - A banner when the API stops answering, keeping the last data, like
     brief-board's.
3. **Styles.** Plain CSS with tokens, light and dark from the system, like
   brief-board's `styles.css`. Works at phone width.

## Acceptance

- `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` pass.
- By hand, against a scratch database and a seeded test account with a stub
  runner or the local Ollama: `/wicket/` sends you to the login page; signing
  in shows the queue; a submitted job appears waiting, then running, then in
  the records; Force close and Clear queue work and the caller sees
  `cancelled`.
- No password or token in any file.
- `bash corpus/lint.sh` passes.
