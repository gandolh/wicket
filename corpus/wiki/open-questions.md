---
summary: Calls a build made on its own, each taken the conservative way, for the owner to confirm or change. Open as of 2026-11-04: the docs site is a separate package with its own lockfile, not a root workspace as in just-a-bot and trips. The Ollama image question was answered the same day by dropping the backup (decisions.md). Earlier, the owner kept all six calls from the first build (one WICKET_APP_TOKENS secret, the 200-job cap with 503 queue_full, answers kept 10 minutes, a strict body, records kept forever, the backup's context length left at Ollama's default, moot since the backup was dropped), and their history is in log.md.
updated: 2026-11-04
---

# Open questions

Delete an entry the moment the owner answers it. Its history goes to `log.md`.

## The docs site is not a workspace
Taken 2026-11-04. just-a-bot and trips list their `docs-site/` among the root
workspaces; Wicket's is a separate npm package with its own lockfile. Its
API image runs `npm ci` over every workspace, so a docs workspace would add a
manifest copy to the Dockerfile and the whole Docusaurus toolchain to the
image's build stage. The cost is a second install (`npm ci --prefix
docs-site`). The alternative is the estate's usual shape, with the
Dockerfile installing only the server's and shared's dependencies.

## Earlier calls

The six calls the first build made were all kept by the owner on 2026-11-04.
Three of them are recorded in [decisions.md](decisions.md) (the app tokens in
one secret, the queue cap, the strict body); the other three live where they
apply: answers kept 10 minutes in [api.md](api.md) and records kept forever
in [architecture.md](architecture.md). The sixth, the backup's context
length, went with the backup on 2026-11-04.
