---
summary: Locked calls for Wicket, settled in a grill with the owner on 2026-11-04, each with rejected alternatives and the reason. One service holds the Ollama key and queues every app's LLM calls; Fastify + React like brief-board; Ollama Cloud only with Wicket choosing the model (revisited 2026-11-04: the earlier local backup model, gemma3:1b in a capped container, is superseded and kept as history); one first-come-first-served queue running one call at a time; tickets and now serving; an in-memory queue that a restart cancels; records with counts and timings, never text; a queue page with force close and clear queue; sign-in like brief-board with per-app bearer tokens for callers; /wicket and /wicket-api on loopback port 8808; a loopback-only /metrics; and three calls the build made that the owner kept the same day: the app tokens in one secret (WICKET_APP_TOKENS), at most 200 waiting calls with 503 queue_full, and a strict request body; and, from 2026-11-10, the house style: vendored house-style configs, Prettier at width 120, npm run check as the gate; and, from 2026-11-10, the period filter as a RadioGroup. The server's structure (2026-11-11) is in decisions-server.md. Read before proposing to change any of these.; the page's Tailwind styling and its theme switch (2026-11-11) are in decisions-web.md
updated: 2026-11-13
---

# Decisions

Each entry passed three tests: hard to reverse, surprising without context, and
a real trade-off. Changing one needs an explicit revisit and a `log.md` entry.
All of these were settled by the owner on 2026-11-04: most in the grill, and
the last three when the owner kept calls the first build had made on its own.
Calls a build makes on its own wait in [open-questions.md](open-questions.md)
until the owner confirms them. The server's layout, its timeouts and its
guards' shape are in [decisions-server.md](decisions-server.md).

## One service holds the key and queues every app's LLM calls
_2026-11-04_. Every app in the estate that needs an LLM calls Wicket, and only
Wicket holds the Ollama Cloud key. Today's callers are just-a-bot's `/ask` and
ro-housing's "fill the gaps" job, which reads one listing page. Rejected: each
app keeping its own copy of the key and calling Ollama itself. The key spreads
across repos and deploy secrets, and two apps calling at once compete for the
same quota with nobody seeing it.

## A Fastify API and a React page, built like brief-board
_2026-11-04_. npm workspaces `shared`, `server` and `web`: a Fastify 5 API on
better-sqlite3, a React 19 page on Vite with Base UI for widgets, styled with Tailwind ([decisions-web.md](decisions-web.md)), and ward-auth
vendored into `server/vendor/ward` and `web/vendor/ward`. Same licence (MIT).
The estate already runs this shape, so deploys, sign-in and reviews carry over.
Rejected: a bare proxy with no page, which leaves the owner blind to what is
waiting; and a new stack, which nobody here maintains yet. _Revisited
2026-11-11_: the server, flat until then, is grouped by feature, by the
owner's call of 2026-11-09 ([decisions-server.md](decisions-server.md)). The
three workspaces and the vendored auth are unchanged.

## Ollama Cloud only, and Wicket picks the model
_2026-11-04_, a revisit of the two backup decisions below. Every call goes to
Ollama Cloud with the cloud model, a setting that defaults to `gpt-oss:120b`
(just-a-bot's default). There is no model on the box. When the cloud fails (an
error, a timeout, a spent quota, or no key), the job ends `failed` with the
reason and the next ticket runs; callers already handle a failed call. Callers
never name a model, and a result is `{ text, model }`. The owner, shown that
the official `ollama/ollama:0.24.0` image is 6.55 GB (6.1 GB of it GPU libraries) and
that the VPS had 7.1 GB free of 38 GB: "ollama cloud only, drop any ollama
local briefs or idea". Rejected: a slim CPU-only Ollama image of our own,
which still costs a second Dockerfile, a build step and a 1.3 GB memory cap on
a tight box; and the official image once vps-deploy frees 3.9 GB, which would
still eat most of the disk. Accepted with it: when the cloud is down or the
quota is spent, every app's call fails until it is back.

## Ollama Cloud first, a small local model as the backup, and Wicket picks
_Superseded 2026-11-04 by "Ollama Cloud only" above; kept as history._

_2026-11-04_. A call goes to Ollama Cloud with the cloud model, a setting that
defaults to `gpt-oss:120b` (just-a-bot's default). When the cloud fails (an
error, a timeout, a quota refusal), the same call goes to the backup model on
an Ollama container on the VPS. Callers never name a model; each result says
whether the backup answered. Rejected: cloud only, where an outage or a spent
quota stops every app; local only, where a 1B model is too weak to be the
first answer; and callers picking models, which spreads cost and makes the
queue's timings meaningless.

## The backup is gemma3:1b in a small, capped container
_Superseded 2026-11-04 by "Ollama Cloud only" above; kept as history._

_2026-11-04_. The backup Ollama runs `gemma3:1b`, capped at about 1.3 GB of
RAM and one CPU core, with a short keep-alive (1 minute, or 0) so the model
leaves memory when idle. The VPS is shared with every other app, and the
backup is for the rare hour the cloud is down. Rejected: a bigger model, which
the box can't spare memory for; and keeping the model loaded, which holds
memory all day for calls that mostly never come. Whether gemma3:1b reads
Romanian listings well enough was a todo, deleted with the backup.

