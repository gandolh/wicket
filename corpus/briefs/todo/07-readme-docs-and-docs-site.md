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
