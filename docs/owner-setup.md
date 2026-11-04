# Owner setup

Everything it takes to put Wicket on the VPS, and what the vps-deploy stack
needs to know. Nothing in this repo deploys, registers a Ward client, writes a
secret or pulls a model: those are the owner's steps, written down here.
Commands run on your machine unless a step says otherwise.

Wicket runs as two containers from
[`infrastructure/docker-compose.yml`](../infrastructure/docker-compose.yml):
`wicket-api` (the queue, the API, sign-in, `/metrics`) on `127.0.0.1:8808`,
and `wicket-ollama` (the backup model) on `127.0.0.1:11434`. Caddy serves the
built page at `/wicket/` and forwards `/wicket-api/` to the API.

`<production origin>` below means `https://` plus the main domain's host, with
no path.

## 1. Register Wicket in production Ward

The adoption guide is `shared-library/README.md` in the Ward repo (`wzd_auth`).
brief-board was registered the same way.

1. Open the console on Ward's own host (`/console`) and sign in as the
   break-glass superuser.
2. Create an app with slug `wicket` and name `Wicket`, with public
   registration closed.
3. Make the client's key pair, from Ward's checkout:

   ```
   cd path/to/wzd_auth && npm run oidc-client-key --workspace=api -- wicket
   ```

   It prints a private `WARD_OIDC_CLIENT_KEY=...` line and a public JWK. Keep
   the private line for step 2. Never paste it into Ward.
4. On the app's page, under "Sign in with Ward", register a client with the
   public JWK and these addresses:
   - redirect URI: `<production origin>/wicket-api/auth/ward/callback`
   - sign-out return URI: `<production origin>/wicket/`
5. Grant a role on the app to your own Ward account (step 7 links it).

## 2. The secrets

Three secrets, all for `wicket-api`:

| Variable | What | How to make it |
|---|---|---|
| `WARD_OIDC_CLIENT_KEY` | Ward client private key | step 1 |
| `OLLAMA_API_KEY` | the Ollama Cloud key | the same key just-a-bot holds today |
| `WICKET_APP_TOKENS` | one bearer token per app | `openssl rand -hex 32`, once per app |

`WICKET_APP_TOKENS` is one line of `app=token` pairs, comma-separated:

```
WICKET_APP_TOKENS=just-a-bot=<token one>,ro-housing=<token two>
```

The app names land in the records and on the page. Each app gets its own token
as `WICKET_TOKEN` in its own deploy secrets, and never another app's. Adding
an app later means a new pair on this line and a restart of `wicket-api`.

With vps-deploy, these go in its secrets file for the stack
(`secrets/wicket.env`, `chmod 600`). Once just-a-bot calls Wicket, its own
`OLLAMA_API_KEY` can go.

## 3. What the vps-deploy stack needs

