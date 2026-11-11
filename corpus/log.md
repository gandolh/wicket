# Log

## [2026-11-04] decision | Design settled in a grill with the owner

Wicket is one service on the VPS that every app uses for LLM calls: it holds
the Ollama key, queues calls first come first served, and runs one at a time,
on Ollama Cloud first and a small backup model on the box when the cloud
fails. Tickets and now serving, an in-memory queue, records with counts and
timings only, a queue page with force close and clear queue, sign-in like
brief-board, per-app tokens, `/wicket` and `/wicket-api` on port 8808, and a
loopback-only `/metrics`. See [wiki/decisions.md](wiki/decisions.md) and the
contract in [wiki/api.md](wiki/api.md).

## [2026-11-04] todo | Corpus bootstrapped, briefs 01 to 05 filed

Wrote the wiki spine (overview, architecture as planned, decisions, glossary,
the API contract, status, open questions) and five briefs: the queue and jobs
API, the providers, sign-in with the admin routes and metrics, the queue page,
and the containers with the owner's setup. Details the build picked on its own
(one secret for the app tokens, a 200-job cap, answers kept 10 minutes, a
strict body, records kept forever) wait for the owner in
[wiki/open-questions.md](wiki/open-questions.md). Filed the todo to score the
backup model on a quiet machine.

## [2026-11-04] done | Brief 01: the queue, the jobs API, app tokens and records

The `shared` and `server` workspaces on brief-board's pins (zod moved to the
patched 4.6.7). One in-memory queue runs one job at a time in ticket order,
with cancel, force close, clear, a 200-job cap and long-polling; the job routes
take per-app tokens from `WICKET_APP_TOKENS`; records keep counts and timings
only, proved by a test that searches every table, the raw file and a
trace-level log for the prompt and the answer. No provider yet. See
[briefs/done/01-queue-and-jobs-api.md](briefs/done/01-queue-and-jobs-api.md).

## [2026-11-04] done | Brief 02: the cloud, the backup, and falling back

The runner asks Ollama Cloud (`gpt-oss:120b`) and, on any failure but a
cancel, the backup Ollama (`gemma3:1b`, keep-alive `1m`); with no key it goes
straight to the backup. A cancel is told from a timeout by which signal fired,
so a force close never falls back. Tested against stub servers, and once by
hand against a local `llama3.2:1b`. See
[wiki/providers.md](wiki/providers.md) and
[briefs/done/02-cloud-and-backup-providers.md](briefs/done/02-cloud-and-backup-providers.md).

## [2026-11-04] done | Brief 03: sign-in, the admin routes, and /metrics

ward-auth 0.7.0 vendored into `server/vendor/ward` with the Ward repo's own
script (no change in that repo). Sessions guard `/v1/queue` (force close,
clear) and `/v1/records`; app tokens guard `/v1/jobs`, and neither opens the
other's routes. Unlike brief-board, sessions may write, with an Origin check
on the two POSTs. `/metrics` serves Prometheus text and is refused through a
proxy. See [wiki/sign-in.md](wiki/sign-in.md) and
[briefs/done/03-sign-in-admin-routes-and-metrics.md](briefs/done/03-sign-in-admin-routes-and-metrics.md).

## [2026-11-04] done | Brief 04: the queue page

The React page at `/wicket/` behind brief-board's sign-in shell: now serving,
the running call with Force close, the waiting tickets with Clear queue (both
behind a Base UI confirm dialog), calls per app for 24 hours or 7 days, and
recent calls. The server serves the built page for `npm start`. Walked through
in a browser against a stand-in Ollama: both buttons ended the callers' jobs as
`cancelled`. Filed a todo to move `@fastify/static` to 10.1.9 once it is two
weeks old. See [briefs/done/04-the-queue-page.md](briefs/done/04-the-queue-page.md).

## [2026-11-04] done | Brief 05: the containers, the owner's setup, the README

