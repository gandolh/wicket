# Task 06: The images build and run locally

## Context

Brief 05 wrote `infrastructure/Dockerfile` and `infrastructure/docker-compose.yml`
but never built them: Docker wasn't reachable that day. Docker Desktop now
answers from the build machine, so build both images (`wicket-api` from the
Dockerfile, and the pinned `ollama/ollama` image for `wicket-ollama`), run the
stack, and walk it end to end before anyone deploys it. Whatever breaks gets
fixed here, in the images, the compose files or the docs.

Docker Desktop's `--network host` is its own VM, not the build machine, so the
check uses compose networks and published loopback ports only.

Depends on 01 to 05.

## Files you OWN

- `infrastructure/Dockerfile`, `infrastructure/docker-compose.yml`,
  `.dockerignore`
- A local-check override beside the compose file, if the check needs one
  (new)
- `docs/owner-setup.md`
- Server code, only where the container shows a bug
- `corpus/wiki/architecture.md`, `corpus/wiki/status.md`, `corpus/log.md`

## Files you must NOT touch

Anything in vps-deploy or `wzd_auth`. Another agent is adding Wicket to
Ward's local seed at the same time.

## What to do

1. **Build both images once** under the compose project `wicket-smoke`.
   Run `docker compose config` first.
2. **Run the stack** with no Ollama Cloud key at all, so every call goes to
   the backup. **Pull no model**: reuse a model the machine's own Ollama
   already has (`llama3.2:1b`) by mounting its model store read-only into
   the backup container, and set `WICKET_BACKUP_MODEL` to it for the trial.
   The production default stays `gemma3:1b`. Keep the data in a volume the
   teardown removes.
3. **Smoke-test it:**
   - `GET /v1/health` answers `{"ok":true}`;
   - a local account made with the image's seed command and dummy
     credentials signs in (no password written into any file);
   - a job goes `queued` → `running` → `done` with a ticket, answered by the
     backup with `backup: true`;
   - from the page (the Vite dev server proxying to the container, as Caddy
     will), Clear queue cancels waiting jobs and Force close cancels the
     running one;
   - `GET /metrics` answers on loopback.
4. **Measure** both images' sizes, and both containers' memory at idle and
   during the job.
5. **"Sign in with Ward"**: if Ward's local seed has written the five
   `WARD_OIDC_*` lines into this repo's `.env` by then, walk it against the
   local Ward. Otherwise skip it and say so.
6. **Tear down** everything under `wicket-smoke` (containers, networks,
   volumes). Never stop or remove a container this run didn't start.
7. **Fix and document**: anything that broke, and `docs/owner-setup.md`'s
   local check where the trial shows it is wrong or incomplete.

## Acceptance

- Both images build; the stack starts healthy; every smoke step above passes,
  or the outcome says which didn't and why.
- `npm run typecheck`, `npm test` pass if any code changed.
- No secret, local path, domain, host alias or username in any file.
- `bash corpus/lint.sh` passes.

## Outcome (2026-11-04)

Both images built once and ran together as the compose project
`wicket-smoke`, with `infrastructure/docker-compose.local.yml` (new) laid over
the compose file: it mounts the machine's own Ollama model store read-only
(`OLLAMA_MODELS=/models`, `OLLAMA_NOPRUNE=1`), keeps the API's data in a
volume, and raises the backup's cap to 2500m for the trial model. No model was
pulled; `WICKET_BACKUP_MODEL=llama3.2:1b`; no `OLLAMA_API_KEY` anywhere.

- **Health**: `{"ok":true}`; both containers healthy.
- **Account**: `node server/dist/seed.js` in the container made a dummy
  account from `SEED_USERNAME`/`SEED_PASSWORD` passed to `exec -e`, nothing
  on disk; it signed in on the page.
- **A job**: ticket 1 ran at once on an empty queue and ended `done` in about
  7 s with `{"model":"llama3.2:1b","backup":true}`. Tickets 3 and 4, posted
  behind a long ticket 2, came back `queued` with positions 1 and 2.
- **The page** (Vite proxying `/wicket-api` to the container, as Caddy will):
  Clear queue ended 3 and 4 as `cancelled` ("the queue was cleared"); Force
  close ended 2 as `cancelled` ("force closed from the queue page") and the
  backup's CPU dropped to 0 at once.
- **`/metrics`**: Prometheus text on loopback; 404 with `X-Forwarded-For`.
  Through Vite's dev proxy it answers, because Vite adds no
  `X-Forwarded-For`; that proxy is local only, and Caddy adds the header.
- **Ward**: not walked. Ward's local seed lists Wicket since 2026-11-04 but
  hadn't been run, so this repo's `.env` had no `WARD_OIDC_*` values. A
  container can't use the local Ward anyway: the issuer is a `localhost`
  address, so it needs a host-run API (`npm run dev`).
- **Teardown**: `down -v --remove-orphans` removed the containers, the
  network and both volumes; `infrastructure/.env` deleted. The two images
  stay. No other container was touched.

Measured: `wicket-api:1.0` 206 MB; `ollama/ollama:0.24.0` 6.55 GB, of which
6.09 GB is GPU libraries (an open question). API memory 39-49 MiB idle and
during calls. Backup 123 MiB idle at start, 1.60-1.61 GiB with
`llama3.2:1b` loaded (Ollama loads weights without mmap: a 1252 MiB buffer),
193 MiB after the 1-minute keep-alive unloaded it. Ollama sized itself to the
cgroup limit ("total 2.4 GiB"), so the production 1300m holds gemma3:1b
(about 0.8 GB) but not a 1.3 GB model.

Nothing in the images broke. Changes: the local override (new); the
Dockerfile's toolchain comment corrected (npm 11 skips better-sqlite3's
install script as it isn't in `allowScripts`, so the prebuilt binary is what
loads); `docs/owner-setup.md` section 5 rewritten as the whole local check,
section 3 given the measured sizes and the cap note, and the Ward local seed
step shortened to running the seed. No code changed, so the tests weren't
re-run for this brief.
