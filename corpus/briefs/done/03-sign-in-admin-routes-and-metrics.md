# Task 03: Sign-in, the admin routes, and /metrics

## Context

The page (brief 04) needs a signed-in session and three admin routes; Grafana
needs `/metrics`. Sign-in is copied from brief-board: read its
`corpus/wiki/sign-in.md` and `server/src/{app,config,accounts,seed}.ts`. Two
differences from brief-board: sessions may write here (force close and clear
queue are POSTs), and app tokens guard the job routes, not the sign-in
plugin.

Depends on 01.

## Files you OWN

- `server/vendor/ward/` (new), copied with the Ward repo's vendoring script:
  `npm run vendor -- <absolute path to this repo>/server/vendor/ward`, run
  from `wzd_auth/shared-library`. Change nothing in `wzd_auth`; check
  `git status` there afterwards. If the script needs an install there, copy
  brief-board's `server/vendor/ward` (the same 0.7.0 build) instead and say so.
- `server/src/app.ts`, `server/src/config.ts`, `server/src/index.ts`,
  `server/src/accounts.ts` (new), `server/src/seed.ts` (new),
  `server/src/metrics.ts` (new), `server/package.json` (a `seed` script), and
  their tests
- `shared/src/api.ts` (the admin answers)
- `.env.example`, `eslint.config.js` (ignore `**/vendor/**`)
- `corpus/wiki/sign-in.md` (new), `corpus/wiki/architecture.md`,
  `corpus/wiki/status.md`, `corpus/log.md`

## What to do

1. **The sign-in guard.** Register `wardAuth` before any route: cookie
   `wicket_session`, cookie path `/wicket-api` (from `WICKET_API_PREFIX`),
   routes under `/auth`, `allowRename: false`, `loginPath`
   `/wicket/login`, `settingsPath` `/wicket/account`, `afterSignInPath`
   `/wicket/`. `isPublic`: `/v1/jobs*` (the token check decides),
   `/v1/health`, `/metrics`, and paths outside `/v1` and `/auth` (the page).
   Everything else under `/v1` needs a session. No sign-up route.
2. **Tokens stay off the admin routes.** A bearer token on `/v1/queue*` or
   `/v1/records` doesn't help; a session on `/v1/jobs*` gets 401. Admin POSTs
   also refuse a browser `Origin` or `Sec-Fetch-Site` that isn't this origin
   (on top of the cookie's `SameSite=Lax`).
3. **Admin routes.** `GET /v1/queue` (now serving, the running job with id,
   app, ticket, provider, model and start time, the waiting jobs with id, app,
   ticket and join time), `POST /v1/queue/running/cancel` (`{ closed }`),
   `POST /v1/queue/clear` (`{ cleared }`), and `GET /v1/records?limit=` (the
   newest records, at most 200, and counts per app by outcome and provider for
   the last 24 hours and the last 7 days). A 401 under `/v1` is rewritten into
   `{ code, message }`, as brief-board does under `/api`.
4. **Accounts and seed.** `accounts.ts` and `seed.ts` as brief-board's: one
   role, `SEED_USERNAME`/`SEED_PASSWORD` or a prompt, an existing user left
   alone, `npm run seed -w @wicket/server` and `node server/dist/seed.js`.
5. **Config.** `PUBLIC_ORIGIN` (default the Vite dev server,
   `http://localhost:5179`), `WICKET_API_PREFIX` (`/wicket-api`), `WICKET_BASE`
   (`/wicket/`), `AUTH_TRUSTED_PROXIES`, the five `WARD_OIDC_*` read by the
   library's reader, the redirect URI checked against
   `<origin>/wicket-api/auth/ward/callback`. A bad value names the variable.
6. **`/metrics`.** Hand-written Prometheus text, no dependency:
   `wicket_queue_waiting`, `wicket_queue_running`,
   `wicket_jobs_total{app,outcome,provider}` since start, and wait and run
   seconds as `_sum`/`_count` per provider. Refused with 404 when the request
   carries `X-Forwarded-For` (it came through Caddy).
7. **`corpus/wiki/sign-in.md`.** The guard, the two families of routes, why
   sessions may write here, the Origin check, `/metrics` and the proxy rule.

## Acceptance

- `npm run typecheck`, `npm run lint` and `npm test` pass.
- Tests: signed out, `/v1/queue` is 401; a local sign-in reads it and can
  force close and clear (a stub runner's signal is aborted; the waiting jobs
  end `cancelled`); a cross-site `Origin` on an admin POST is refused; an app
  token on `/v1/queue` is 401; a session on `POST /v1/jobs` is 401;
  `/v1/health` is open; `/metrics` answers bare and is 404 with
  `X-Forwarded-For`; the rename route is gone.
- `wzd_auth` has no changes.
- `bash corpus/lint.sh` passes.

## Outcome (2026-11-04)

Built as specified; how it works is in [sign-in.md](../../wiki/sign-in.md).

- **Vendoring.** Wicket's `server/vendor/ward/` came from the Ward repo's
  `npm run vendor` (ward-auth 0.7.0). It is byte-identical to brief-board's
  copy, and `git status` in `wzd_auth` showed no change afterwards. The
  generated headers name the library's GitHub repository and the LICENSE its
  author, as the upstream attribution; vendored files are never edited.
- **`GET /v1/queue`** also answers `serverTime`, so the page ticks the
  running call's elapsed time on the server's clock.
- **`GET /v1/records`** counts per app: `total`, `ok`, `failed`,
  `cancelled` and `backup` (how many the backup answered), for the last 24
  hours and 7 days.
- **`/metrics`** is also refused with a `Forwarded` header, and through
  `/wicket-api/metrics`.
- Signed out, an unknown `/auth` route (a `register`) is a 401; signed in,
  a 404. Either way there is no sign-up.

Checks: `npm run typecheck`, `npm run lint`, `npm test` (6 files, 79 tests,
1 skipped: 13 for the admin routes, sign-in and metrics, 3 for the sign-in
settings). The seed ran twice against a scratch database: it created the user,
then left it alone. A Ward sign-in was not tried: Wicket isn't in Ward's local
seed yet (an owner step).
