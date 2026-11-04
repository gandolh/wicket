# Task 08: Wicket uses Ollama Cloud only

## Context

Brief 06 found that the official `ollama/ollama` image is 6.55 GB, most of
it GPU libraries, and the VPS had 7.1 GB free of 38 GB on 2026-11-04. Shown
that, the owner answered the same day: "ollama cloud only, drop any ollama
local briefs or idea". They chose this over a slim CPU-only image of our own,
and over deploying the official image once vps-deploy frees 3.9 GB.

So Wicket loses its backup model. A call goes to Ollama Cloud; when the cloud
fails, the job fails with the reason, and the queue moves on. Neither caller
is built yet (just-a-bot 14 and ro-housing 18 are still briefs, updated by the
owner's side), so dropping `backup` from the contract breaks nobody.

Depends on 01 to 07.

## Files you OWN

- `shared/src/api.ts`, `server/src/**`, `web/src/**` and their tests
- `infrastructure/docker-compose.yml`, `infrastructure/docker-compose.local.yml`,
  `infrastructure/Dockerfile` (only where it names the backup), `.env.example`
- `README.md`, `docs/`, the docs site's landing page
- `corpus/wiki/*`, `corpus/log.md`, `corpus/todos/score-the-backup-model.md`
  (delete)

## Files you must NOT touch

vps-deploy, just-a-bot, ro-housing, `wzd_auth`. The briefs in `done/` stay as
they are.

## What to do

1. **Code.** Remove the backup provider and its settings
   (`WICKET_BACKUP_*`), and the fallback. A cloud failure (an error, a
   timeout, a spent quota) ends the job `failed` with a clear `error`; with no
   `OLLAMA_API_KEY` the job fails at once with that reason. `result` becomes
   `{ text, model }`. Take the provider out of the records (a new migration),
   the metrics, the admin routes and the page. Update the tests.
2. **Containers.** Remove `wicket-ollama` from the compose file, and the model
   store and cap from the local override; drop the override if nothing is
   left in it. Rebuild the API image once, rerun a short smoke test under
   `wicket-smoke` with no key (a job ends `failed` with the cloud reason),
   tear it down. No other model check; set no key.
3. **Corpus and docs.** Record the revisit in `decisions.md` and mark the old
   backup decisions superseded. Delete the scoring todo and what points to it.
   Update the wiki pages, the README, `docs/` and owner-setup: no model pull,
   no Ollama image, no disk check. Rebuild the docs site once for broken links.

## Acceptance

- `npm run typecheck`, `npm run lint`, `npm test` pass.
- The image builds; the smoke job ends `failed` with the cloud reason.
- Nothing outside `briefs/done/` and `log.md` still describes a backup model.
- `bash corpus/lint.sh` passes; the docs site builds.

## Outcome (2026-11-04)

Wicket asks Ollama Cloud only.

- **Contract** (`shared/src/api.ts`): `result` is `{ text, model }`;
  `provider` is gone from the running job and the records, and `backup` from
  the per-app counts. The job routes are otherwise unchanged.
- **Runner** (`providers.ts`): one call to the cloud. A failure (unreachable,
  a timeout, anything but 2xx, a bad body) ends the job `failed` with "the
  cloud model ..." and the next ticket runs. With no `OLLAMA_API_KEY` the job
  fails at once with "the cloud model can't be asked: OLLAMA_API_KEY is not
  set", asking nothing (taken over sending an unauthenticated call that would
  only come back 401). The server still starts without a key and says so.
- **Settings**: `WICKET_BACKUP_*` removed; old lines in an `.env` are ignored.
- **Records**: migration 2 drops `records.provider`, so a database from
  before keeps its rows (a test builds a version-1 file and migrates it).
- **Metrics**: `wicket_jobs_total{app,outcome}`, and
  `wicket_job_wait_seconds`/`wicket_job_run_seconds` `_sum`/`_count` with no
  labels.
- **Page**: no provider badge, no "Answered by backup" or Provider column;
  the force-close dialog names the model.
- **Tests**: the provider tests rewritten for the cloud only (failures with
  their reasons, no key, a failure followed by the next ticket, cancels); the
  opt-in local-Ollama test removed with the backup. 86 tests, all run.
- **Containers**: `wicket-ollama` removed; the compose file has one service,
  `wicket-api`. The local override keeps only the data volume. The
  Dockerfile changed in comments only. The image rebuilt once (206 MB) and
  ran under `wicket-smoke` with no key: a job ended `failed` with the no-key
  reason, the next ticket ran, `/metrics` had no provider label; torn down.
  The `ollama/ollama:0.24.0` image pulled for brief 06 was removed from the
  build machine.
- **Docs**: decisions (the revisit, the two backup decisions superseded),
  providers, api, architecture, glossary, overview, open questions, status,
  the README, `docs/`, owner-setup (no model pull, no Ollama container, no
  disk check; sections renumbered, 1 to 8) and the docs site's landing and
  sidebar. The scoring todo is deleted. The captures were retaken against
  `docs/images/stand-in-cloud.mjs`, a loopback stand-in for the cloud API
  (not a model), since the old ones showed the backup; `shots.md` has the
  recipe. The architecture diagram shows the cloud only.

Checks: typecheck, lint, 86 tests, one image build and smoke run, one docs
build (no broken links), the site's typecheck.
