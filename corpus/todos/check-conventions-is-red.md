---
title: npm run check is red on check:conventions
created: 2026-11-24
status: open
tags: [harness]
---

# `npm run check` is red on `check:conventions`

Found on 2026-11-24 while closing brief 16, which did not cause it: the same failure shows with that brief's changes stashed. knip reports:

- an unused file, `design/estate-redesign/manifests/wicket.tokens.css`, from the redesign board's copy of 2026-11-20. `design/` is reference material, so the likely fix is to add `design/**` to `ignore` in `knip.config.ts`, beside `docs-site/**`.
- six exports nothing imports: `NOW` (`web/e2e/fixtures.ts`), `Unauthorized` (`web/src/api.ts`), `AUTH_BASE_PATH` and `authClient` (`web/src/auth.ts`), `pageOf` (`web/src/route.ts`), and the `RadioOption` type (`web/src/components/ui/RadioGroup.tsx`).

For each export, find out whether it lost its last caller in a later brief (`git log -S`) or was never used outside its file, then drop the `export`, or the code if nothing uses it. `Unauthorized` is named in two other files, so check those before changing it. Done when `npm run check` exits 0.