`infrastructure/` holds the API's Dockerfile and a compose file with the
backup `wicket-ollama` (`ollama/ollama:0.24.0`, 1300 MB, one core, keep-alive
1m); neither was built, since Docker wasn't reachable. `docs/owner-setup.md`
is everything the vps-deploy stack needs (ports, routes, env and secret names,
the backup's caps, the model pull, the Prometheus scrape) and the owner's
steps; the README follows brief-board's shape. All five briefs are done. See
[briefs/done/05-container-and-owner-setup.md](briefs/done/05-container-and-owner-setup.md).

## [2026-11-04] decision | The owner keeps the six calls the first build made

The owner kept all six calls from [wiki/open-questions.md](wiki/open-questions.md),
which is empty again:

- **The app tokens in one secret**, `WICKET_APP_TOKENS=app=token,...`, rather
  than hashed tokens minted into SQLite. Now a decision.
- **At most 200 waiting calls**, the 201st answered `503 queue_full`, rather
  than no cap or a cap per app. Now a decision; already in the contract.
- **A strict request body**: an unknown field is a 400. Now a decision;
  already in the contract.
- **Answers kept 10 minutes** in memory after a job ends. Easy to change and
  already in [wiki/api.md](wiki/api.md), so not a decision.
- **Records kept forever**, no pruning. Easy to add later, so not a decision;
  noted in [wiki/architecture.md](wiki/architecture.md).
- **The backup's context length** stays at Ollama's default until the scoring
  todo measures real listings; noted in [wiki/providers.md](wiki/providers.md).
  The todo stays open for a quiet machine.

## [2026-11-04] done | Brief 06: the images build and run locally

Docker Desktop answered, so both images were built and run together for the
first time, as the compose project `wicket-smoke`, with a new local override
that reuses the machine's own Ollama model store read-only instead of pulling
a model. Health, a seeded dummy account, a call answered by the backup with
`backup: true`, Clear queue and Force close from the page, and `/metrics` all
passed; nothing in the images had to change. Measured: the API image 206 MB
and about 40-50 MB of memory; the upstream Ollama image 6.55 GB, mostly GPU
libraries, now an open question. "Sign in with Ward" wasn't walked: Ward's
local seed hadn't been run. Filed brief 07 (README, docs, docs site). See
[briefs/done/06-images-build-and-run-locally.md](briefs/done/06-images-build-and-run-locally.md).

## [2026-11-04] done | Brief 07: README, docs/ and a docs site

The README follows the estate's standard with captures from brief 06's
container run (a throwaway account, dummy calls); `docs/` gained
getting-started, an architecture page with a diagram, and an index;
owner-setup's local-development section moved into getting-started and it
gained the docs stack step. `docs-site/` is a Docusaurus site over the wiki
and `docs/`, with TypeDoc over `shared`, built once with `npm run docs`. It is
a separate package with its own lockfile rather than a workspace, so the API
image's build stays as checked (an open question). Deploying it waits for a
docs stack in vps-deploy. See
[briefs/done/07-readme-docs-and-docs-site.md](briefs/done/07-readme-docs-and-docs-site.md).

## [2026-11-04] decision | Ollama Cloud only: the backup model is dropped

Shown that the official `ollama/ollama` image is 6.55 GB and the VPS had
7.1 GB free of 38 GB, the owner answered: "ollama cloud only, drop any ollama
local briefs or idea". Rejected: a slim CPU-only image of our own, and the
official image once vps-deploy frees 3.9 GB. The two backup decisions are
marked superseded in [wiki/decisions.md](wiki/decisions.md), the open
question about the image's size is closed, and the todo to score gemma3:1b
is deleted.

## [2026-11-04] done | Brief 08: Wicket uses Ollama Cloud only

The backup provider, its settings and the fallback are gone. A cloud failure,
or a missing key, ends the job `failed` with the reason and the next ticket
runs. `result` is `{ text, model }`; the provider left the records (a new
migration drops the column), the metrics and the page. The compose file has
one service, `wicket-api`; the image rebuilt and ran with no key, and a job
failed with the no-key reason. The docs and captures follow (the captures
against a loopback stand-in for the cloud). See
[briefs/done/08-ollama-cloud-only.md](briefs/done/08-ollama-cloud-only.md).

## [2026-11-06] todo | Brief 09: @fastify/static to 10.1.9, not before 2026-11-18

Promoted from the todo `update-fastify-static` at the owner's ask, with a
start date: 10.1.9 came out on 2026-11-04 and waits until 2026-11-18.
brief-board gets the same bump as a brief of its own.

## [2026-11-09] brief | Brief 09 built early: @fastify/static 10.1.10

The owner lifted the 2026-11-18 date gate on 2026-11-09 and chose 10.1.10, the
version brief-board ships. Pinned exactly; `glob` moved to 14.0.4 and the
GHSA-3g3m-2fjr-6pw4 finding is gone. 86 tests pass. `npm audit` still shows 10
moderate findings in the dev-only `typescript-eslint` chain. Not deployed. See
[briefs/done/09-fastify-static-moves-to-10-1-9.md](briefs/done/09-fastify-static-moves-to-10-1-9.md).

## [2026-11-10] todo | Briefs 10-13: the owner's three calls of 2026-11-09, as four briefs

The owner decided on 2026-11-09 that every web app gets Base UI 1.9.0, is
styled with Tailwind v4 as a whole, and has its conventions enforced in the
repo. Four briefs, in order: 10 the house style and the quality harness
(Wicket is the proof run for the skills library's house-style brief; Prettier
churn 0.8% of lines at width 130, 58 non-null assertions of which 51 are in
tests, 5 typed-lint findings of which 4 are false); 11 Base UI by the
conventions (one wrapper to move, one native select to decide; no version bump
is needed, the pin and the lockfile are already 1.9.0); 12 the web app to
Tailwind (544 lines of CSS, and the token names Wicket, the-board and lantern
share); 13 the server in the code structure (nine routes, `server.ts`,
feature folders, route and response schemas). Findings that change the
estate's assumptions are in each brief: a declared 401 response schema turns
the Ward guard's reply into a 500, `connectionTimeout` cuts a long poll, and
the code-structure checker's pattern misses parsing done through a helper.
Nothing was changed outside `corpus/`.

## [2026-11-10] brief | Briefs 10-13 revised to the owner's answers; brief 14 added

The owner's grilling of 2026-11-10 answered the open questions the briefs were
built on. Brief 10: `house-style` is vendored (no git dependency, so the
Dockerfile is untouched), Prettier width 120 (68 lines in 20 files, the
one-off reformat), `!` is an error in source and a warning in tests (no `nth`
helper). Brief 11: the period filter becomes a `RadioGroup` and jsdom comes in
for `ConfirmDialog`, the one wrapper with logic. Brief 12: token names
`page`, `surface`, `ink`, `accent`, `line`, `danger` (no `bg-bg`), a Light /
Dark / System switch on `data-theme` (light first), the 14 px on `body`,
`max-sm:` for the phone, "close enough" parity. Brief 13: the start command is
Wicket's own (Q1), the three test decorators go (plugin options instead), and
the 25 s long poll keeps its `connectionTimeout` of 35 s. Brief 14 is new: a
redesign with Hallmark on the estate board. Work happens on `main`, with no
PRs. Nothing was changed outside `corpus/`.

## [2026-11-11] done | Brief 10: the house style and the quality harness

Wicket is the first repo on the house-style harness, the proof run for the
skills library's brief 27. The `house-style` configs are vendored at 1.0.0
(`vendor/house-style/`, `npm run house-style:sync`) with their twelve tools
pinned; Prettier at width 120 reformatted 68 lines in 20 files in one commit,
listed in `.git-blame-ignore-revs`; `verbatimModuleSyntax` and
`erasableSyntaxOnly` are on (three parameter properties became fields); the
house ESLint config with its six typed rules found 13 errors, all fixed or
lowered as decided. `npm run check` (about 19 s) and `npm run check:fast`
(about 6 s) are the gate; `check:conventions` runs knip, dependency-cruiser
(here rather than in brief 13, the controller's call) and the two
house-style checkers, both `--warn-only` until briefs 12 and 13. A root
`CLAUDE.md` holds the commands and the hard rules moved out of
`corpus/CLAUDE.md`, and `.claude/rules/` the area rules. Re-measured at
`e3b32f6`: the brief's counts held, except a fifth `process.env` read
(`docs/images/stand-in-cloud.mjs:14`). Against the brief's scratch config, brief 27's final
config needs no `allowDefaultProject` (tool configs and JavaScript lint
untyped), turns `vitest/no-conditional-expect` off (so the brief's two test
findings vanish), and adds `no-explicit-any`, `ban-ts-comment` and
`no-warning-comments` with `location: "start"`, none of which finds anything
here. The reformat's `git diff -w` is not
empty (rewrapped lines); the esbuild bundle compare differs in one file,
`web/src/QueuePage.tsx`, with the same rendered text. Ten findings went back
to brief 27. Not pushed or deployed. See
[briefs/done/10-the-house-style-harness.md](briefs/done/10-the-house-style-harness.md).

## [2026-11-11] done | Brief 11: Base UI by the conventions

`ConfirmAction` moved to `web/src/components/ui/ConfirmDialog.tsx` with
`initialFocus` on Cancel; the period `<select>` became a segmented Base UI
`RadioGroup` (`components/ui/RadioGroup.tsx`, props general for brief 12's
theme control); `ConfirmDialog` has a jsdom test (`jsdom` and Testing Library,
pinned). `check-base-ui` strict reports 0 for rules 1, 2, 3, 9, 10 and 11;
rule 5 (the plain stylesheet) is brief 12's. The decision on the filter is in
[wiki/decisions.md](wiki/decisions.md). A Playwright pass against stubbed
queue data showed no visible change but the filter. Not pushed or deployed. See
[briefs/done/11-base-ui-by-the-conventions.md](briefs/done/11-base-ui-by-the-conventions.md).

## [2026-11-11] done | Brief 13: the server in the code structure

The server follows the skills library's code-structure skill. `index.ts` became `server.ts`, the only file that listens: it loads `.env` and the settings through `config.ts`, builds the app with the logger, `trustProxy` (loopback plus `AUTH_TRUSTED_PROXIES`) and the timeouts, and wires close-with-grace. `connectionTimeout` is 35 s, above the 25 s long poll. `buildApp(config, options)` registers the zod compilers, then the error, auth and app-tokens plugins, the features `health`, `metrics`, `jobs`, `queue` and `records`, then the page plugin. Every route declares its zod schemas from `shared/`, with a response schema for each status its handler sends and never a 401. The three test decorators are gone; tests pass handles to `buildApp`. `check-structure` went from 21 findings to 0 and runs strict, with `GET /` excepted; dependency-cruiser fails a cross-feature import. 98 tests, 89 before.

The before-and-after comparison: 108 replies captured through `inject()` (every route in every job state, each refusal, 20 bad requests, the sign-in replies and the page's paths), compared after every step. 107 stayed byte-identical. One changed on purpose: a `POST /v1/jobs` with no body now answers `request: Invalid input: expected object, received null` where it said `received undefined`, with the same 400 and `invalid_request`. No field dropped, so the response schemas found no leak. Dropping `waitMs` from the records schema once changed the two records replies, which shows the schemas are live.

On a real socket, `?wait=25` answered after 25.0 s. A SIGTERM during a held poll first ended at close-with-grace's 5 s delay with exit 1 and nothing recorded, because the queue was cancelled in `onClose`, after Fastify waits for requests in flight; the queue now closes in `preClose`, and the poll answers `cancelled` at once. The why is in [wiki/decisions-server.md](wiki/decisions-server.md). Not pushed or deployed; the image wasn't built here (local Docker fails). See [briefs/done/13-the-server-in-the-code-structure.md](briefs/done/13-the-server-in-the-code-structure.md).
