---
summary: Snapshot as of 2026-11-04, per area. The design settled in a grill with the owner on 2026-11-04; corpus and briefs 01-05 written the same day. Built: briefs 01 (queue, jobs API, app tokens, records), 02 (cloud and backup providers) and 03 (sign-in, admin routes, /metrics). Owner steps (Ward registration, secrets, the vps-deploy stack, the model pull, Ward's local seed entry) and the one open todo (score the backup model on a quiet machine).
updated: 2026-11-04
---

# Status

_2026-11-04_. The owner settled the design in a grill
([decisions.md](decisions.md)); the corpus and five briefs are written.
Briefs 01 and 02 are built: the queue, the job routes, app tokens, records,
the providers (Ollama Cloud, then the backup), sign-in, the admin routes and
`/metrics`. The page is next.

## By area

- **Queue, jobs API, tokens, records** (2026-11-04): brief 01, built. One
  in-memory FIFO queue, one job at a time, tickets from the highest recorded
  plus one; `POST`/`GET`/`DELETE /v1/jobs` with long-polling; per-app tokens
  from `WICKET_APP_TOKENS`; records with no text. 43 tests.
- **Cloud and backup providers** (2026-11-04): brief 02, built. The cloud
  first, the backup on any cloud failure but a cancel, no key means backup
  only ([providers.md](providers.md)). Tested with stub servers and once
  against a local `llama3.2:1b`.
- **Sign-in, admin routes, /metrics** (2026-11-04): brief 03, built. The
  vendored ward-auth 0.7.0 guards the admin routes; app tokens guard the job
  routes; sessions may force close and clear, with an Origin check;
  `/metrics` refused through a proxy ([sign-in.md](sign-in.md)).
- **Queue page**: brief 04, not started.
- **Containers and owner setup**: brief 05, not started.

## Open briefs

1. [04, the queue page](../briefs/todo/04-the-queue-page.md)
2. [05, the containers and the owner's setup](../briefs/todo/05-container-and-owner-setup.md)

## Next (owner)

Brief 05 writes the full steps into `docs/owner-setup.md`. Known already:

- For local development: add Wicket to Ward's local seed (`wzd_auth`,
  `infrastructure/local/seed.mjs`):
  `{ slug: "wicket", name: "Wicket", repo: "wicket", envFiles: [".env"], dev: "http://localhost:5179/wicket/", api: "/wicket-api" }`
  in `APPS`, and its row in that folder's README table.

## Todos

- [Score gemma3:1b on Romanian listings](../todos/score-the-backup-model.md),
  on a quiet machine.
