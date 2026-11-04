# Wicket corpus index

Start here. Triage on the summary lines and open at most 2-3 pages.

- [CLAUDE.md](CLAUDE.md) - the rules for this corpus
- [routing.md](routing.md) - which skill runs the work, which layer answers which question
- [log.md](log.md) - chronological record of meaningful changes

## Wiki

<!-- BEGIN CATALOG -->

- [wiki/api.md](wiki/api.md) - The API contract callers build against (just-a-bot and ro-housing quote it), settled 2026-11-04. WICKET_URL and WICKET_TOKEN; POST /v1/jobs, GET /v1/jobs/:id with ?wait long-polling, DELETE /v1/jobs/:id; the admin routes for the page (GET /v1/queue, force close, clear queue); what ticket, nowServing and position mean; the statuses; errors (400, 401, 404, 503 queue_full); how long an answer is kept; health and metrics. Read before writing a caller or changing a route.
- [wiki/architecture.md](wiki/architecture.md) - How Wicket is put together, as built 2026-11-04 (briefs 01-07). Three npm workspaces (shared contract, Fastify + SQLite server, React page) and a separate Docusaurus docs-site package; how a job moves through the queue, the providers and the records; the two guards (app tokens for jobs, sessions for the admin routes); the settings; how it runs locally and on the VPS as two containers (the API and a capped backup Ollama), and what the first local run of both images measured.
- [wiki/decisions.md](wiki/decisions.md) - Locked calls for Wicket, settled in a grill with the owner on 2026-11-04, each with rejected alternatives and the reason. One service holds the Ollama key and queues every app's LLM calls; Fastify + React like brief-board; Ollama Cloud first with a small local backup model (gemma3:1b in a capped container) and Wicket choosing the model; one first-come-first-served queue running one call at a time; tickets and now serving; an in-memory queue that a restart cancels; records with counts and timings, never text; a queue page with force close and clear queue; sign-in like brief-board with per-app bearer tokens for callers; /wicket and /wicket-api on loopback port 8808; a loopback-only /metrics; and three calls the build made that the owner kept the same day: the app tokens in one secret (WICKET_APP_TOKENS), at most 200 waiting calls with 503 queue_full, and a strict request body. Read before proposing to change any of these.
- [wiki/glossary.md](wiki/glossary.md) - Wicket's vocabulary. Job, app and app token, queue, ticket, now serving, position, the cloud model, the backup model and provider, force close, clear queue, a job's status vs a record's outcome, and record, each with the words they replace.
- [wiki/open-questions.md](wiki/open-questions.md) - Calls a build made on its own, each taken the conservative way, for the owner to confirm or change. Open as of 2026-11-04: the backup's upstream Ollama image is 6.55 GB (6.1 GB GPU libraries), kept as pinned rather than a slim image of our own; and the docs site is a separate package with its own lockfile, not a root workspace as in just-a-bot and trips. Earlier, the owner kept all six calls from the first build (one WICKET_APP_TOKENS secret, the 200-job cap with 503 queue_full, answers kept 10 minutes, a strict body, records kept forever, the backup's context length left at Ollama's default), and their history is in log.md.
- [wiki/overview.md](wiki/overview.md) - What Wicket is (a small service on the VPS that every app in the estate uses for LLM calls, holding the Ollama key and running one call at a time), where the name comes from, who calls it today, and what it deliberately leaves out.
- [wiki/providers.md](wiki/providers.md) - How a job reaches a model, as built 2026-11-04. Ollama Cloud first, then the backup Ollama; the settings and their defaults (gpt-oss:120b, 120 s; gemma3:1b, 1m keep-alive, 300 s); the backup's context length (Ollama's default until the scoring todo measures it); what counts as a cloud failure (anything but a cancel); why a cancel never falls back and how the code tells it from a timeout; what the caller's error and the log say (never the prompt); running with no key; how it was tested (stub servers, one opt-in live test).
- [wiki/sign-in.md](wiki/sign-in.md) - Who gets into which route, as built 2026-11-04. The vendored ward-auth 0.7.0 as the session guard (cookie wicket_session on /wicket-api, rename off, no sign-up); the two families of routes (app tokens for /v1/jobs, sessions for /v1/queue and /v1/records) and why neither opens the other; why sessions may write here unlike brief-board, and the Origin check on the two admin writes; the 401 rewritten into the API's error shape; /metrics refused through a proxy; accounts and the seed; the settings.
- [wiki/status.md](wiki/status.md) - Snapshot as of 2026-11-04, per area. Designed in a grill with the owner and built the same day, briefs 01-07 (queue and jobs API, providers, sign-in with admin routes and /metrics, the queue page, the containers and owner setup, both images built and smoke-tested locally, README and docs with a Docusaurus docs site); 85 tests; not deployed. The owner's steps in order (Ward registration, secrets, disk room for the 6.55 GB Ollama image, push and deploy with vps-deploy's wicket stack, the model pull, the account, pointing just-a-bot and ro-housing at it, the docs stack, running Ward's local seed); two open questions (the Ollama image's size, the docs site as a separate package); no open briefs; and the open todos (score the backup model; bump @fastify/static).

<!-- END CATALOG -->

## Work

- The per-area snapshot and the todo list live in
  [wiki/status.md](wiki/status.md). Specs are in [briefs/](briefs/) and run in
  number order; captured ideas are in [todos/](todos/).
