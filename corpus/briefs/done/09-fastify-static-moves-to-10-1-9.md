# Task 09: @fastify/static moves to 10.1.9 or later

**Not before 2026-11-18.** An agent that picks this up earlier leaves it in
To Do and says so on the ticket.

## Context

Promoted on 2026-11-06 from the todo `update-fastify-static`. `npm audit`
flags `glob` under `@fastify/static` 10.1.5 (GHSA-3g3m-2fjr-6pw4,
moderate). The fix is `@fastify/static` 10.1.9, released 2026-11-04, the day
brief 04 was built, which was too new to take; the owner chose to let it age
until 2026-11-18. Wicket isn't exposed to the bug: the static plugin uses
`glob` only with `wildcard: false`, which Wicket doesn't set, and it serves
the page only for a local `npm start` (Caddy serves it in production; the
image has no web files). brief-board pins the same 10.1.5 and has its own
brief for the same bump.

## Files you OWN

- `server/package.json` and the lockfile
- `corpus/wiki/status.md`, `corpus/log.md`

## What to do

1. Bump `@fastify/static` in `server/package.json` to the then-current
   10.1.x (10.1.9 or later), pinned exactly, and `npm install`.
2. `npm audit`: the `glob` advisory is gone; note anything new it reports.
3. `npm test` and the built-page test; check a local `npm start` still
   serves the page.
4. Commit, with the record (status, log).

## Acceptance

- `npm audit` no longer lists GHSA-3g3m-2fjr-6pw4; the tests pass.
- **Owner step:** `node cli.ts wicket all` from vps-deploy, with the next
  deploy that suits.

## Outcome

Built on 2026-11-09, early: the owner lifted the "not before 2026-11-18" gate
that day and chose 10.1.10, the version brief-board already ships, over 10.1.9.
`@fastify/static` is pinned exactly at 10.1.10 in `server/package.json`; the
lockfile moved `glob` from 13.0.6 to 14.0.4 (with `minimatch` 11.0.5 under it).
`npm audit` no longer lists GHSA-3g3m-2fjr-6pw4 or anything under `glob` or
`@fastify/static`. It reports 10 moderate findings, all in the dev-only
`typescript-eslint` chain (`minimatch`, GHSA-g3hv-75wg-m249). `npm test`: 86
passed, including the built-page test. A local `npm start` was not run (it
needs the sign-in and key settings); the tests cover the static route.
Owner step: `node cli.ts wicket all` from vps-deploy, with the next deploy that
suits.
