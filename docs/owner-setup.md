# Owner setup

Everything it takes to put Wicket on the VPS, and what the vps-deploy stack
needs to know. Nothing in this repo deploys, registers a Ward client or
writes a secret: those are the owner's steps, written down here. Commands run
on your machine unless a step says otherwise.

Wicket runs as one container from
[`infrastructure/docker-compose.yml`](../infrastructure/docker-compose.yml):
`wicket-api` (the queue, the API, sign-in, `/metrics`) on `127.0.0.1:8808`.
Every call goes to Ollama Cloud; there is no model on the box. Caddy serves
the built page at `/wicket/` and forwards `/wicket-api/` to the API.

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
5. Grant a role on the app to your own Ward account (step 6 links it).

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
| Container | `wicket-api` (built from `infrastructure/Dockerfile`, image `wicket-api:1.0`, about 210 MB), from `infrastructure/docker-compose.yml` alone (`docker-compose.local.yml` is for a local check, step 4). No Ollama container and no model |
| Server dir | `/srv/wicket-api` (the compose file's `.env` goes in `infrastructure/`, 0600) |
| Port | `127.0.0.1:8808`. Loopback only |
| Page | `web/dist`, built with `WICKET_BASE=/wicket/`, served at `/wicket/` with an SPA fallback to `index.html` |
| API route | `/wicket-api/*` to `127.0.0.1:8808`, prefix stripped |
| Leave out | `/wicket-api/metrics`: answer 404 at Caddy. Wicket also refuses `/metrics` on any request carrying `X-Forwarded-For` |
| Health check | `GET http://127.0.0.1:8808/v1/health`, expecting `"ok":true` (through Caddy: `/wicket-api/v1/health`) |
| Data | `/srv/wicket-api/data` bind-mounted at `/data` (`WICKET_DATA_DIR`): the records and the accounts' password hashes. No prompt or answer is ever stored |
| Secrets | `WARD_OIDC_CLIENT_KEY`, `OLLAMA_API_KEY`, `WICKET_APP_TOKENS` (step 2) |
| Plain env | `PUBLIC_ORIGIN=<production origin>`; `WARD_OIDC_ISSUER` (Ward's origin), `WARD_OIDC_CLIENT_ID=wicket`, `WARD_OIDC_REDIRECT_URI=<production origin>/wicket-api/auth/ward/callback`, `WARD_OIDC_POST_LOGOUT_REDIRECT_URI=<production origin>/wicket/`; `AUTH_TRUSTED_PROXIES` = the range Caddy reaches containers from, as for the other apps |
| Set by compose | `HOST`, `PORT`, `WICKET_DB` |
| Optional env | `WICKET_CLOUD_MODEL` (default `gpt-oss:120b`), `WICKET_CLOUD_TIMEOUT_SECONDS` (120) |
| Outbound | HTTPS to `ollama.com`, where every call goes |
| Prometheus | a scrape job `wicket` on `127.0.0.1:8808`, path `/metrics` (Prometheus runs on host networking, bound to loopback) |
| Ward client | slug `wicket`, like brief-board's |

`/metrics` gives `wicket_queue_waiting`, `wicket_queue_running`,
`wicket_jobs_total{app,outcome}`, and `wicket_job_wait_seconds` and
`wicket_job_run_seconds` as `_sum` and `_count`. Useful panels: the queue
length, calls per minute by app (`sum by (app) (rate(wicket_jobs_total[5m]))`),
and the failed share (`outcome="failed"`), which shows a spent quota or a
cloud outage.

Measured in a local run on 2026-11-04: the API sits at about 40-50 MB of
memory.

## 4. Check the container locally

Optional, on your own machine, before the first deploy. It builds the image
and runs it as the compose project `wicket-smoke`, with
[`infrastructure/docker-compose.local.yml`](../infrastructure/docker-compose.local.yml)
keeping the data in a volume the teardown removes. Docker Desktop's WSL
integration must be on. Its `--network host` is its own VM, so everything
here goes through the compose network and the loopback port.

1. Write `infrastructure/.env` (git-ignored) with throwaway tokens. Leave
   `OLLAMA_API_KEY` out unless you mean to spend real cloud calls.

   ```
   umask 077
   printf 'WICKET_APP_TOKENS=just-a-bot=%s,ro-housing=%s\n' \
     "$(openssl rand -hex 32)" "$(openssl rand -hex 32)" > infrastructure/.env
   ```

2. Build and start:

   ```
   C="docker compose -p wicket-smoke -f infrastructure/docker-compose.yml -f infrastructure/docker-compose.local.yml"
   $C config --quiet && $C up --build -d
   curl -s http://127.0.0.1:8808/v1/health
   ```

   Expect `{"ok":true}`. Stop a local `npm start` or `npm run dev` first:
   they use port 8808.
3. Make a throwaway account: `$C exec -it wicket-api node server/dist/seed.js`
   asks for a username and password.
4. Serve the page the way Caddy will, from the repo root:
   `npm run dev -w @wicket/web` (only the page; the root `npm run dev` would
   start a second API on 8808). Open <http://localhost:5179/wicket/> and sign
   in. Vite forwards `/wicket-api` to the container.
5. Send a call with one of the tokens in `infrastructure/.env` and wait for
   it. With no key it ends `failed` with "the cloud model can't be asked:
   OLLAMA_API_KEY is not set", and the next call still runs:

   ```
   TOKEN=$(sed -n 's/.*just-a-bot=\([0-9a-f]*\).*/\1/p' infrastructure/.env)
   curl -s -X POST http://127.0.0.1:8808/v1/jobs -H "Authorization: Bearer $TOKEN" \
     -H 'content-type: application/json' -d '{"messages":[{"role":"user","content":"Say hi"}]}'
   curl -s "http://127.0.0.1:8808/v1/jobs/<id>?wait=25" -H "Authorization: Bearer $TOKEN"
   ```

   To see calls running and waiting on the page without a key, use the
   stand-in cloud in [`docs/images/shots.md`](images/shots.md).
6. `curl -s http://127.0.0.1:8808/metrics` answers Prometheus text; with an
   `X-Forwarded-For` header it answers 404.
7. Tear it down and drop the tokens:

   ```
   $C down -v --remove-orphans
   rm infrastructure/.env
   ```

"Sign in with Ward" can't be checked this way: the API in the container would
have to reach the local Ward at its `localhost` address, which inside the
container is the container itself. Check it with `npm run dev` instead
([getting-started.md](getting-started.md#6-sign-in-with-ward-optional)).

## 5. Deploy

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

## 6. Your account, and Ward

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

## 7. Point the apps at Wicket

Each caller gets two settings in its own deploy secrets:

```
WICKET_URL=<production origin>/wicket-api
WICKET_TOKEN=<that app's token from step 2>
```

Use the public address even for an app on the same box: under the rootless
daemon a container can't reach the host's loopback, so `127.0.0.1:8808` works
only from the box's own shell. The contract the callers code against is in
[`corpus/wiki/api.md`](../corpus/wiki/api.md).

## 8. The docs site

The docs site builds into `docs-site/dist` with base `/wicket/docs/`
([docs-site/README.md](../docs-site/README.md)). vps-deploy ships what is
built in the checkout and builds nothing, so it needs a docs stack, written in
its `app.ts` the way the other apps' are:

```ts
new DocsStack(estate, "wicket", {
  repo: estate.repos.wicket,
  distDir: "docs-site/dist",
  generator: "docusaurus",
  description: "Wicket docs — the queue, the API contract, the corpus",
  routeTitle: "Wicket docs",
  deployedWith: wicket,
});
```

vps-deploy's docs construct already handles a docs route inside an app's
path, as it does for Atrium's `/atrium/docs` inside `/atrium`. Then, from this
repo and from vps-deploy:

```
npm ci --prefix docs-site && npm run docs
node cli.ts wicket-docs deploy
curl -sI <production origin>/wicket/docs/
```

Links from the wiki to source files render as plain text, since the repo
doesn't write its own GitHub address down. Build with
`DOCS_REPO_URL=https://github.com/<account>/wicket npm run docs` to make them
links.

## Local development

Running Wicket on your own machine, "Sign in with Ward" against a local Ward
included, is in [getting-started.md](getting-started.md).
