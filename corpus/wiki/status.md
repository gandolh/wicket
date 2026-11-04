---
summary: Snapshot as of 2026-11-04, per area. Designed in a grill with the owner and built the same day, briefs 01-05 (queue and jobs API, providers, sign-in with admin routes and /metrics, the queue page, the containers and owner setup); 85 tests; not deployed, containers not built (no Docker on the build machine). The owner's steps in order (Ward registration, secrets, the vps-deploy stack from docs/owner-setup.md, the model pull, the account, pointing just-a-bot and ro-housing at it, Ward's local seed entry), and the open todos (score the backup model; bump @fastify/static).
updated: 2026-11-04
---

# Status

_2026-11-04_. The owner settled the design in a grill
([decisions.md](decisions.md)) and briefs 01 to 05 built it the same day.
**Not deployed**, and the containers were never built: Docker wasn't
reachable from the build machine. Everything the deploy needs is in
`docs/owner-setup.md`.

## By area

- **Queue, jobs API, tokens, records** (brief 01). One in-memory FIFO queue,
  one job at a time, tickets from the highest recorded plus one;
  `POST`/`GET`/`DELETE /v1/jobs` with long-polling; per-app tokens from
  `WICKET_APP_TOKENS`; records with no text ([api.md](api.md)).
- **Providers** (brief 02). The cloud first, the backup on any cloud failure
  but a cancel, no key means backup only ([providers.md](providers.md)).
  Tested with stub servers and once against a local `llama3.2:1b`.
- **Sign-in, admin routes, /metrics** (brief 03). The vendored ward-auth
  0.7.0 guards the admin routes; app tokens guard the job routes; sessions may
  force close and clear, with an Origin check; `/metrics` refused through a
  proxy ([sign-in.md](sign-in.md)).
- **Queue page** (brief 04). Now serving, the running call, the waiting
  tickets, calls per app and recent calls; Force close and Clear queue behind
  a confirm dialog. Walked through in a browser against a stand-in Ollama.
- **Containers and owner setup** (brief 05). `infrastructure/` holds the API's
  Dockerfile and a compose file with the capped `wicket-ollama`; not built.
  `docs/owner-setup.md` is the deploy's whole brief.

85 tests (84 run, 1 opt-in live test skipped); typecheck, lint and build
clean (2026-11-04).

## Next (owner)

In this order; the details are in `docs/owner-setup.md`.

1. Register Wicket in production Ward (slug `wicket`) and grant your account.
2. Make the secrets: `WARD_OIDC_CLIENT_KEY`, `OLLAMA_API_KEY` (the key
   just-a-bot holds today), `WICKET_APP_TOKENS` (one token per app).
3. Have the vps-deploy stack written from the table in
   `docs/owner-setup.md` (port 8808, `/wicket` and `/wicket-api`, `/metrics`
   left out, the backup container, the Prometheus scrape), and push this repo
   first.
4. Deploy, then pull `gemma3:1b` into `wicket-ollama` once.
5. Seed your account in the container, then link Ward.
6. Give just-a-bot and ro-housing `WICKET_URL` and their own `WICKET_TOKEN`.
7. For local development only: add Wicket to Ward's local seed (`wzd_auth`,
   `infrastructure/local/seed.mjs`):
   `{ slug: "wicket", name: "Wicket", repo: "wicket", envFiles: [".env"], dev: "http://localhost:5179/wicket/", api: "/wicket-api" }`
   in `APPS`, and its row in that folder's README table.
8. Answer the calls the build made on its own ([open-questions.md](open-questions.md)).

## Open briefs

None.

## Todos

- [Score gemma3:1b on Romanian listings](../todos/score-the-backup-model.md),
  on a quiet machine.
- [Move @fastify/static to 10.1.9 or later](../todos/update-fastify-static.md),
  from about 2026-11-18.
