# Wicket docs

Start with the [main README](../README.md). This folder holds what it links to.

| File | What it covers |
|---|---|
| [getting-started.md](getting-started.md) | Running it locally: install, settings, your account, a first call, tests, Ward, the container |
| [architecture.md](architecture.md) | How a call moves through the parts, on one screen |
| [owner-setup.md](owner-setup.md) | Putting Wicket on a VPS: Ward, the secrets, what the deploy stack needs, the first account, the callers, the docs stack |
| [images/](images/shots.md) | The screenshots and the diagram used here, how each was made, and the stand-in cloud used for them |

Going deeper:

- Docs site: built from [`docs-site/`](../docs-site/README.md) with `npm run docs`; it renders these guides and the wiki, with a reference generated from the code. Not deployed yet.
- Project wiki: [corpus/](../corpus/index.md), for decisions, the API contract, status and the briefs that built it.

| Question | Wiki page |
|---|---|
| What does a caller send and get back? | [api.md](../corpus/wiki/api.md) |
| Why is it built this way? | [decisions.md](../corpus/wiki/decisions.md) |
| What do ticket, now serving, cloud model mean? | [glossary.md](../corpus/wiki/glossary.md) |
| What happens when the cloud fails? | [providers.md](../corpus/wiki/providers.md) |
| Who gets into which route? | [sign-in.md](../corpus/wiki/sign-in.md) |
| Where do things stand? | [status.md](../corpus/wiki/status.md) |
