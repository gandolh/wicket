# Getting started

Running Wicket on your own machine: the API and the queue page. Putting it on
a VPS is [owner-setup.md](owner-setup.md).

## Prerequisites

- Node 24 or later.
- For answers, an Ollama Cloud key. Wicket asks Ollama Cloud only. Without a
  key it still runs: every call ends `failed` with "OLLAMA_API_KEY is not
  set", and the queue, the page and sign-in all work.
- Optional: Docker, to run the two containers locally (step 7), and a local
  Ward, for "Sign in with Ward" (step 6).

## 1. Install

```bash
npm install
```

One install covers the three workspaces (`shared`, `server`, `web`).

## 2. Configure

```bash
cp .env.example .env
```

`.env` is git-ignored. Every setting is described in
[`.env.example`](../.env.example); the ones to fill first:

| Variable | What | Value for local use |
|---|---|---|
| `WICKET_APP_TOKENS` | Secret. `app=token` pairs, comma-separated, each token at least 32 characters | `my-app=` plus the output of `openssl rand -hex 32` |
| `OLLAMA_API_KEY` | Secret. The Ollama Cloud key | yours, or empty: every call then fails saying so |
| `WICKET_CLOUD_MODEL` | The cloud model | default `gpt-oss:120b` |
| `PUBLIC_ORIGIN` | The page's origin as the browser sees it | empty for `npm run dev`; `http://127.0.0.1:8808` for `npm start` |

The cloud settings and their defaults are in
[providers.md](../corpus/wiki/providers.md); the sign-in settings in
[sign-in.md](../corpus/wiki/sign-in.md).

## 3. Make your account

```bash
npm run seed -w @wicket/server
```

It asks for a username and password on the terminal and shows neither. There
is no sign-up page. Running it again with the same name leaves that user as it
is. The records and the accounts go to `data/wicket.sqlite` (git-ignored), or
to `WICKET_DB`.

## 4. Run

```bash
npm run dev
```

The API listens on `127.0.0.1:8808` and the page on
<http://localhost:5179/wicket/>, where you sign in. Vite forwards
`/wicket-api` to the API, the way Caddy does in production.

To serve the built page from the API's own port instead:
`npm run build`, set `PUBLIC_ORIGIN=http://127.0.0.1:8808`, then `npm start`
and open <http://127.0.0.1:8808/wicket/>.

## 5. Send a call

With a token from your `WICKET_APP_TOKENS`:

```bash
curl -s -X POST http://127.0.0.1:8808/v1/jobs -H "Authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d '{"messages":[{"role":"user","content":"Say hi"}]}'
curl -s "http://127.0.0.1:8808/v1/jobs/<id>?wait=25" -H "Authorization: Bearer $TOKEN"
```

The second call returns once the job has finished: `done` with the answer, or
`failed` with the reason (with no key, "the cloud model can't be asked:
OLLAMA_API_KEY is not set"). The call shows on the page under "Recent
calls". The whole
contract is [api.md](../corpus/wiki/api.md).

## 6. Sign in with Ward (optional)

Ward's local seed (the `wzd_auth` repo, `infrastructure/local/seed.mjs`)
lists Wicket. Run `node seed.mjs` there, in a
terminal. It writes the five `WARD_OIDC_*` values into this repo's `.env`.
Restart `npm run dev` and the login page shows "Sign in with Ward". With
`WARD_OIDC_ISSUER` empty, Wicket runs with local accounts only.

## 7. Run the container (optional)

To check the image before a deploy, follow section 4 of
[owner-setup.md](owner-setup.md#4-check-the-container-locally). It cleans up
after itself.

## Checks

```bash
npm run typecheck
npm run lint
npm test
```

`npm test` runs the server's and the page's tests against a stub Ollama
server. No test asks a real model.

## The docs site

```bash
npm ci --prefix docs-site   # once
npm run docs                # builds docs-site/dist
```

The site renders the corpus wiki and these guides, with a reference generated
from `shared`'s contract. [docs-site/README.md](../docs-site/README.md) has
the details.

## Common problems

- **"Wicket cannot start"** lists every setting that is wrong, by name. An
  empty `WICKET_APP_TOKENS` is allowed but refuses every job call.
- **Port 8808 in use**: a local `npm start`, `npm run dev` or the containers
  from step 7 are already running.
- **Signing in is refused** with `npm start`: `PUBLIC_ORIGIN` must be the
  address the browser opened.
