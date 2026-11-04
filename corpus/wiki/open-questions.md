---
summary: Calls a build made on its own, each taken the conservative way, for the owner to confirm or change. Open as of 2026-11-04: the backup's upstream Ollama image is 6.55 GB (6.1 GB GPU libraries), kept as pinned rather than a slim image of our own. Earlier, the owner kept all six calls from the first build (one WICKET_APP_TOKENS secret, the 200-job cap with 503 queue_full, answers kept 10 minutes, a strict body, records kept forever, the backup's context length left at Ollama's default), and their history is in log.md.
updated: 2026-11-04
---

# Open questions

Delete an entry the moment the owner answers it. Its history goes to `log.md`.

## The backup's image is 6.55 GB
Found 2026-11-04, when the images were first built. `ollama/ollama:0.24.0`
unpacks to 6.55 GB, and 6.1 GB of that is GPU libraries (CUDA 12, CUDA 13,
MLX, Vulkan) that the box, which has no GPU, never loads. Taken: keep the
upstream image as pinned, since the vps-deploy stack is written against it.
The alternative is a small image of our own that copies only the `ollama`
binary and its CPU libraries out of the upstream one (well under 1 GB), at the
cost of a second Dockerfile and a build step in the stack. Worth it if the box
is short of disk.

## Earlier calls

The six calls the first build made were all kept by the owner on 2026-11-04.
Three of them are recorded in [decisions.md](decisions.md) (the app tokens in
one secret, the queue cap, the strict body); the other three live where they
apply: answers kept 10 minutes in [api.md](api.md), records kept forever in
[architecture.md](architecture.md), and the backup's context length in
[providers.md](providers.md).
