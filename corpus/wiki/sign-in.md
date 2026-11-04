---
summary: Who gets into which route, as built 2026-11-04. The vendored ward-auth 0.7.0 as the session guard (cookie wicket_session on /wicket-api, rename off, no sign-up); the two families of routes (app tokens for /v1/jobs, sessions for /v1/queue and /v1/records) and why neither opens the other; why sessions may write here unlike brief-board, and the Origin check on the two admin writes; the 401 rewritten into the API's error shape; /metrics refused through a proxy; accounts and the seed; the settings.
updated: 2026-11-04
---

# Sign-in

Why the page is behind sign-in and the apps use tokens is in
[decisions.md](decisions.md) ("Sign-in like brief-board, and per-app tokens
for callers"). The code wins where this page and it disagree:
[`server/src/app.ts`](../../server/src/app.ts).

## The two guards

- **The session guard** is the vendored `wardAuth` plugin
  (`server/vendor/ward/`, ward-auth 0.7.0, vendored 2026-11-04 with the Ward
  repo's `npm run vendor`; the same build brief-board carries), registered
  before any route. Cookie `wicket_session`, path `/wicket-api` (the
  browser-visible prefix, `WICKET_API_PREFIX`), `SameSite=Lax`, auth routes
  under `/auth`. `allowRename: false` turns off the library's
  `POST /auth/username`: the page offers no rename and the seed matches
  accounts by name. There is no sign-up route.
- **The token guard** is an `onRequest` hook on `/v1/jobs*`: the
  `Authorization: Bearer` token must be one app's
  ([tokens.ts](../../server/src/tokens.ts)), and the request then carries the
  app's name.

`isPublic` sends `/v1/jobs*` to the token guard alone, so a session without a
token gets 401 there. Everything else under `/v1` and `/auth` needs a session,
so an app token can't reach the admin routes. `/v1/health` and `/metrics` are
open; paths outside `/v1` and `/auth` (the page's files, a 404) are open so
the login page loads.

## Sessions may write here

brief-board refuses every session write, because a script in another app on
the shared origin could send the owner's cookie. Wicket can't: force close and
clear queue are POSTs from the page. The worst a stray script could do is
cancel calls, which their callers retry. Two defences stay:

- the cookie's `SameSite=Lax`, so another site's form can't post with it;
- `sameOrigin` on the two admin POSTs: a browser that sends `Sec-Fetch-Site`
  other than `same-origin`, or an `Origin` that isn't `PUBLIC_ORIGIN`, gets
  403 `cross_site`. A request with neither header (a script, curl) passes.

## Errors

The plugin answers a refusal with `{ error: "unauthorized" }`. An `onSend`
hook rewrites a 401 under `/v1` into the API's `{ code, message }`. The
`/auth/*` bodies stay the plugin's, for the React hooks. Signed out, an unknown
route under `/auth` (a `register`, say) is a 401, not a 404.

## /metrics

Open, but answered only on a request with no `X-Forwarded-For` or `Forwarded`
header. Caddy adds `X-Forwarded-For` to everything it forwards, and the
container is published on loopback only, so only something on the box
(Prometheus) gets the numbers. `/wicket-api/metrics` through Caddy is a 404.
The vps-deploy route should also leave `/metrics` out.

## Accounts and Ward

[`accounts.ts`](../../server/src/accounts.ts) opens the accounts on Wicket's
own SQLite file; the library keeps its `auth_*` tables and never touches the
records' `user_version`. One role, `user`, which nothing checks: every
signed-in user sees the queue and may force close or clear it.
`npm run seed -w @wicket/server` (or `node server/dist/seed.js` in the
container) makes an account from `SEED_USERNAME` and `SEED_PASSWORD`, or asks
without echo, and leaves an existing one alone.

"Sign in with Ward" turns on when `WARD_OIDC_ISSUER` and the other four
`WARD_OIDC_*` values are set; a first Ward sign-in makes a user. Without them
only local accounts work and the login page has no Ward button.

## Settings

[`config.ts`](../../server/src/config.ts) checks them at start and names each
variable at fault: a `PUBLIC_ORIGIN` with a path, Ward settings half set, a
Ward redirect URI that isn't `<origin>/wicket-api/auth/ward/callback`.
`PUBLIC_ORIGIN` defaults to the Vite dev server, `http://localhost:5179`;
`npm start` on its own port needs `http://127.0.0.1:8808`, or the plugin
refuses the login as cross-site. `AUTH_TRUSTED_PROXIES` names the peers whose
`X-Forwarded-For` the login lockout believes; in the container that is the
network Caddy reaches it from.

## Not tried yet

A Ward sign-in, locally or in production: Wicket isn't in Ward's local seed
(an owner step, [status.md](status.md)).
