---
title: Move @fastify/static to 10.1.9 or later
created: 2026-11-04
status: open
tags: [dependencies]
---

# Move @fastify/static to 10.1.9 or later

`npm audit` flags `glob` under `@fastify/static` 10.1.5 (GHSA-3g3m-2fjr-6pw4,
moderate). The fix is `@fastify/static` 10.1.9, released 2026-11-04, the day
brief 04 was built, which was too new to take. Wicket isn't exposed to the
bug: the static plugin uses `glob` only with `wildcard: false`, which Wicket
doesn't set, and it serves the page only for a local `npm start` (Caddy serves
it in production; the image has no web files).

## Acceptance

From about 2026-11-18, bump `server/package.json` to the then-current 10.1.x,
run `npm install`, `npm audit`, `npm test` and the built-page test, and commit.
brief-board pins the same 10.1.5 and wants the same bump.
