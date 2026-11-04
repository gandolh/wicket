# Wicket

One small door to an LLM for every app in the estate: it holds the Ollama key, puts every call in one first-come-first-served queue, and runs one call at a time.

A wicket is the small door in a big gate that lets people through one at a time. It joins the estate's other gates, Ward (sign-in) and Postern (webmail).

**Status:** Personal tool, built 2026-11-04. Set up to run on the owner's VPS at `/wicket/` behind sign-in, and locally for development; not deployed yet. Putting it there is in [docs/owner-setup.md](docs/owner-setup.md).

## What it does

- Takes chat calls from apps over HTTP, each app with its own bearer token, and answers with a ticket number: "you're number 14, now serving 12".
- Runs one call at a time, in ticket order, on Ollama Cloud. When the cloud fails (an error, a timeout, a spent quota), the same call goes to a small backup model on the box, and the answer says so.
- Keeps a record of every call with counts and timings only: the app, the ticket, the model, cloud or backup, the wait, the run time and how it ended. Never the prompt or the answer.
- Shows the queue on a page behind sign-in: now serving, the running call, the waiting tickets and recent calls, with **Force close** for a stuck call and **Clear queue** for everything waiting.
- Serves a small Prometheus `/metrics` on the box's loopback for Grafana.

Callers never choose a model, there are no priorities, and the queue lives in memory: a restart cancels whatever waits.

## How it works

Three npm workspaces. `shared` is the API contract as zod schemas. `server` is a Fastify API on 127.0.0.1:8808 with SQLite for the records and the accounts; it holds the queue and talks to Ollama. `web` is the React page, which polls the API. On the VPS the backup model runs in its own capped Ollama container. More in [docs/README.md](docs/README.md).

```bash
curl -X POST "$WICKET_URL/v1/jobs" -H "Authorization: Bearer $WICKET_TOKEN" \
  -H 'content-type: application/json' \
  -d '{"messages":[{"role":"user","content":"Say hi"}]}'
# 202 {"id":"…","ticket":14,"nowServing":12,"position":2,"status":"queued"}

curl "$WICKET_URL/v1/jobs/<id>?wait=25" -H "Authorization: Bearer $WICKET_TOKEN"
# {"id":"…","ticket":14,"nowServing":14,"position":0,"status":"done","result":{"text":"Hi!","model":"gpt-oss:120b","backup":false}}
```

The full contract is in [corpus/wiki/api.md](corpus/wiki/api.md).

## Run it locally

Requires Node 24 or later, and an Ollama of your own for the backup.

```bash
npm install
cp .env.example .env            # then fill WICKET_APP_TOKENS, and WICKET_BACKUP_MODEL with a model you have
npm run seed -w @wicket/server  # your local account; asks for a username and password
npm run dev                     # API on 127.0.0.1:8808, page on http://localhost:5179/wicket/
```

Without `OLLAMA_API_KEY` every call goes straight to the backup model. "Sign in with Ward" turns on when Ward's local seed has written the `WARD_OIDC_*` values into `.env`; the steps are in [docs/owner-setup.md](docs/owner-setup.md#local-development).

Checks: `npm run typecheck`, `npm run lint`, `npm test`. One test asks a real Ollama and is skipped unless `WICKET_LIVE_OLLAMA=1`.

## Docs

- [docs/](docs/README.md): what is where
- [docs/owner-setup.md](docs/owner-setup.md): putting Wicket on the VPS, and everything the deploy stack needs
- [Project wiki](corpus/index.md): decisions, glossary, the API contract, status and the briefs that built it

## License

[MIT](LICENSE)
