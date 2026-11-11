---
summary: Why Wicket's server is laid out as it is since 2026-11-11 (brief 13). The skills library's code structure (server.ts listens, app.ts builds, config.ts the one reader of the environment, fastify-plugin plugins, features used through their index, zod route schemas with a response schema per status), and what it rejected (autoload, TypeBox, decorators as dependencies or test seams, an ApiError class); the long-poll rule for connectionTimeout (35 s over a 25 s wait) and the other timeouts; the token guard kept a root hook, and no route declaring a 401. Read before moving a route, adding a feature or changing a timeout.
updated: 2026-11-11
---

# Decisions: the server's layout

The server-structure entries, split from [decisions.md](decisions.md), which
was at its length limit. The same rules hold: each entry is hard to reverse,
surprising without context, and a real trade-off, and changing one needs an
explicit revisit and a `log.md` entry. The layout itself is described in
[architecture.md](architecture.md) ("The server's layout").

## The server in the house code structure
_2026-11-09_, the owner's call (one researched code structure, enforced in
every repo), with the technical calls of the 2026-11-10 grilling; built
2026-11-11. The server follows the skills library's code-structure skill:
`server.ts` is the only file that listens; `app.ts` builds the app from the
parsed `Config` and registers by name, in a fixed order; `config.ts` is the
only reader of `process.env`; the error handler, the two guards and the page
are plugins wrapped in `fastify-plugin`; the routes live in
`features/<name>/`, each used through its `index.ts` and naming what it takes
from the `FeatureContext` in its own options type; every route declares its
zod schemas from `shared/` through `@fastify/type-provider-zod`, with a
response schema for each status its handler sends. `check-structure` (strict)
and dependency-cruiser hold it. Rejected:

- `@fastify/autoload`, which hides the registration order in the file
  system; a feature registered by name is found with grep and keeps its
  option types.
- TypeBox, a second schema library: the contract is zod in `shared/`, and
  the page parses replies with the same schemas.
- Decorators for the queue, the records and the accounts: global, and typed
  only by a `declare module`. Tests pass their own handles to `buildApp`
  instead. The request's `wicketApp` stays, because it is request-scoped.
- An `ApiError` class with a code-to-status table: the handlers answer with
  `fail(reply, status, { code, message })`, and one code, `internal`, goes
  out as a 500 and as the 503 of a restart, which such a table can't say.

## A socket may stay silent longer than the longest long poll
_2026-11-10_, measured; built 2026-11-11. `connectionTimeout` is the
socket's idle timeout: with it at 2 s, a 4 s response was cut
(`ECONNRESET`), while `requestTimeout` and `keepAliveTimeout` at 2 s were
not. `GET /v1/jobs/:id?wait=N` holds a silent response for up to 25 s
(`MAX_WAIT_SECONDS`), so `connectionTimeout` is **35 s**, the longest wait
plus 10 s, and a test in `config.test.ts` keeps it above the wait. A real
socket answered `?wait=25` with 200 after 25.0 s on 2026-11-11. Beside it:
`requestTimeout` 30 s (receiving a request; bodies are at most 1 MiB),
`keepAliveTimeout` 125 s (above Caddy's two-minute idle keep-alive to its
upstream), `close-with-grace` with a 5 s delay (under compose's default 10 s
stop period), and `trustProxy` as loopback plus `AUTH_TRUSTED_PROXIES` (only
the request log's address changes: Wicket reads no `request.ip`). Rejected:
the 10 s other servers use, which would cut every long poll past 10 s; and
Fastify's default of no limit.

## The token guard stays a root hook, and no route declares a 401
_2026-11-10_, the brief's defaults and a measurement; built 2026-11-11. The
token check is an `onRequest` hook on the path `/v1/jobs`, registered at the
root by the app-tokens plugin, as before. Rejected: a hook inside the jobs
feature, which would answer a method no route has under `/v1/jobs` (a
`PATCH`) with 404 instead of 401, because the root's not-found handler never
runs a feature's hooks. No route declares a 401 response schema either: the
session guard answers `{ error: "unauthorized" }` from a hook, and the auth
plugin rewrites it into `{ code, message }` after serialisation, so a
declared 401 would refuse the guard's body and turn the reply into a 500
(measured on 2026-11-10). A test calls every signed-out `/v1` route.
