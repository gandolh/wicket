---
summary: Snapshot as of 2026-11-04, per area. Designed in a grill with the owner and built the same day, briefs 01-08 (queue and jobs API, the cloud call, sign-in with admin routes and /metrics, the queue page, the container and owner setup, the image smoke-tested locally, README and docs with a Docusaurus docs site, and Ollama Cloud only with the backup dropped); 86 tests; not deployed. The owner's steps in order (Ward registration, secrets, push and deploy with vps-deploy's wicket stack, the account, pointing just-a-bot and ro-housing at it, the docs stack, running Ward's local seed); one open question (the docs site as a separate package); briefs 10-13 open (planned 2026-11-10: the house-style harness, Base UI by the conventions, the web app to Tailwind, the server in the code structure).
updated: 2026-11-10
---

# Status

_2026-11-04_. The owner settled the design in a grill
([decisions.md](decisions.md)) and briefs 01 to 05 built it the same day.
Brief 06 built the images and ran them locally, brief 07 brought the README
and `docs/` to the estate's standard with a docs site, and brief 08 made
Wicket cloud only: the owner dropped the backup model once the Ollama image
turned out to be 6.55 GB. **Not deployed.** Everything the deploy needs is in
`docs/owner-setup.md`.

## By area

- **Queue, jobs API, tokens, records** (brief 01). One in-memory FIFO queue,
  one job at a time, tickets from the highest recorded plus one;
  `POST`/`GET`/`DELETE /v1/jobs` with long-polling; per-app tokens from
  `WICKET_APP_TOKENS`; records with no text ([api.md](api.md)).
- **The cloud call** (briefs 02 and 08). Ollama Cloud only; a failure, or no
  key, ends the job `failed` with the reason and the next ticket runs
  ([providers.md](providers.md)). `result` is `{ text, model }`. Tested with
  stub servers.
- **Sign-in, admin routes, /metrics** (brief 03). The vendored ward-auth
  0.7.0 guards the admin routes; app tokens guard the job routes; sessions may
  force close and clear, with an Origin check; `/metrics` refused through a
  proxy ([sign-in.md](sign-in.md)).
- **Queue page** (brief 04). Now serving, the running call, the waiting
  tickets, calls per app and recent calls; Force close and Clear queue behind
  a confirm dialog.
- **Container and owner setup** (briefs 05, 06, 08). One container,
  `wicket-api`, on loopback 8808; the image is about 210 MB. Built and run
  locally as the compose project `wicket-smoke`: with the backup on 2026-11-04
  (brief 06: a call answered, sign-in, Clear queue, Force close, `/metrics`),
  then cloud only (brief 08: with no key a job ends `failed` saying so, and
  the next ticket runs). `docs/owner-setup.md` is the deploy's whole brief.
  "Sign in with Ward" wasn't walked: Ward's local seed hadn't been run.
- **README, docs, docs site** (brief 07, captures retaken in 08). A landing
  README with captures against a stand-in cloud (a dummy account and dummy
  calls), `docs/getting-started.md`, `docs/architecture.md` with a diagram,
  and `docs-site/`: Docusaurus over the wiki and `docs/`, TypeDoc over
  `shared`, base `/wicket/docs/`. It is a separate package, not a workspace
  ([open-questions.md](open-questions.md)).

86 tests; typecheck, lint and the docs build clean (2026-11-04).

## Open briefs (planned 2026-11-10)

Four briefs carry the owner's calls of 2026-11-09 (Base UI 1.9.0, Tailwind
v4, enforced conventions), to run in number order: 10 the house style and the
quality harness (Wicket is the proof run), 11 Base UI by the conventions, 12
the web app to Tailwind, 13 the server in the code structure. They wait on the
owner's grilling of 2026-11-10. No bump brief is needed: `@base-ui/react` is
already exactly 1.9.0 and the lockfile resolves it.

## Next (owner)

In this order; the details are in `docs/owner-setup.md`.

1. Register Wicket in production Ward (slug `wicket`) and grant your account.
2. Make the secrets: `WARD_OIDC_CLIENT_KEY`, `OLLAMA_API_KEY` (the key
   just-a-bot holds today), `WICKET_APP_TOKENS` (one token per app).
3. Push this repo and deploy with vps-deploy's `wicket` stack, once that
   stack drops the backup container it was written with.
4. Seed your account in the container, then link Ward.
5. Give just-a-bot and ro-housing `WICKET_URL` and their own `WICKET_TOKEN`.
6. The docs: add a `DocsStack` for `wicket` in vps-deploy's `app.ts`
   (`docs-site/dist`, `generator: "docusaurus"`), run `npm ci --prefix
   docs-site && npm run docs` here, and `node cli.ts wicket-docs deploy`
   (`docs/owner-setup.md` section 8).
7. For local development only: run Ward's local seed in a terminal
   (`node seed.mjs` in `wzd_auth`'s `infrastructure/local/`; it lists Wicket
   since 2026-11-04), then walk "Sign in with Ward" with `npm run dev`.

The six calls the first build made on its own were all kept by the owner on
2026-11-04. One call waits in [open-questions.md](open-questions.md): the
docs site as a separate package.

## Open briefs

None.

## Todos

None. The last one became brief 09 on 2026-11-06 and was built on
2026-11-09: @fastify/static is pinned at 10.1.10 (the owner lifted the
2026-11-18 date gate and chose the version brief-board ships). Not deployed;
the owner runs `node cli.ts wicket all` from vps-deploy.
