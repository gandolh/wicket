# docs-site

Wicket's documentation site, built with Docusaurus. Nothing here is written
by hand except the landing page, the sidebar and the theme:

| Section | Source | Rendered to |
|---|---|---|
| Guides | `docs/*.md` and `docs/images/` | `docs/guides/` |
| Wiki | `corpus/wiki/*.md`, `corpus/log.md` | `docs/wiki/` |
| Reference | TypeDoc over `shared/src/index.ts` | `static/reference/` |

`scripts/sync-corpus.mjs` renders the first two on every build. Edit the
corpus and `docs/`, never the rendered copies (they are git-ignored).

## Build

It is its own npm package with its own lockfile, not one of the repo's
workspaces. The API's image runs `npm ci` over every workspace, and the docs
toolchain has no place in that build. TypeDoc reads `shared/`, so install the
repo root first.

```bash
npm install                  # repo root, once
npm ci --prefix docs-site    # once
npm run docs                 # from the repo root: sync, reference, build into docs-site/dist
```

`npm start --prefix docs-site` serves it with live reload. The base path is
`/wicket/docs/` (`DOCS_BASE` overrides it). Links from the wiki to source
files render as plain text unless `DOCS_REPO_URL` names the repository's
GitHub address when you build.

Deploying it is an owner step: [docs/owner-setup.md](../docs/owner-setup.md),
section 9.
