# Task 13: The server in the house code structure

**Depends on:**

- In Wicket: brief 10, for the gate, `eslint-plugin-n`'s `no-process-env` (from `eslint-plugin-n`) (a warning until this brief) and `.claude/rules/server.md`.
- In the owner's skills library:
  - brief 03, *A code-structure skill for the Fastify + React apps*: rules 1-11, `server-skeleton.md`, `zod-type-provider.md`, `migrating-a-server.md`, `check-structure.mjs`, and the dependency-cruiser and knip presets;
  - brief 16, *The Fastify servers adopt the code structure*: Wicket's row and the method;
  - brief 15, *Enforce the base-ui and code-structure skills in every repo*: `check-structure` runs `--warn-only` until this brief is done.
- The owner's grilling of 2026-11-10: Q1 (how vps-deploy starts the service), Q23 (`features/`), Q24 (plugin options, explicit registration), Q25 (response schemas everywhere), Q27 (the test runner), and the new questions in decisions 2, 4, 6 and 7.

**Order:** after 10. It touches no file that 11 or 12 touch except `package-lock.json`, so it may run before them, but never at the same time as either.

**Before you start:** run `brief-board guide` ([corpus/CLAUDE.md](../../CLAUDE.md)).

## Context

The owner asked on 2026-11-09 for one researched code structure, enforced in every repo. Wicket's server is flat: 11 source files, 8 test files, and `server/src/app.ts` at **404 lines**, of which 245 are one `buildApp` holding the guards, the error handler, nine routes and the page. What it already has:

- `buildApp(options)` never listens, and `index.ts` does;
- `config.ts` parses the environment once with zod, and a `ConfigError` names every bad variable;
- one error body, `{ code, message }`, parsed by the page;
- tests that drive the app with `inject()`.

What it lacks: the `server.ts` name, four stray readers of the environment, feature folders, route schemas (every request body, param and query is parsed by hand through one helper), response schemas, `fastify-plugin`, `close-with-grace` and timeouts.

### The versions (verified 2026-11-10)

- **zod 4.6.7**, one copy in `package-lock.json`. `@fastify/type-provider-zod` 1.0.3 needs `>=4.2.0`: **no zod move**.
- **fastify 5.12.7** (5.12.8 exists; not in this brief, decision 10).
- The provider declares `@fastify/swagger` `>=9.5.1` and `openapi-types` `^12.1.3` as required peers. Adding the provider, `@fastify/swagger` 9.9.3, `openapi-types` 12.1.3 and `close-with-grace` 2.5.0 to `server/package.json`, resolved with `npm install --package-lock-only` on a scratch copy of the lockfile, adds **7 packages (340 to 347) and changes none**: those four plus `json-schema-resolver` 3.0.0 (with a nested `fast-uri` 3.1.9) and `yaml` 2.9.1. `fastify-plugin` 6.0.1 is already in the lockfile. About 2.9 MB of `node_modules` (`yaml` 1.4 MB, `@fastify/swagger` 0.65 MB), all of it in the runtime image, because the peers are production dependencies. The image build wasn't run (no Docker daemon); step 1 measures it.

### The checks that pass, and the ones that don't (measured 2026-11-10, Fastify 5.12.7, provider 1.0.3, zod 4.6.7, Wicket's real `shared/` schemas in a scratch app)

