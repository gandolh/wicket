# Architecture

Wicket is one Fastify API with an in-memory queue, a SQLite file for records
and accounts, and a React page. It asks one model, on Ollama Cloud; there is
no model on the box.

![How a call moves through Wicket: apps post to wicket-api with their own token; the queue runs one call at a time on Ollama Cloud, and a failed call ends failed with the reason while the next ticket runs; records keep counts and timings; the queue page signs in; Prometheus reads /metrics on loopback](images/architecture.svg)

## A call's path

1. An app posts messages to `/v1/jobs` with its bearer token. The token names
   the app.
2. The call joins the queue with the next ticket. The app gets `202` with its
   ticket, now serving and its place in line.
3. The queue runs one call at a time, in ticket order, on Ollama Cloud with a
   timeout. A cloud failure ends the call `failed` with the reason, and the
   next ticket starts.
4. When the call ends (done, failed or cancelled), a record is written with
   counts and timings only, and the answer waits in memory for 10 minutes.
5. The app long-polls `GET /v1/jobs/:id?wait=25` and gets the answer,
   `{ text, model }`, or the failure's reason.
6. The signed-in page polls `/v1/queue` and can force close the running call
   or clear the waiting ones; their apps see `cancelled`.

## The parts

| Part | Where | Notes |
|---|---|---|
| API contract | [`shared/src/api.ts`](../shared/src/api.ts) | zod schemas used by the server and the page |
| Queue | [`server/src/queue.ts`](../server/src/queue.ts) | FIFO, one at a time, tickets, long-polling |
| Cloud call | [`server/src/providers.ts`](../server/src/providers.ts) | Ollama Cloud only; a failure fails the job, a cancel aborts the request |
| Routes and guards | [`server/src/app.ts`](../server/src/app.ts) | app tokens for jobs, sessions for the page's routes |
| Records | [`server/src/records.ts`](../server/src/records.ts) | SQLite, no text |
| Page | [`web/src/QueuePage.tsx`](../web/src/QueuePage.tsx) | now serving, running, waiting, records |
| Container | [`infrastructure/`](../infrastructure/docker-compose.yml) | `wicket-api`, one container |

## Deeper

- [corpus/wiki/architecture.md](../corpus/wiki/architecture.md): the full
  picture, settings and how it runs.
- [corpus/wiki/decisions.md](../corpus/wiki/decisions.md): why it is built
  this way.
- [corpus/wiki/api.md](../corpus/wiki/api.md): the contract callers code
  against.
