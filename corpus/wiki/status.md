---
summary: Snapshot as of 2026-11-04, per area. The design settled in a grill with the owner on 2026-11-04; corpus and briefs 01-05 written the same day. Built: brief 01 (queue, jobs API, app tokens, records). Owner steps (Ward registration, secrets, the vps-deploy stack, the model pull, Ward's local seed entry) and the one open todo (score the backup model on a quiet machine).
updated: 2026-11-04
---

# Status

_2026-11-04_. The owner settled the design in a grill
([decisions.md](decisions.md)); the corpus and five briefs are written.
Brief 01 is built: the queue, the job routes, app tokens and records. Jobs
fail with "no provider is configured yet" until brief 02.

## By area

- **Queue, jobs API, tokens, records** (2026-11-04): brief 01, built. One
  in-memory FIFO queue, one job at a time, tickets from the highest recorded
  plus one; `POST`/`GET`/`DELETE /v1/jobs` with long-polling; per-app tokens
  from `WICKET_APP_TOKENS`; records with no text. 43 tests.
- **Cloud and backup providers**: brief 02, not started.
- **Sign-in, admin routes, /metrics**: brief 03, not started.
- **Queue page**: brief 04, not started.
- **Containers and owner setup**: brief 05, not started.

## Open briefs

1. [02, the cloud and the backup](../briefs/todo/02-cloud-and-backup-providers.md)
2. [03, sign-in, admin routes and /metrics](../briefs/todo/03-sign-in-admin-routes-and-metrics.md)
3. [04, the queue page](../briefs/todo/04-the-queue-page.md)
4. [05, the containers and the owner's setup](../briefs/todo/05-container-and-owner-setup.md)

## Next (owner)

Nothing yet; brief 05 writes the steps into `docs/owner-setup.md`.

## Todos

- [Score gemma3:1b on Romanian listings](../todos/score-the-backup-model.md),
  on a quiet machine.