- **No transform trap here.** The only `.transform()` in `shared/src/api.ts` is in `jobQuerySchema` (line 73), an input schema, which decodes fine. Every response schema (`jobViewSchema`, `queueResponseSchema`, `forceCloseResponseSchema`, `clearResponseSchema`, `recordsResponseSchema`, `healthResponseSchema`, `errorBodySchema`) is transform-free and serialised correctly. (The skills library's finding that the serializer throws on a `.transform()` still applies to any schema added later.)
- **Response schemas strip.** An extra `secretExtra` field on a 202 reply, and an extra `wait` on a 200, were dropped.
- **A declared `401` response schema turns the vendored guard's reply into a 500.** The Ward plugin answers `{ "error": "unauthorized" }` from a hook; a route with `401: errorBodySchema` (whose `code` and `message` are required) answered **500 `internal`** ("Response doesn't match the schema"); the same route with no `401` schema answered 401 with the guard's body. Wicket's `onSend` hook (`app.ts:271-283`) rewrites that body into `{ code, message }` *after* serialisation. **So no route declares a `401`.** Only statuses a handler sends itself are declared.
- **`/metrics`** with `response: { 200: z.string() }` and `reply.type("text/plain…").send(text)` kept its content type and body.
- **Validation messages** from `err.validation[0]`: `instancePath` `/messages` with message "send at least one message", `/` for a root problem, `/wait`. Mapped as `instancePath.slice(1).replaceAll("/", ".") || "request"`, they give today's `messages: send at least one message` and `request: Unrecognized key: "model"`. One text differs: a request with no body is now `request: Invalid input: expected object, received null` (was `received undefined`). No test asserts a message (`app.test.ts:121-134` checks status and `code` only).
- **`format`** (`"json"` or an object) validates through the provider.
- **`connectionTimeout` cuts a slow response.** `connectionTimeout: 2000` with a 4 s handler on a real socket: `ECONNRESET` at 2.0 s. `requestTimeout: 2000` and `keepAliveTimeout: 2000` did not (200 after 4 s). **Wicket long-polls**: `GET /v1/jobs/:id?wait=N` holds a response up to `MAX_WAIT_SECONDS` = 25 s (`shared/src/api.ts:67`). A `connectionTimeout` of 10 s, the value Almanac's brief uses, would cut every long poll past 10 s (decision 8).

### The move map: every file under `server/src/` (19: 11 source, 8 tests)

A bare name is at the root of `server/src/`; other paths are from the repo root.

| Today | Lines | Target | Note |
|---|---|---|---|
| `index.ts` | 81 | `server.ts` | The entry: `loadEnvFile()`, `loadConfig()` (a `ConfigError` to stderr, exit 1), `buildApp`, startup log lines, `close-with-grace`, `listen`. The `.env` read (lines 21-25) and the db path (line 36) move to `config.ts`. |
| `app.ts` | 404 | `app.ts` | Keeps `buildApp`, `AppOptions` (gains `server`) and the `FeatureContext` and `FEATURES` list. Everything else leaves: see below. |
| `app.test.ts`, `admin.test.ts` | 238, 223 | the same | Whole-app suites (tokens, jobs, guards, sign-in, `/metrics`, the page). They stay at the root; only imports change. Feature tests are added where this brief adds behaviour. |
| `config.ts`, `config.test.ts` | 167, 81 | the same | Gains `loadEnvFile()`, `resolveDbPath()` (`index.ts:36`, `seed.ts:67`), `loadSeedConfig()` (`seed.ts:60-61`), the constants `API_PREFIX`, `PAGE_PATH`, `SESSION_COOKIE`, `BODY_LIMIT` (from `app.ts:58-65`) and the server timeouts. `loadConfig(env)` keeps its parameter. |
| `accounts.ts` | 30 | `server/src/plugins/auth/accounts.ts` | |
| (from `app.ts:234-283`) | | `server/src/plugins/auth/index.ts` | `openAccounts`, `createWardClient`, the `wardAuth` registration with its `publicRoutes` and `isPublic`, and the `onSend` hook that rewrites the guard's 401 under `/v1`. Wrapped in `fastify-plugin`, so the hooks stay root hooks. |
| `tokens.ts`, `tokens.test.ts` | 99, 50 | `server/src/plugins/app-tokens/tokens.ts`, `tokens.test.ts` | `AppTokens`. `config.ts` imports it. |
| (from `app.ts:285-290`) | | `server/src/plugins/app-tokens/index.ts` | The `onRequest` hook for `/v1/jobs` and the `wicketApp` request decoration. **Stays a root hook** (decision 5). |
| (from `app.ts:215-229`) | | `server/src/plugins/errors.ts` | The error handler, `fail()` and the 404 handler's JSON branch. Registered first. |
| (from `app.ts:392-406`) | | `server/src/plugins/page.ts` | `@fastify/static`, the `/` redirect and the single-page fallback. Registered last. |
| `db.ts`, `db.test.ts` | 61, 37 | `server/src/db/open.ts`, `open.test.ts` | |
| `records.ts` | 107 | `server/src/features/records/store.ts` | `Records`, `JobRecord`, `StoredRecord`. |
| (from `app.ts:378-390`) | | `server/src/features/records/routes.ts`, `index.ts` | `GET /v1/records`. `index.ts` exports `Records` and the record types. |
| `queue.ts`, `queue.test.ts` | 364, 255 | `server/src/features/queue/queue.ts`, `queue.test.ts` | `Queue`, its two errors, `Runner`, `RunContext`, `QueueSnapshot`, `CANCEL_REASONS`. |
| `providers.ts`, `providers.test.ts` | 147, 248 | `server/src/features/queue/runner.ts`, `runner.test.ts` | The Ollama Cloud runner. It exists only to feed the queue, and imports only `Runner` from it. |
| (from `app.ts:360-376`) | | `server/src/features/queue/routes.ts`, `index.ts` | `GET /v1/queue`, `POST /v1/queue/running/cancel`, `POST /v1/queue/clear`, and the same-origin check on the two writes (`sameOrigin`, `app.ts:156-170`, used only here). `index.ts` exports `Queue`, the two errors, `Runner`, `createRunner`, `CloudSettings` and the snapshot types. |
| (from `app.ts:300-358`) | | `server/src/features/jobs/routes.ts` | `POST`, `GET` and `DELETE /v1/jobs`. Imports `Queue` through `../queue/index.js`. |
| `metrics.ts` | 76 | `server/src/features/metrics/metrics.ts` | `Metrics`. |
| (from `app.ts:292-300`) | | `server/src/features/metrics/routes.ts`, `index.ts` | `GET /metrics` and the `forwarded()` check (`app.ts:171-173`). |
| (from `app.ts:292`) | | `server/src/features/health/routes.ts` | `GET /v1/health`. |
| (from `app.ts:126-142`) | | `server/src/lib/paths.ts` | `stripApiPrefix`, `isUnder`, `pathOf`: pure string functions, no Fastify import. `app.test.ts:9` imports `stripApiPrefix` from here. |
| `seed.ts` | 81 | the same | A CLI; the container runs `node server/dist/seed.js` (`docs/owner-setup.md:123, 184`). Its environment reads go through `config.ts`. |
| `testing.ts` | 34 | `server/src/testing/stub-runner.ts` | `stubRunner`, `settle`, and brief 10's `nth`. The Dockerfile's `find … -name 'testing.js'` (lines 101-102) becomes a path match on `dist/testing/` (step 3). |

**Feature boundaries after the move** (rule 5: only through `index.ts`): `jobs` imports from `queue`; `metrics` from `queue` and `records`; `queue` imports the `JobRecord` type from `records`. No cycle: `records` imports nothing from the other features. `config.ts` imports `AppTokens` and `CloudSettings` (not a feature, so allowed).

Every file one folder deeper needs its relative imports updated, the vendored Ward library included: `../vendor/ward/ward-auth.js` becomes `../../../vendor/ward/ward-auth.js` from `server/src/plugins/auth/`. The Dockerfile copies `server/vendor` next to `server/dist`, so `dist/` mirrors `src/` depth and the image needs no change for it.

### Every reader of the environment

| Where | What | Afterwards |
|---|---|---|
| `index.ts:29` | `loadConfig(process.env)` | `server.ts` calls `loadConfig()`; the default parameter is `process.env` in `config.ts` |
| `index.ts:21-25`, `seed.ts:26-31` | `process.loadEnvFile(<repo>/.env)` | `loadEnvFile()` in `config.ts` |
| `seed.ts:60` | `SEED_USERNAME` | `loadSeedConfig()` in `config.ts` |
| `seed.ts:61` | `SEED_PASSWORD` | the same |
| `seed.ts:67` | `WICKET_DB`, with its own default | `resolveDbPath()`, one rule shared with the server |
| `web/vite.config.ts:46`, `docs/images/stand-in-cloud.mjs:14` | `WICKET_BASE`, `PORT` | out of scope: a build config and a doc script |

No file reads `NODE_ENV`. The Dockerfile sets `NODE_ENV=production`, which only Fastify's dependencies read.

### Every route: 9, plus the page's `/` redirect

The vendored plugin's `/auth/*` routes are generated code and out of scope. Statuses listed are those the handler sends itself; none lists a `401` (see the measurement above), and `400` is the error plugin's.

| Feature | Route | Guard | params | querystring | body | response |
|---|---|---|---|---|---|---|
| health | `GET /v1/health` | none | | | | `200` `healthResponseSchema` |
| metrics | `GET /metrics` | none; `404` when proxied | | | | `200` `z.string()` (text/plain), `404` `errorBodySchema` |
| jobs | `POST /v1/jobs` | app token | | | `jobRequestSchema` | `202` `jobViewSchema`, `503` `errorBodySchema` |
| jobs | `GET /v1/jobs/:id` | app token | `jobParamsSchema` | `jobQuerySchema` | | `200` `jobViewSchema`, `404` |
| jobs | `DELETE /v1/jobs/:id` | app token | `jobParamsSchema` | | | `200` `jobViewSchema`, `404` |
| queue | `GET /v1/queue` | session | | | | `200` `queueResponseSchema` |
| queue | `POST /v1/queue/running/cancel` | session, same origin | | | | `200` `forceCloseResponseSchema`, `403` |
| queue | `POST /v1/queue/clear` | session, same origin | | | | `200` `clearResponseSchema`, `403` |
| records | `GET /v1/records` | session | | `recordsQuerySchema` | | `200` `recordsResponseSchema` |

All schemas already exist in `shared/src/api.ts`: **`shared/` gains nothing.** `GET /` (`app.ts:393`) redirects with no body and has no schema; it is the one route listed in `scripts/conventions.json` as an exception.

**Hand parsing removed:** the `parse()` helper (`app.ts:139-148`, one `safeParse`) and its five calls, `app.ts:303, 323, 325, 346, 379`. Brief 16's table reads "hand-parse 0" for Wicket because `check-structure`'s pattern, `.parse(request.` and `.safeParse(request.`, doesn't match a helper that takes `request.body` as an argument. **The acceptance below uses a grep that does** (it counts `safeParse(` anywhere in `server/src` outside tests and `config.ts`).

### The error plugin

`server/src/plugins/errors.ts`, wrapped in `fastify-plugin`, registered first. It **keeps Wicket's body, `{ code, message }`** (`ErrorBody`, `shared/src/api.ts:85`), which the page and the callers parse (decision 4). The handler, in order:

1. `hasZodFastifySchemaValidationErrors(error)` → 400 `invalid_request`, message from the first issue as mapped above. **Never the value**: the message comes from `validation[0].message` and `instancePath` only.
2. `isResponseSerializationError(error)` → 500 `internal`, "Wicket hit an error; see its log". The log line carries `{ name, code }` and the method and URL, **never `error.cause` or details**, which could hold an answer's text (`result.text`).
3. Fastify's own 4xx, exactly as `app.ts:215-229` maps them today (bad JSON, body too large, wrong media type), never quoting the body.
4. Anything else → 500 `internal`, logged as today with `{ name, code }`.

The 404 handler stays, in `server/src/plugins/page.ts`, with its single-page fallback.

### The `server.ts` / `app.ts` split

`server.ts`: `loadEnvFile()` and `loadConfig()`, then `buildApp({ …, logger: true, server })`, the startup log lines (`index.ts:54-62`), `close-with-grace`, `listen`. `app.ts` registers in a fixed order: errors; the provider's compilers (`setValidatorCompiler`, `setSerializerCompiler`); `server/src/plugins/auth`; `server/src/plugins/app-tokens`; the features (`health`, `metrics`, `jobs`, `queue`, `records`); `server/src/plugins/page`. That is today's hook order (guard, then token check), with the page last.

`AppOptions` stays: it already carries what the tests need (`dbPath: ":memory:"`, `run`, `now`, `maxWaiting`). It gains `server?: FastifyServerOptions` for the timeouts and `trustProxy` (decision 8). `buildApp` keeps returning the Fastify instance.

**Renaming the entry moves the built file** from `server/dist/index.js` to `server/dist/server.js`. These name it:

- `infrastructure/Dockerfile:114`: `CMD ["node", "server/dist/index.js"]`;
- the root `package.json:18`: `start`;
- `server/package.json`: `main` (line 7), `dev` (`tsx watch src/index.ts`, line 10), `start` (line 11).

`infrastructure/docker-compose.yml` has no `command:`, so the Dockerfile's `CMD` is what runs on the VPS. That answers Q1 for Wicket on the evidence in this repo; vps-deploy's `wicket` stack wasn't readable here, so the step that checks its compose invocation is an owner step (decision 6).

### Test impact

- 8 test files, 86 tests, `pool: "forks"`. `inject()` is called 30 times, in `app.test.ts` and `admin.test.ts`.
- Imports to update: the two suites (`./app.js`, `./testing.js`, `./tokens.js`, `./accounts.js`), `queue.test.ts`, `providers.test.ts`, `db.test.ts`, `config.test.ts`, `tokens.test.ts`.
- **The three test decorators** (`app.queue`, `app.records`, `app.accounts`, `app.ts:109-120`): `app.records` is read once (`app.test.ts:195`), `app.accounts` once (`admin.test.ts:35`), and **`app.queue` never**. Decision 7.
- New tests: a 400 names the field and never echoes a value (a bad body whose `content` is `PROMPT-…`); a response schema strips an extra field (the `records` feature on a bare Fastify instance with a stand-in context whose rows carry an extra `prompt` field); a reply that fails its schema is a 500 `internal` whose body and log hold no `ANSWER-` text (the log capture `app.test.ts:169-220` already does for records); a signed-out call to every `/v1` route still gets `{ code: "unauthorized", … }` (a regression test for the 401 rule); `connectionTimeout` is above `MAX_WAIT_SECONDS * 1000` (a constants test in `config.test.ts`).

## Owner decisions (defaults this brief builds)

1. **`server/src/features/<name>/`** (Q23). Default: yes, as in the move map: `health`, `metrics`, `jobs`, `queue`, `records`. Plugins in `server/src/plugins/`, pure helpers in `lib/`.
2. **Typed plugin options and explicit registration** (Q24). Default: a `FeatureContext` built in `app.ts` (`queue`, `records`, `metrics`, `now`, `publicOrigin`), passed to each feature as its options; `FEATURES` lists them by name. Wicket has no such object today (it closes over locals in one function), so this is an addition. *New question for the grilling*: whether `ApiError`, rule 8's thrown error, is also added. Default: **no**. Wicket's handlers `return fail(reply, status, body)` and one code (`internal`) goes out as both 500 and 503 (`QueueClosedError`, `app.ts:312`), so a code-to-status table doesn't fit without carrying a status. `fail()` moves to `server/src/plugins/errors.ts`.
3. **A response schema on every route** (Q25). Default: yes, for the statuses a handler sends. No route sends pass-through JSON.
4. **The error body.** Rule 8 names `{ error, message, issues? }`; Wicket sends `{ code, message }`, which its page and its callers (just-a-bot, ro-housing) parse and the API contract page documents. Default: keep it. *New question for the grilling*: does the skill prescribe a shape or only the handler? (Almanac's brief asks the same.)
5. **The token guard stays a root hook.** Default: path-based, as today (`isUnder(path, "/v1/jobs")`), in `server/src/plugins/app-tokens`. Moving it into the `jobs` feature's scope would answer an unknown method under `/v1/jobs` (a `PATCH`) with 404 instead of 401, because the not-found handler is a root handler that never runs a feature's hooks. That is a behaviour change, so it is not made here.
6. **The entry file** (Q1). Default: rename to `server.ts` and change the Dockerfile and both `package.json` files in one commit. Owner step, handed over: check that vps-deploy's `wicket` stack starts the compose service, not a file path.
7. **The three test decorators.** Default: keep `accounts` and `records` as they are (a test seam, two uses), drop the never-read `queue`. *New question for the grilling*: whether decorators are acceptable as a test seam under rule 2, or the tests should build their own handles (`buildApp` would then need to take or return them).
8. **Timeouts and proxy.** Defaults, from the measurements above:
   - `connectionTimeout: 35_000`: above the longest idle response (25 s) with 10 s of margin. **Not 10 s.**
   - `requestTimeout: 30_000`: bounds receiving a request (bodies are at most 1 MiB, `BODY_LIMIT`); it does not bound a response.
   - `keepAliveTimeout: 125_000`, above Caddy's two-minute idle keep-alive to its upstream. Check the deploy's Caddy snippet for its own value.
   - `trustProxy`: loopback plus `AUTH_TRUSTED_PROXIES`. Wicket reads no `request.ip`; the lockout reads the socket itself and `/metrics` reads the headers, so the only effect is the request log's address.
   - `close-with-grace` with `delay: 5_000`, under compose's default 10 s stop period, so the process exits before Docker kills it. The queue's `close()` cancels what waits or runs.
   *New question for the grilling*: the skill's brief should state that `connectionTimeout` must exceed the longest idle response; it matters for Wicket's long poll, newspapper's SSE and Satchel's live socket.
9. **Logging.** Default: JSON as today, no `pino-pretty`.
10. **Fastify 5.12.8.** Default: not in this brief.

## Files you OWN

- `server/src/**`: the moves, the new plugins, the schemas wired in.
- `server/package.json` (scripts, `main`, the new dependencies pinned: `@fastify/type-provider-zod` 1.0.3, `@fastify/swagger` 9.9.3, `openapi-types` 12.1.3, `fastify-plugin` 6.0.1, `close-with-grace` 2.5.0) and `package-lock.json`.
- `infrastructure/Dockerfile`: the `CMD` line, and the `find` that deletes test code.
- The root `package.json`: `start`, and `check:conventions` (dependency-cruiser added, `check-structure`'s `--warn-only` dropped).
- `.dependency-cruiser.cjs` (new, from the skill's preset), `knip.json` (the entries).
- `eslint.config.js`: `no-process-env` (from `eslint-plugin-n`) from warning to error.
- `scripts/conventions.json`, for the `GET /` exception and any from decisions 5-7.
- `.claude/rules/server.md`: the structure lines.
- Corpus: [wiki/architecture.md](../../wiki/architecture.md) (the file list, lines 9-18), [wiki/providers.md](../../wiki/providers.md) (line 8), [wiki/sign-in.md](../../wiki/sign-in.md) (lines 11, 25, 63, 77), `docs/architecture.md` (lines 30-33), [wiki/decisions.md](../../wiki/decisions.md), [wiki/status.md](../../wiki/status.md), [log.md](../../log.md).

## Files you must NOT touch

- `web/`. A response schema that drops a field the page reads is a finding: fix the schema, not the page.
- `shared/` schemas and their behaviour.
- `server/vendor/`: generated.
- The deploy, beyond the `CMD` line. vps-deploy edits are handed to the owner.
- Behaviour: status codes, error codes, every route's JSON apart from leaks the comparison shows. The one known message change is the no-body 400 text.
- [wiki/api.md](../../wiki/api.md)'s contract: callers build against it. If a step changes anything it says, stop and tell the owner ([corpus/CLAUDE.md](../../CLAUDE.md)).

## What to do

One commit per step; after each, `npm run check` and `npm run build` pass, and `npm start` serves `GET /v1/health`.

1. **Before.** Run `check-structure` strict and record the counts by rule; expect rule 3 at 4 (the readers above), rule 11 at 1 (`app.ts`, 404 lines) and rule 6 at 9 routes with no schema. Seed a scratch `WICKET_DB` per [docs/images/shots.md](../../../docs/images/shots.md) with the stand-in cloud, post a few jobs (one `done`, one `failed`, one cancelled), and save the JSON of every route above, signed in as `demo` and with an app token. Build the image and record its size (about 210 MB per [wiki/status.md](../../wiki/status.md)).
2. **`config.ts` and the split.** The helpers in `config.ts`; `seed.ts` uses them; `index.ts` becomes `server.ts` with `close-with-grace`, the timeouts and `trustProxy`; the constants move. `no-process-env` (from `eslint-plugin-n`) now finds nothing: make it an error.
3. **Plugins.** `server/src/plugins/errors.ts`, `server/src/plugins/auth/`, `server/src/plugins/app-tokens/`, `server/src/plugins/page.ts`, `server/src/lib/paths.ts`, the `testing/` folder, and the Dockerfile's `find`. Every test passes unchanged.
4. **Feature folders**, `git mv` file by file per the map, with the `index.ts` files. Add `.dependency-cruiser.cjs`, and check that a deliberate import of `server/src/features/queue/queue.js` from `server/src/features/jobs/` fails it.
5. **The type provider and the schemas, one feature per commit:** health, metrics, records, queue, jobs. Each commit declares params, querystring, body and the response statuses above, removes that route's `parse()` call, types the plugin as `FastifyPluginAsyncZod<FeatureContext>`, and adds the tests that apply. Delete `parse()` with the last one.
6. **After.** Save the same JSON again and diff against step 1. A field that disappeared is a leak (keep it dropped and list it) or a missing schema field (add it). Put the summary in the `log.md` entry.
7. **Strict.** Drop `check-structure`'s `--warn-only` and make dependency-cruiser part of `check:conventions`.
8. **Corpus.**
   - Revisit [wiki/decisions.md](../../wiki/decisions.md), **"A Fastify API and a React page, built like brief-board"**: the server is grouped by feature, by the owner's call of 2026-11-09. The three workspaces and the vendored auth are unchanged.
   - Add an entry adopting the structure, with what was rejected (autoload, TypeBox, decorators for the repositories) and why, and the long-poll rule for `connectionTimeout`.
   - Update the pages above, `.claude/rules/server.md`, status and log. Run `bash corpus/lint.sh` until it is clean.

## Acceptance

- [ ] `check-structure` passes **strict**, with any exception in `scripts/conventions.json` and its reason. Counts before and after are in the outcome note, for the skills library's brief 16 table.
- [ ] `grep -rn "safeParse(" server/src --include=*.ts | grep -v "\.test\.ts\|config\.ts"` prints nothing. Every route in the table has a `schema` with a `response`, except `GET /`.
- [ ] `grep -rn "process\.env" server/src --include=*.ts | grep -v "\.test\.ts"` prints only `config.ts`, and `no-process-env` (from `eslint-plugin-n`) is an error.
- [ ] No route declares a `401` response: `grep -rnE "401\s*:" server/src/features` prints nothing, and the regression test passes.
- [ ] The five new tests pass, with every existing one unchanged, including the privacy tests (`app.test.ts:169-220`): no prompt or answer text in the database, in a log, or in an error body.
- [ ] A real-socket check: a `GET /v1/jobs/:id?wait=25` against `npm start` with nothing happening returns after about 25 s, not a reset (the step-1 JSON run includes it).
- [ ] The before and after JSON comparison is in `log.md`, with every dropped field named.
- [ ] `npm run build` writes `server/dist/server.js`. `docker build -f infrastructure/Dockerfile .` succeeds, the container answers its health check, and the image size is recorded against step 1's. The vps-deploy step is handed to the owner as exact commands.
- [ ] dependency-cruiser fails on a deliberate cross-feature import and passes clean.
- [ ] `npm run check` passes, and `bash corpus/lint.sh` ends clean.

## Interplay

- If brief 10's knip run calls `server/package.json`'s `main` unused, step 2 has one line fewer to change.
- The skills library should hear about the `401` finding, the `connectionTimeout` finding and the helper-wrapped-parse blind spot before the other servers run its brief 16: the first applies to every repo on the vendored Ward plugin, the second to every server with long-lived responses, the third to any repo that parses through a helper.
