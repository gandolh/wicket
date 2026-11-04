# Wicket corpus index

Start here. Triage on the summary lines and open at most 2-3 pages.

- [CLAUDE.md](CLAUDE.md) - the rules for this corpus
- [routing.md](routing.md) - which skill runs the work, which layer answers which question
- [log.md](log.md) - chronological record of meaningful changes

## Wiki

<!-- BEGIN CATALOG -->

- [wiki/api.md](wiki/api.md) - The API contract callers build against (just-a-bot and ro-housing quote it), settled 2026-11-04. WICKET_URL and WICKET_TOKEN; POST /v1/jobs, GET /v1/jobs/:id with ?wait long-polling, DELETE /v1/jobs/:id; the admin routes for the page (GET /v1/queue, force close, clear queue); what ticket, nowServing and position mean; the statuses; errors (400, 401, 404, 503 queue_full); how long an answer is kept; health and metrics. Read before writing a caller or changing a route.
- [wiki/architecture.md](wiki/architecture.md) - How Wicket is put together, planned 2026-11-04; the queue, jobs API, tokens and records built the same day (brief 01). Three npm workspaces (shared contract, Fastify + SQLite server, React page); the queue, the providers and the records inside the server and how a job moves through them; the two guards (app tokens for jobs, sessions for the admin routes); the settings; how it runs locally and on the VPS with its backup Ollama container. Updated as each brief lands.
- [wiki/decisions.md](wiki/decisions.md) - Locked calls for Wicket, settled in a grill with the owner on 2026-11-04, each with rejected alternatives and the reason. One service holds the Ollama key and queues every app's LLM calls; Fastify + React like brief-board; Ollama Cloud first with a small local backup model (gemma3:1b in a capped container) and Wicket choosing the model; one first-come-first-served queue running one call at a time; tickets and now serving; an in-memory queue that a restart cancels; records with counts and timings, never text; a queue page with force close and clear queue; sign-in like brief-board with per-app bearer tokens for callers; /wicket and /wicket-api on loopback port 8808; a loopback-only /metrics. Read before proposing to change any of these.
- [wiki/glossary.md](wiki/glossary.md) - Wicket's vocabulary. Job, app and app token, queue, ticket, now serving, position, the cloud model, the backup model and provider, force close, clear queue, a job's status vs a record's outcome, and record, each with the words they replace.
- [wiki/open-questions.md](wiki/open-questions.md) - Calls the build made on its own on 2026-11-04, each taken the conservative way, for the owner to confirm or change. The app tokens as one secret (WICKET_APP_TOKENS); the 200-job queue cap answering 503 queue_full; answers kept 10 minutes in memory; a strict request body; records kept forever; and the backup's context length, which waits for the scoring todo.
- [wiki/overview.md](wiki/overview.md) - What Wicket is (a small service on the VPS that every app in the estate uses for LLM calls, holding the Ollama key and running one call at a time), where the name comes from, who calls it today, and what it deliberately leaves out.
- [wiki/status.md](wiki/status.md) - Snapshot as of 2026-11-04, per area. The design settled in a grill with the owner on 2026-11-04; corpus and briefs 01-05 written the same day. Built: brief 01 (queue, jobs API, app tokens, records). Owner steps (Ward registration, secrets, the vps-deploy stack, the model pull, Ward's local seed entry) and the one open todo (score the backup model on a quiet machine).

<!-- END CATALOG -->

## Work

- The per-area snapshot and the todo list live in
  [wiki/status.md](wiki/status.md). Specs are in [briefs/](briefs/) and run in
  number order; captured ideas are in [todos/](todos/).
