---
summary: Snapshot as of 2026-11-04, per area. Designed in a grill with the owner and built the same day, briefs 01-06 (queue and jobs API, providers, sign-in with admin routes and /metrics, the queue page, the containers and owner setup, both images built and smoke-tested locally); 85 tests; not deployed. The owner's steps in order (Ward registration, secrets, disk room for the 6.55 GB Ollama image, push and deploy with vps-deploy's wicket stack, the model pull, the account, pointing just-a-bot and ro-housing at it, running Ward's local seed); one open question (the Ollama image's size); open brief 07 (README, docs, docs site); and the open todos (score the backup model; bump @fastify/static).
updated: 2026-11-04
---

# Status

_2026-11-04_. The owner settled the design in a grill
([decisions.md](decisions.md)) and briefs 01 to 05 built it the same day.
Brief 06 built both images and ran them together locally the same evening.
**Not deployed.** Everything the deploy needs is in `docs/owner-setup.md`.

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
  Dockerfile and a compose file with the capped `wicket-ollama`.
  `docs/owner-setup.md` is the deploy's whole brief.
- **Images, checked locally** (brief 06). Both images built and ran as the
  compose project `wicket-smoke`, with no cloud key and the backup reading
  the machine's own `llama3.2:1b` read-only. A call went to `done` with
  `backup: true`; sign-in with a seeded account, Clear queue and Force close
  worked from the page; `/metrics` answered on loopback and refused a proxied
  request. Nothing in the images had to change. The Ollama image is 6.55 GB
  ([open-questions.md](open-questions.md)). "Sign in with Ward" wasn't walked:
  Ward's local seed hadn't been run.

85 tests (84 run, 1 opt-in live test skipped); typecheck, lint and build
clean (2026-11-04).

## Next (owner)

In this order; the details are in `docs/owner-setup.md`.

1. Register Wicket in production Ward (slug `wicket`) and grant your account.
2. Make the secrets: `WARD_OIDC_CLIENT_KEY`, `OLLAMA_API_KEY` (the key
   just-a-bot holds today), `WICKET_APP_TOKENS` (one token per app).
3. Check the box has room for `ollama/ollama:0.24.0` (6.55 GB unpacked), or
   answer the open question about a slim image first.
4. Push this repo, deploy with vps-deploy's `wicket` stack (written from
   `docs/owner-setup.md`), then pull `gemma3:1b` into `wicket-ollama` once.
5. Seed your account in the container, then link Ward.
6. Give just-a-bot and ro-housing `WICKET_URL` and their own `WICKET_TOKEN`.
7. For local development only: run Ward's local seed in a terminal
   (`node seed.mjs` in `wzd_auth`'s `infrastructure/local/`; it lists Wicket
   since 2026-11-04), then walk "Sign in with Ward" with `npm run dev`.

The six calls the first build made on its own were all kept by the owner on
2026-11-04. One new call waits in [open-questions.md](open-questions.md): the
Ollama image's size.

## Open briefs

- [07: README, docs/ and a docs site](../briefs/todo/07-readme-docs-and-docs-site.md).

## Todos

- [Score gemma3:1b on Romanian listings](../todos/score-the-backup-model.md),
  on a quiet machine.
- [Move @fastify/static to 10.1.9 or later](../todos/update-fastify-static.md),
  from about 2026-11-18.
