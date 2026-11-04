# Task 05: The containers, the owner's setup, and the README

## Context

Wicket runs on the shared VPS as two containers: `wicket-api` and the backup
`wicket-ollama`. Someone else writes the vps-deploy stack, and they get only
`docs/owner-setup.md`, so everything the stack needs goes there. Deploying,
registering Ward clients, writing secrets and pulling the model are owner
steps; write the commands, run none of them. brief-board's `infrastructure/`
and `docs/owner-setup.md` are the model.

Docker may not be reachable from the build machine. Write the files; build
them only if Docker answers, and never stop a container this run didn't start.

Depends on 01 to 04.

## Files you OWN

- `infrastructure/Dockerfile`, `infrastructure/docker-compose.yml`,
  `.dockerignore` (new)
- `docs/owner-setup.md`, `docs/README.md` (new), `README.md` (new)
- `corpus/wiki/architecture.md`, `corpus/wiki/status.md`, `corpus/log.md`

## Files you must NOT touch

Anything in vps-deploy or `wzd_auth`.

## What to do

1. **Dockerfile.** brief-board's multi-stage build: `shared`, `server` and
   `server/vendor`, no web source (Caddy serves the built page). Runtime env
   `HOST=0.0.0.0`, `PORT=8808`, `WICKET_DB=/data/wicket.sqlite`, `VOLUME
   /data`, a wget health check on `/v1/health`. Root inside the container, for
   the same rootless-Docker reason brief-board gives.
2. **Compose.** `wicket-api` (image `wicket-api:1.0`, `127.0.0.1:8808`,
   `env_file: .env`, the data bind mount, `restart: unless-stopped`,
   `WICKET_BACKUP_URL=http://wicket-ollama:11434` in `environment:`) and
   `wicket-ollama` (a pinned `ollama/ollama` image, `127.0.0.1:11434`,
   `mem_limit` about 1.3 GB, `cpus: 1`, `OLLAMA_KEEP_ALIVE=1m`,
   `OLLAMA_NUM_PARALLEL=1`, `OLLAMA_MAX_LOADED_MODELS=1`, a volume for the
   models, `restart: unless-stopped`). Port overrides for a local run where
   11434 is taken.
3. **`docs/owner-setup.md`**, with `<production origin>` for the address:
   1. Register Wicket in production Ward (slug `wicket`, registration closed,
      the key pair, redirect `<production origin>/wicket-api/auth/ward/callback`,
      sign-out return `<production origin>/wicket/`).
   2. The secrets: `WARD_OIDC_CLIENT_KEY`, `OLLAMA_API_KEY` (the same key
      just-a-bot holds today) and `WICKET_APP_TOKENS`, and where each caller's
      `WICKET_TOKEN` goes.
   3. **What the vps-deploy stack needs**, as a table: port 8808, the
      `/wicket` page (built `web/dist`, base env `WICKET_BASE`, SPA fallback)
      and the `/wicket-api` route with the prefix stripped and `/metrics` left
      out, the health check, the data directory, every env and secret name,
      the Ollama container's caps, volume and port, and the Prometheus scrape
      (`127.0.0.1:8808/metrics`).
   4. Pull the backup model once: `ollama pull gemma3:1b` inside
      `wicket-ollama`.
   5. Check the container locally, deploy, the curl checks.
   6. Create your account with the seed in the container, then grant and link
      Ward, in brief-board's order.
   7. Point the callers: `WICKET_URL=<production origin>/wicket-api` and
      their own `WICKET_TOKEN`. Containers can't reach the box's loopback.
   8. Local development, including Ward's local seed entry (an owner step in
      `wzd_auth`): `{ slug: "wicket", name: "Wicket", repo: "wicket",
      envFiles: [".env"], dev: "http://localhost:5179/wicket/", api:
      "/wicket-api" }`.
4. **README.** brief-board's shape: what it is, the status line, what it
   does, how it works, run it locally, docs, licence. No screenshots yet.

## Acceptance

- `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` pass.
- `docker compose config` parses the compose file if Docker answers;
  otherwise the hand-back says it wasn't tried.
- No secret, local path, domain, host alias or username in any file.
- `bash corpus/lint.sh` passes.

## Outcome (2026-11-04)

Built as specified, except the container check: **Docker wasn't reachable**
from the build machine (no `docker` in the WSL distro), so neither image was
built and `docker compose config` wasn't run. The compose file parses as YAML.

- **Dockerfile**: brief-board's multi-stage build for `shared`, `server` and
  `server/vendor`, without the web source; it also drops the tests' stub
  runner (`testing.js`). Health check on `/v1/health`.
- **Compose**: `wicket-api` (loopback 8808, `WICKET_BACKUP_URL` pointing at
  the backup by service name, which the rootless daemon needs) and
  `wicket-ollama` (`ollama/ollama:0.24.0`, the version tested locally;
  loopback 11434, `mem_limit: 1300m`, `cpus: 1.0`, keep-alive 1m, one model,
  one request at a time, a health check with `ollama list`). The models sit
  in a named volume, not a bind mount: they are re-downloadable. The API
  doesn't wait on the backup's health, so it runs cloud-only while the
  backup is down or the model isn't pulled yet.
- **`docs/owner-setup.md`** has a table of everything the vps-deploy stack
  needs, two checks the rootless daemon decides (the memory limit holds;
  `cpus` needs the `cpu` controller delegated), the model pull, the deploy
  checks (health, the page, and `/wicket-api/metrics` answering 404), the
  seed, the Ward link order, the callers' settings, and local development
  with Ward's local seed entry.
- **README** in brief-board's shape, with a two-call example; no screenshots
  yet. `docs/README.md` points into the wiki.

Checks: `npm run typecheck`, `npm run lint`, `npm test` (84 passed, 1
skipped) and `npm run build`. No secret, local path, domain, host alias or
username in any file; the vendored ward-auth headers name its GitHub
repository and author as upstream attribution, as brief-board's copy does.
