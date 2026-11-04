---
summary: Calls the build made on its own on 2026-11-04, each taken the conservative way, for the owner to confirm or change. The app tokens as one secret (WICKET_APP_TOKENS); the 200-job queue cap answering 503 queue_full; answers kept 10 minutes in memory; a strict request body; records kept forever; and the backup's context length, which waits for the scoring todo.
updated: 2026-11-04
---

# Open questions

Delete an entry the moment the owner answers it. Its history goes to `log.md`.

## App tokens in one secret
Taken: `WICKET_APP_TOKENS=just-a-bot=<token>,ro-housing=<token>`, one variable
in the deploy's secrets file, each token at least 32 characters
(`openssl rand -hex 32`). Adding an app means editing that line and
restarting. Rejected for now: tokens minted by a command and stored hashed in
SQLite, which needs a token page or a command run inside the container. Revisit
when there are more than a handful of apps.

## A cap on the waiting line
Taken: at most 200 waiting jobs; the 201st gets `503 queue_full`. This is an
addition to the contract, not a change: a caller that never fills the queue
never sees it. It bounds memory if a caller loops by mistake. The owner may
want a lower cap, or a cap per app.

## How long an answer waits for its caller
Taken: 10 minutes after the job ends, in memory, then the job is forgotten.

## A strict request body
Taken: an unknown field in `POST /v1/jobs` (a `model`, `stream`, `options`) is
a 400, so a caller that thinks it chose a model finds out at once.

## Records are kept forever
Taken: no pruning. A record is a few numbers; years of calls stay small.

## The backup's context length
Ollama's default context is a few thousand tokens and it cuts a longer prompt
from the front, so a long listing page may lose its start on the backup. A
bigger context costs memory inside the 1.3 GB cap. Left at Ollama's default
until the scoring todo ([score-the-backup-model](../todos/score-the-backup-model.md))
measures real listings.
