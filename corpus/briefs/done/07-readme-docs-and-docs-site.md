# Task 07: README, docs/ and a docs site, to the estate's standard

## Context

The README follows brief-board's shape but has no pictures, and `docs/` holds
only the owner's setup. The estate's other repos have a README and `docs/`
written to one standard (the `readme-docs` skill) and a Docusaurus docs site
built from the corpus and the TypeScript (the `corpus-docs-site` skill), as
just-a-bot's `docs-site/` is. Bring Wicket to the same standard.

The repo is public: every capture shows a dummy account and dummy jobs only,
and no file names a secret, a machine path, the domain or a username.

Depends on 06 (the README's run steps and status follow what the trial found).

## Files you OWN

- `README.md`, `docs/` (new pages, `docs/images/` with `shots.md`)
- `docs-site/` (new workspace) and the root `package.json` workspaces and
  scripts it needs, the lockfile, `.gitignore`, `.dockerignore`
- `corpus/wiki/status.md`, `corpus/log.md`, `corpus/routing.md`

## Files you must NOT touch

Anything in vps-deploy or `wzd_auth`. The docs site is built, not deployed:
its deploy needs a docs stack in vps-deploy, which is the owner's step.

## What to do

1. **README and `docs/`** with the `readme-docs` skill: a landing-page README
   with a real capture of the queue page as its hero, an honest status line,
   run steps checked against the scripts; `docs/README.md` as the index;
   `docs/getting-started.md` and `docs/architecture.md` where they carry real
   content; captures in `docs/images/` with a `shots.md` saying how each was
   made.
2. **Docs site** with the `corpus-docs-site` skill: a Docusaurus workspace
   whose narrative pages are synced from `corpus/wiki/` and whose reference is
   generated from the TypeScript (TypeDoc over `shared`'s contract, and the
   server's public modules if it fits). One script builds it.
3. **Build the docs site once** to check it. Nothing else heavy.
4. **Owner step**: the vps-deploy docs stack for Wicket's site, listed in
   `status.md` and `docs/owner-setup.md`.

## Acceptance

- The README's commands run as written; every relative link and image
  resolves.
- The docs site builds once without errors.
- `npm run typecheck`, `npm run lint` and `npm test` still pass.
- No personal data in any capture; no secret, local path, domain or username
  in any file.
- `bash corpus/lint.sh` passes.

## Outcome (2026-11-04)

Built with the `readme-docs` and `corpus-docs-site` skills.

- **README**: one-liner, the hero capture, an honest status (built and run
  locally, not deployed), what it does and leaves out, two more captures, how
  it works with the two-call example, four run commands, the layout, docs and
  licence. 79 lines.
- **`docs/`**: `README.md` as the index, `getting-started.md` (install,
  settings, account, run, a first call, Ward, the containers, checks, the
  docs site, common problems), `architecture.md` (a hand-written SVG, a
  call's path, the parts), and owner-setup's local-development section moved
  into getting-started. Owner-setup gained section 9, the docs stack.
- **Captures**: `hero.webp`, `clear-queue-confirm.webp` and
  `after-force-close.webp`, taken during brief 06's container run with a
  throwaway account `demo`, dummy tokens and dummy prompts, 1440×900 @2x,
  WebP, each under 80 KB; `architecture.svg`; all recorded in
  `docs/images/shots.md`. The login page was left out: mostly empty space.
- **`docs-site/`**: Docusaurus 3.10.2 (just-a-bot's vetted versions, React
  pinned to the page's 19.2.8), light only in the page's palette, local
  search, base `/wicket/docs/`. `scripts/sync-corpus.mjs` renders the wiki,
  the log and `docs/*.md` (with `docs/images/`); TypeDoc 0.28.20 renders
  `shared`'s contract. Root `npm run docs` builds it.
- **Two calls taken**: the site is a separate package with its own lockfile,
  not a root workspace as in just-a-bot and trips, so the API image's
  `npm ci` stays as verified in brief 06 (an open question). Links from the
  wiki to source files render as text unless `DOCS_REPO_URL` is set at build
  time, because the repo's own GitHub address would name an account.
- Root eslint ignores `docs-site/` (it has its own `tsc` typecheck);
  `.dockerignore` leaves it out of the image's context.

Checks: one docs build (sync, TypeDoc, Docusaurus, 6 s, no broken links),
served under `/wicket/docs/` and looked at in a browser (landing, a guide
with the diagram, the reference); the site's `tsc`; `npm run typecheck`,
`npm run lint`, `npm test` (84 passed, 1 skipped). The README's commands ran
as written (`npm install`, the seed with a scratch database, `npm run dev`
answering on 8808 and 5179, then stopped). Every relative link in README.md
and `docs/` resolves. A sidebar label and three sentences changed after the
build; the next `npm run docs` picks them up.

Not done here: deploying the site, which needs the owner's vps-deploy docs
stack.
