---
summary: Locked calls for Wicket, settled in a grill with the owner on 2026-11-04, each with rejected alternatives and the reason. One service holds the Ollama key and queues every app's LLM calls; Fastify + React like brief-board; Ollama Cloud first with a small local backup model (gemma3:1b in a capped container) and Wicket choosing the model; one first-come-first-served queue running one call at a time; tickets and now serving; an in-memory queue that a restart cancels; records with counts and timings, never text; a queue page with force close and clear queue; sign-in like brief-board with per-app bearer tokens for callers; /wicket and /wicket-api on loopback port 8808; a loopback-only /metrics. Read before proposing to change any of these.
updated: 2026-11-04
---

# Decisions

Each entry passed three tests: hard to reverse, surprising without context, and
a real trade-off. Changing one needs an explicit revisit and a `log.md` entry.
All of these were settled by the owner in a grill on 2026-11-04. Details the
build had to pick on its own are in [open-questions.md](open-questions.md)
until the owner confirms them.

## One service holds the key and queues every app's LLM calls
_2026-11-04_. Every app in the estate that needs an LLM calls Wicket, and only
Wicket holds the Ollama Cloud key. Today's callers are just-a-bot's `/ask` and
ro-housing's "fill the gaps" job, which reads one listing page. Rejected: each
app keeping its own copy of the key and calling Ollama itself. The key spreads
across repos and deploy secrets, and two apps calling at once compete for the
same quota with nobody seeing it.

## A Fastify API and a React page, built like brief-board
_2026-11-04_. npm workspaces `shared`, `server` and `web`: a Fastify 5 API on
better-sqlite3, a React 19 page on Vite with Base UI for widgets, and ward-auth
vendored into `server/vendor/ward` and `web/vendor/ward`. Same licence (MIT).
The estate already runs this shape, so deploys, sign-in and reviews carry over.
Rejected: a bare proxy with no page, which leaves the owner blind to what is
waiting; and a new stack, which nobody here maintains yet.

## Ollama Cloud first, a small local model as the backup, and Wicket picks
_2026-11-04_. A call goes to Ollama Cloud with the cloud model, a setting that
defaults to `gpt-oss:120b` (just-a-bot's default). When the cloud fails (an
error, a timeout, a quota refusal), the same call goes to the backup model on
an Ollama container on the VPS. Callers never name a model; each result says
whether the backup answered. Rejected: cloud only, where an outage or a spent
quota stops every app; local only, where a 1B model is too weak to be the
first answer; and callers picking models, which spreads cost and makes the
queue's timings meaningless.

## The backup is gemma3:1b in a small, capped container
_2026-11-04_. The backup Ollama runs `gemma3:1b`, capped at about 1.3 GB of
RAM and one CPU core, with a short keep-alive (1 minute, or 0) so the model
leaves memory when idle. The VPS is shared with every other app, and the
backup is for the rare hour the cloud is down. Rejected: a bigger model, which
the box can't spare memory for; and keeping the model loaded, which holds
memory all day for calls that mostly never come. Whether gemma3:1b reads
Romanian listings well enough is a todo
([score-the-backup-model](../todos/score-the-backup-model.md)).

## One queue, first come first served, one call at a time
_2026-11-04_. Every call from every app waits in one FIFO queue, and exactly one
runs at a time, whether it runs on the cloud or the backup. Rejected: a queue
per app, priorities, and parallel cloud calls. One at a time keeps the quota
and the box calm, and makes every wait explainable: the calls ahead of yours.

## Tickets and now serving, like a market counter
_2026-11-04_. Every call gets a ticket number when it joins the queue, and every
answer about it says which ticket is being served now and its place in line.
A caller can tell its user "you're number 14, now serving 12". Rejected: a bare
status, which tells a waiting user nothing about how long.

## The queue lives in memory, and a restart cancels it
_2026-11-04_. Waiting and running calls are held in memory only. A restart or
deploy cancels them; their callers see the job gone and retry. Rejected:
persisting the queue in SQLite, which means writing prompt text to disk and
replaying calls whose callers may have given up. Calls are short-lived, and the
callers already handle a failed call.

## Records hold counts and timings, never text
_2026-11-04_. Per call, Wicket keeps the app, the ticket, the model, cloud or
backup, the wait time, the run time and the outcome (ok, failed, cancelled).
It never stores a prompt or an answer, in the database or in its logs. The
answer is held in memory only until its caller fetches it or it expires.
Rejected: keeping prompts and answers for debugging. Listings and Discord
messages are other people's words, and what isn't stored can't leak.

## A queue page with force close and clear queue
_2026-11-04_. The page at `/wicket` shows now serving, the running call (app,
ticket, elapsed time, cloud or backup), the waiting tickets (app, time waited),
and recent records and counts. Two actions: **Force close** aborts the running
call's request (Ollama stops generating when the request is aborted), and
**Clear queue** drops every waiting ticket. Clear queue is always available,
the fallback if force close doesn't free the queue. Callers whose ticket was
closed or cleared see `cancelled`. Conventional layout: a header, a page, plain
tables. The owner rejects metaphor-heavy navigation. Rejected: a read-only
page, which leaves a stuck call blocking every app until a restart.

## Sign-in like brief-board, and per-app tokens for callers
_2026-11-04_. The page signs in with "Sign in with Ward" or a seeded local
account, and has no sign-up, exactly like brief-board. Unlike brief-board, a
session may write: force close and clear queue are POSTs. Apps never sign in;
each calls the API with its own bearer token, which names the app in the
records. An app token can't reach the admin routes, and a session can't post
jobs. Rejected: one shared token for every app, which can't tell the apps apart
in the records; and apps signing in with a password, which means a session to
keep alive in every caller.

## /wicket and /wicket-api on the shared origin, port 8808
_2026-11-04_. Like brief-board: the page at `/wicket/`, the API at
`/wicket-api`, the container on loopback port 8808, the backup Ollama on its
own loopback port 11434. Rejected: a host of its own, which needs a DNS record
and a certificate for a page only the owner opens.

## A small /metrics for Grafana, loopback only
_2026-11-04_. Wicket serves Prometheus text at `/metrics`: queue length, the
running call, and calls by app, outcome and provider. The estate's Prometheus
scrapes it on the box's loopback. Rejected: no metrics, which leaves Grafana
blind to the queue; and metrics through Caddy, which publishes app names and
counts. Caddy forwards everything under `/wicket-api`, so Wicket refuses
`/metrics` on any request that came through a proxy (one carrying
`X-Forwarded-For`), and the vps-deploy route should also leave it out
([api.md](api.md)).

## The API contract is fixed
_2026-11-04_. [api.md](api.md) is the contract just-a-bot's and ro-housing's
briefs quote word for word. Additions that callers can ignore are allowed;
changing a route, a field or a status means telling the owner first.
