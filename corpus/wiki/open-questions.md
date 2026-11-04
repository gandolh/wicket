---
summary: Calls a build made on its own, each taken the conservative way, for the owner to confirm or change. None open as of 2026-11-04; the owner kept all six from the first build (one WICKET_APP_TOKENS secret, the 200-job cap with 503 queue_full, answers kept 10 minutes, a strict body, records kept forever, the backup's context length left at Ollama's default), and their history is in log.md.
updated: 2026-11-04
---

# Open questions

Delete an entry the moment the owner answers it. Its history goes to `log.md`.

None open (2026-11-04).

The six calls the first build made were all kept by the owner on 2026-11-04.
Three of them are recorded in [decisions.md](decisions.md) (the app tokens in
one secret, the queue cap, the strict body); the other three live where they
apply: answers kept 10 minutes in [api.md](api.md), records kept forever in
[architecture.md](architecture.md), and the backup's context length in
[providers.md](providers.md).
