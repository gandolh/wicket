# Log

## [2026-11-04] decision | Design settled in a grill with the owner

Wicket is one service on the VPS that every app uses for LLM calls: it holds
the Ollama key, queues calls first come first served, and runs one at a time,
on Ollama Cloud first and a small backup model on the box when the cloud
fails. Tickets and now serving, an in-memory queue, records with counts and
timings only, a queue page with force close and clear queue, sign-in like
brief-board, per-app tokens, `/wicket` and `/wicket-api` on port 8808, and a
loopback-only `/metrics`. See [wiki/decisions.md](wiki/decisions.md) and the
contract in [wiki/api.md](wiki/api.md).

## [2026-11-04] todo | Corpus bootstrapped, briefs 01 to 05 filed

Wrote the wiki spine (overview, architecture as planned, decisions, glossary,
the API contract, status, open questions) and five briefs: the queue and jobs
API, the providers, sign-in with the admin routes and metrics, the queue page,
and the containers with the owner's setup. Details the build picked on its own
(one secret for the app tokens, a 200-job cap, answers kept 10 minutes, a
strict body, records kept forever) wait for the owner in
[wiki/open-questions.md](wiki/open-questions.md). Filed the todo to score the
backup model on a quiet machine.