| Setting | Value |
|---|---|
| Source repo | `wicket`, built from the workspace root |
| Containers | `wicket-api` (built from `infrastructure/Dockerfile`, image `wicket-api:1.0`) and `wicket-ollama` (`ollama/ollama:0.24.0`), both from `infrastructure/docker-compose.yml` |
| Server dir | `/srv/wicket-api` (the compose file's `.env` goes in `infrastructure/`, 0600) |
| Ports | `127.0.0.1:8808` (API), `127.0.0.1:11434` (backup Ollama). Loopback only; the deploy's loopback check should cover both |
| Page | `web/dist`, built with `WICKET_BASE=/wicket/`, served at `/wicket/` with an SPA fallback to `index.html` |
| API route | `/wicket-api/*` to `127.0.0.1:8808`, prefix stripped |
| Leave out | `/wicket-api/metrics`: answer 404 at Caddy. Wicket also refuses `/metrics` on any request carrying `X-Forwarded-For` |
| Health check | `GET http://127.0.0.1:8808/v1/health`, expecting `"ok":true` (through Caddy: `/wicket-api/v1/health`) |
| Data | `/srv/wicket-api/data` bind-mounted at `/data` (`WICKET_DATA_DIR`): the records and the accounts' password hashes. No prompt or answer is ever stored |
| Models | the named volume `ollama-models` (about 0.8 GB for gemma3:1b); re-downloadable, no backup needed |
| Secrets | `WARD_OIDC_CLIENT_KEY`, `OLLAMA_API_KEY`, `WICKET_APP_TOKENS` (step 2) |
| Plain env | `PUBLIC_ORIGIN=<production origin>`; `WARD_OIDC_ISSUER` (Ward's origin), `WARD_OIDC_CLIENT_ID=wicket`, `WARD_OIDC_REDIRECT_URI=<production origin>/wicket-api/auth/ward/callback`, `WARD_OIDC_POST_LOGOUT_REDIRECT_URI=<production origin>/wicket/`; `AUTH_TRUSTED_PROXIES` = the range Caddy reaches containers from, as for the other apps |
| Set by compose | `HOST`, `PORT`, `WICKET_DB`, and `WICKET_BACKUP_URL=http://wicket-ollama:11434` |
| Optional env | `WICKET_CLOUD_MODEL` (default `gpt-oss:120b`), `WICKET_CLOUD_TIMEOUT_SECONDS` (120), `WICKET_BACKUP_MODEL` (`gemma3:1b`), `WICKET_BACKUP_KEEP_ALIVE` (`1m`), `WICKET_BACKUP_TIMEOUT_SECONDS` (300) |
| Backup caps | `mem_limit: 1300m`, `cpus: 1.0`, `OLLAMA_KEEP_ALIVE=1m`, `OLLAMA_NUM_PARALLEL=1`, `OLLAMA_MAX_LOADED_MODELS=1` (in the compose file) |
| Model pull | once, after the first start: step 4 |
| Prometheus | a scrape job `wicket` on `127.0.0.1:8808`, path `/metrics` (Prometheus runs on host networking, bound to loopback) |
| Ward client | slug `wicket`, like brief-board's |

`/metrics` gives `wicket_queue_waiting`, `wicket_queue_running`,
`wicket_jobs_total{app,outcome,provider}`, and `wicket_job_wait_seconds` and
`wicket_job_run_seconds` as `_sum` and `_count` by provider. Useful panels:
the queue length, calls per minute by app
(`sum by (app) (rate(wicket_jobs_total[5m]))`), and the share answered by
the backup.

Two things to check once on the box, because the rootless daemon decides
them: that the backup's limits hold (`docker stats wicket-ollama` shows a 1.3
GB limit), and that the daemon accepts `cpus` (it needs the `cpu` controller
delegated to the services account; if `compose up` refuses it, drop the line
and note it).

## 4. Pull the backup model

Once, after the first deploy, on the box as the services account:

```
export DOCKER_HOST=unix:///run/user/$(id -u)/docker.sock
cd /srv/wicket-api
docker compose -f infrastructure/docker-compose.yml exec wicket-ollama ollama pull gemma3:1b
```

Until it is pulled, a call the cloud can't answer fails instead of falling
back. Check with `curl -s http://127.0.0.1:11434/api/tags`.

## 5. Check the containers locally

Docker Desktop's WSL integration must be on. From the repo root, with a
scratch data directory, and the backup on another port if your own Ollama
holds 11434:

```
touch infrastructure/.env
WICKET_DATA_DIR="$(mktemp -d)" WICKET_OLLAMA_PORT=11435 docker compose -f infrastructure/docker-compose.yml up --build -d
curl -s http://127.0.0.1:8808/v1/health
```

Expect `{"ok":true}`. Stop it with
`docker compose -f infrastructure/docker-compose.yml down`. Stop a local
`npm start` first: it uses the same port.

## 6. Deploy

Once the vps-deploy stack exists, from vps-deploy (check the stack's CLI name
in its `cli.ts`):

```
node cli.ts wicket all --dry-run
node cli.ts wicket all
```

Then:

```
curl -s <production origin>/wicket-api/v1/health
curl -sI <production origin>/wicket/
curl -s -o /dev/null -w '%{http_code}\n' <production origin>/wicket-api/metrics
```

Expect `{"ok":true}`, a `200`, and a `404`.

## 7. Your account, and Ward

There is no register page. On the box as the services account, run the seed
inside the container. It asks for a username and password and shows neither:

```
export DOCKER_HOST=unix:///run/user/$(id -u)/docker.sock
cd /srv/wicket-api
docker compose -f infrastructure/docker-compose.yml exec -it wicket-api node server/dist/seed.js
```

An existing user is left as it is. Then link Ward in this order, or you end up
with two users:

1. Sign in at `<production origin>/wicket/` with that local account.
2. Open the account page (your name, top right) and press "Link Ward".

After your first sign-in, check that the login lockout sees each visitor's own
address:

```
docker compose -f infrastructure/docker-compose.yml logs wicket-api | grep -i "X-Forwarded-For"
```

No output is right. A line saying every caller shares one failure counter
means `AUTH_TRUSTED_PROXIES` doesn't name the range Caddy comes from.

## 8. Point the apps at Wicket

Each caller gets two settings in its own deploy secrets:

```
WICKET_URL=<production origin>/wicket-api
WICKET_TOKEN=<that app's token from step 2>
```

Use the public address even for an app on the same box: under the rootless
daemon a container can't reach the host's loopback, so `127.0.0.1:8808` works
only from the box's own shell. The contract the callers code against is in
[`corpus/wiki/api.md`](../corpus/wiki/api.md).

## Local development

1. `cp .env.example .env`, then fill `WICKET_APP_TOKENS` with a token for any
   app you test with (`openssl rand -hex 32`). Leave `OLLAMA_API_KEY` empty to
   send every call to the backup, and set `WICKET_BACKUP_MODEL` to a model your
   own Ollama already has (pull nothing for this).
2. Make your local account: `npm run seed -w @wicket/server`.
3. For "Sign in with Ward" against the local Ward: add Wicket to Ward's local
   seed (`wzd_auth`, `infrastructure/local/seed.mjs`), in `APPS`:

   ```
   { slug: "wicket", name: "Wicket", repo: "wicket", envFiles: [".env"], dev: "http://localhost:5179/wicket/", api: "/wicket-api" },
   ```

   and this row in that folder's README table:

   ```
   | wicket | http://localhost:5179/wicket/ | `wicket/.env` |
   ```

   Then run `node seed.mjs` there. It writes the five `WARD_OIDC_*` values
   into this repo's `.env`.
4. `npm run dev`: the API on `127.0.0.1:8808` and the page at
   <http://localhost:5179/wicket/>. For `npm start` (the built page on the
   server's own port), set `PUBLIC_ORIGIN=http://127.0.0.1:8808`.
