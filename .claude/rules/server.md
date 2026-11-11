---
paths:
  - "server/src/**"
  - "shared/src/**"
---

# The API (`server/src`, `shared/src`)

- Read the `code-structure` skill before you add or move a route, a plugin or
  a module. The layout is in
  [corpus/wiki/architecture.md](../../corpus/wiki/architecture.md) ("The
  server's layout"), the why in
  [corpus/wiki/decisions-server.md](../../corpus/wiki/decisions-server.md).
- `server.ts` is the only file that listens; `app.ts` builds the app
  (`buildApp(config, options)`) and registers in a fixed order: the zod
  compilers, the error, auth and app-tokens plugins, the features, then the
  page plugin.
- `server/src/config.ts` is the only reader of the environment
  (`n/no-process-env` is an error elsewhere). The entry and the seed load
  `.env` and their settings through it.
- A cross-cutting plugin lives in `plugins/`, wrapped in `fastify-plugin`. A
  route lives in `features/<name>/routes.ts`, is used through the feature's
  `index.ts`, and names what it takes from the `FeatureContext` in its own
  options type; another feature is reached only through its index
  (dependency-cruiser fails otherwise). No decorators for dependencies or as
  a test seam: tests pass handles to `buildApp`.
- Every route declares its schemas through `@fastify/type-provider-zod`,
  from `shared/src/api.ts`: params, querystring and body as it takes them,
  and a response schema for each status its handler sends itself. Never a
  401: the guards answer it, and a declared 401 turns their reply into a 500.
  No handler parses its input. A changed route's replies are compared before
  and after (the bytes must not change), and it gets a test.
- **No prompt or answer text at rest, and none in a log or an error.**
  Records hold counts and timings only. The test "keep no prompt or answer
  text, in the database or the log" in `server/src/app.test.ts` proves it;
  keep it passing. A 500 is logged by the error's name and code only.
- Errors are `{ code, message }`, the `ErrorBody` of `shared/src/api.ts`,
  written by `fail()` in `plugins/errors.ts`. A 500 never echoes a thrown
  message, and a 400 names the field, never its value.
- App tokens guard `/v1/jobs` (a root hook, on the path); a signed-in session
  guards the rest of `/v1`. Neither one opens the other's routes.
- `GET /v1/health` stays open: the deploy's health check calls it.
- `connectionTimeout` stays above the 25 s long poll (35 s). Don't copy
  another server's timeouts.
- `server/vendor/` is Ward's generated library. Never edit it.
- `shared/src/api.ts` is the contract just-a-bot and ro-housing build
  against ([corpus/wiki/api.md](../../corpus/wiki/api.md)). Changing it is
  the owner's call.
- `npm run check:conventions` runs `check-structure` strict over these
  folders; an accepted finding is an exception in `scripts/conventions.json`
  with its reason.