## One queue, first come first served, one call at a time
_2026-11-04_. Every call from every app waits in one FIFO queue, and exactly one
runs at a time. Rejected: a queue per app, priorities, and parallel cloud
calls. One at a time keeps the quota and the box calm, and makes every wait
explainable: the calls ahead of yours.

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
_2026-11-04_. Per call, Wicket keeps the app, the ticket, the model, the wait
time, the run time and the outcome (ok, failed, cancelled). It never stores
a prompt or an answer, in the database or in its logs. The answer is held in
memory only until its caller fetches it or it expires.
Rejected: keeping prompts and answers for debugging. Listings and Discord
messages are other people's words, and what isn't stored can't leak.

## A queue page with force close and clear queue
_2026-11-04_. The page at `/wicket` shows now serving, the running call (app,
ticket, elapsed time, model), the waiting tickets (app, time waited),
and recent records and counts. Two actions: **Force close** aborts the running
call's request (Ollama stops generating when the request is aborted), and
**Clear queue** drops every waiting ticket. Clear queue is always available,
the fallback if force close doesn't free the queue. Callers whose ticket was
closed or cleared see `cancelled`. Rejected: a read-only
page, which leaves a stuck call blocking every app until a restart.

_Changed 2026-11-13_, the owner, on the estate redesign board. The layout is
still a header, a page and plain tables, with no new navigation, and the owner
still rejects metaphor-heavy navigation. But at 1280 px the page is two columns:
Now serving and Running are one card in a live column beside the log (Calls per
app, Recent calls). History, the 2026-11-04 line: "Conventional layout: a
header, a page, plain tables." See [design.md](../../docs/design.md) and
[decisions-web.md](decisions-web.md).

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
`/wicket-api`, the container on loopback port 8808. Rejected: a host of its own, which needs a DNS record
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

## The app tokens are one secret, not rows in the database
_2026-11-04_, a call the first build made, kept by the owner. Every app's
token sits in one deploy secret, `WICKET_APP_TOKENS=app=token,app=token`,
each token at least 32 characters (`openssl rand -hex 32`). Adding an app
means a new pair on that line and a restart of `wicket-api`. Rejected for now:
tokens minted by a command and stored hashed in SQLite, which needs a token
page or a command run inside the container, for two callers. Revisit when
there are more than a handful of apps.

## At most 200 calls wait, and the next gets 503 queue_full
_2026-11-04_, a call the first build made, kept by the owner. The 201st
waiting call is refused with `503 queue_full`, so a caller looping by mistake
can't grow the in-memory queue without bound. It is part of the contract
([api.md](api.md)), which callers quote, and a caller that never fills the
queue never sees it. Rejected: no cap, which leaves memory to the callers'
good behaviour; a lower cap or a cap per app, which nothing measured yet
calls for.

## The request body is strict
_2026-11-04_, a call the first build made, kept by the owner. An unknown field
in `POST /v1/jobs` (a `model`, `stream`, `options`) is a 400, so a caller that
thinks it chose a model finds out at once instead of being silently ignored.
Callers quote this in their briefs. Rejected: dropping unknown fields, which
lets a caller believe it picked a model or turned on streaming when it didn't.

## The house style, formatted and checked
_2026-11-10_, the owner's grilling (technical calls); built 2026-11-11.
Wicket takes the estate's house style from the `house-style` configs,
**vendored** into `vendor/house-style/` with a version header and refreshed by
`npm run house-style:sync`. Prettier runs at width **120**, the one estate
width: the reformat changed 68 lines in 20 files, in one commit listed in
`.git-blame-ignore-revs`. `npm run check` is the gate for a human, an agent
and the deploy, and `check:fast` (the typecheck, then ESLint on the changed
files) is what the Claude Code plugin's Stop hook runs. `tsconfig.base.json`
holds the house flags itself rather than extending the copy, because the image
copies only that file before `tsc -b server`. Rejected: house-style as a git
or `github:` dependency, which needs git in both `npm ci` stages of the image;
widths 100 and 110 (180 and 115 lines changed) and 130 or 140, which split the
estate across widths; formatting Markdown (107 lines in 10 files, one of them
an immutable done brief).

## The period filter is a RadioGroup
_2026-11-10_, the owner's grilling (technical calls); built 2026-11-11. The
"Calls per app" period (Last 24 hours, Last 7 days) switches what a table
shows and saves nothing, so it is a Base UI `RadioGroup` drawn as a segmented
pair, where the arrow keys move and choose
([components/ui/RadioGroup.tsx](../../web/src/components/ui/RadioGroup.tsx)).
Base UI is imported only under `web/src/components/ui/`. Rejected: a Base UI
`Select`, a two-option dropdown for a filter; the native `<select>` it
replaced; `ToggleGroup`, which is for pickers that save on each choice.
