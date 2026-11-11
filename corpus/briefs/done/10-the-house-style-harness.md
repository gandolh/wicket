# Task 10: The house style and the quality harness

**Depends on:**

- In Wicket: nothing. This brief runs first.
- In the owner's skills library:
  - brief 27, *A house style, and a quality harness that enforces it*: the `house-style` configs at `v1.0.0` (vendored into each repo, decision 1), its `house-style:sync` script, the `house-style` skill, and the plugin's `Stop` and `PostToolUse` hooks. **This brief is the proof run that brief 27's step 4 asks for**: Wicket is the first repo to adopt the harness.
  - brief 15, *Enforce the base-ui and code-structure skills in every repo*: how the convention checkers are wired, and when they run `--warn-only`.
- The owner's grilling of 2026-11-10: Q5-Q14 and Q45-Q51 of the skills library's open questions (decided; see Owner decisions).

**Runs before:** 11, 12 and 13. The reformat at width 120 touches 20 files, and those briefs rewrite or move most of them. Formatting first gives one clean reformat commit, and the formatter hook keeps every later diff formatted.

**Before you start:** run `brief-board guide` ([corpus/CLAUDE.md](../../CLAUDE.md)). Until the owner's first sync puts Wicket on the board, skip the board and say so in the hand-back.

## Context

On 2026-11-09 the owner decided three things for every web app: Base UI 1.9.0 everywhere, whole apps on Tailwind v4, and the researched conventions enforced in each repo. The skills library's brief 27 measured the house style the owner and their agents already write, and found it consistent but unenforced. Its answer is two layers:

- **The repo's gate:** `npm run check`, and its fast subset `npm run check:fast`. They hold for a human, any agent and the deploy.
- **The Claude Code layer:** the plugin's `Stop` hook runs `check:fast` and exits 2 on a failure, its `PostToolUse` hook formats each saved file, `.claude/rules/web.md` and `.claude/rules/server.md` are scoped by `paths:`, and a short root `CLAUDE.md` holds the commands.

Wicket is the smallest house repo, so it is the proof. What this brief finds goes back to brief 27 as findings; a rule that looks wrong for Wicket is reported, not patched here.

### What Wicket has today (read 2026-11-10, at commit `456609e`)

- **`tsconfig.base.json`** (22 lines) has `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noImplicitOverride`, `isolatedModules`, and `NodeNext` for `module` and `moduleResolution`. `web/tsconfig.json` overrides to `ESNext` and `bundler`.
- **`eslint.config.js`** (29 lines): `@eslint/js` recommended, `typescript-eslint` recommended untyped (8.69.0), `eslint-plugin-react-hooks` 7.1.1 recommended on `web/src/**`, and `_`-prefixed unused names. It ignores `**/vendor/**` and `docs-site/**`.
- **No formatter.** No Prettier config, no `format` script.
- **Scripts** (root `package.json:16-22`): `typecheck` is `tsc -b && tsc -p web --noEmit` (two runs), `lint` is `eslint .`, `test` is `vitest run`. There is no `check`.
- **No root `CLAUDE.md` and no `.claude/`.** The only `CLAUDE.md` is [corpus/CLAUDE.md](../../CLAUDE.md), which Claude Code loads only once an agent reads under `corpus/`. So an agent that never opens the corpus sees neither the commands nor the hard rules (no secrets, no prompt or answer text at rest, no CI, no pushes, deploys are owner steps).
- **`.npmrc`** has `save-exact=true`. Every dependency is pinned.
- **The image** (`infrastructure/Dockerfile`) runs a full `npm ci` in `node:24-alpine` with only `python3 make g++` added (line 32), and `npm ci --omit=dev` in a second stage with the same `apk add` (line 56). **There is no `git`.**
- `docs-site/` is its own package with its own lockfile. It is out of every command here.

### Measured on 2026-11-10

Taken on a scratch copy of commit `456609e` with `npm ci` done, TypeScript 6.0.3, ESLint 10.9.1, Prettier 3.9.10, typescript-eslint 8.72.2, Node 22.23 (the repo asks for `>=24`).

**Prettier churn.** `trailingComma: "all"`, defaults otherwise, over the 52 code and config files (`.ts`, `.tsx`, `.mjs`, `.css`, `.json`, `.html`; 4,941 lines), vendor, the lockfile, `docs-site/` and Markdown excluded. "Old lines" are lines the formatter rewrites; new lines are what replaces them:

| `printWidth` | Old lines changed | Files | New lines written |
|---|---|---|---|
| 100 | 180 (3.6%) | 30 | 774 |
| 110 | 115 (2.3%) | 27 | 490 |
| 120 | 68 (1.4%) | 20 | 288 |
| 130 | 39 (0.8%) | 13 | 157 |
| 140 | 32 (0.6%) | 12 | 82 |

Brief 27's table says 2.5% for Wicket at 120. The file set and the counting differ; the ranking is the same. **The estate width is 120** (decision 2), so the one-off cost of the reformat is the 120 row: 68 old lines (1.4%) in 20 files, 288 new lines. The 130 column is kept as the measurement that was made, not as a choice. `infrastructure/docker-compose.yml` changes one line more. At every width the same ten files keep a floor of about 30 lines, because Prettier also joins hand-wrapped lines (the `eslint.config.js` rule array, `font-family` in `web/src/styles.css:20`, and the like).

Markdown, if it were formatted at 120: 107 lines in 10 of Wicket's own files (`corpus/routing.md` 28, `docs/owner-setup.md` 23, `docs/README.md` 14, `README.md` 11, and others), one of them an immutable done brief. Not worth it (decision 3).

**TypeScript flags.** `verbatimModuleSyntax` and `erasableSyntaxOnly` added together to `tsconfig.base.json`:

- `erasableSyntaxOnly`: **3 errors**, all parameter properties: `server/src/providers.ts:48` (`readonly kind`), `server/src/queue.ts:34` (`readonly limit`), `server/src/tokens.ts:33` (`private readonly digests`).
- `verbatimModuleSyntax`: **0 errors**, in both `tsc -b` and `tsc -p web --noEmit`.

**The house shapes**, counted with the TypeScript parser over the 41 `.ts`, `.tsx` and `.mjs` files outside vendor:

| Shape | Count | Where |
|---|---|---|
| `enum`, `any`, `@ts-ignore` / `@ts-expect-error`, `TODO` / `FIXME` | 0 | |
| non-null `!` | **58** | 51 in tests (`server/src/queue.test.ts` 31, `app.test.ts` 8, `admin.test.ts` 7, `providers.test.ts` 4, `db.test.ts` 1) and 7 in source: `server/src/app.ts:131, 306, 327, 348`, `db.ts:48`, `queue.ts:279`, `tokens.ts:91` |
| `console` | 3 | `server/src/index.ts:32`, `seed.ts:71, 79`: the entry before its logger exists, and the seed CLI |
| default exports | 3 | `eslint.config.js:10`, `vitest.config.ts:5`, `web/vite.config.ts:44`: configs |
| `process.env` readers in `server/src` | 4 | `index.ts:29`, `seed.ts:60, 61, 67` |
| classes | 10 | 5 `Error` subclasses, and `Queue`, `Records`, `Metrics`, `AppTokens`, which the house would write as factories (review item, not linted) |
| parameter properties | 3 | the `erasableSyntaxOnly` errors above |
| `void` calls (discarded promises) | 15 | |

**The typed rules and the rest of step 4's list**, run through a scratch config over every `.ts` and `.tsx` file (`npx eslint -f json .`):

| Rule | Findings | Where |
|---|---|---|
| `no-floating-promises`, `await-thenable`, `no-unnecessary-type-assertion`, `consistent-type-imports` | 0 | |
| `no-misused-promises` | 1 | `web/src/usePolling.ts:43`: `setTimeout(tick, everyMs)` with an async `tick`; line 45 already writes `() => void tick()` |
| `switch-exhaustiveness-check` | 4, **all false** | `web/src/messages.ts:22, 40, 58, 72`: switches on an open union (`AuthErrorCode` ends in `(string & {})`, `web/vendor/ward/ward-auth-react.d.ts:66`) with a deliberate `default`. `considerDefaultExhaustiveForUnions: true` takes them to 0 (measured) |
| `no-non-null-assertion` | **58** | above |
| `@vitest/eslint-plugin` recommended | 2 | `no-conditional-expect`: `server/src/config.test.ts:20` and `server/src/tokens.test.ts:36`, both an `expect` inside a `catch` |
| `no-process-env` (from `eslint-plugin-n`) (`eslint-plugin-n` 18.5.0) | 4 | the four readers above |
| `no-console` | 3 | the three above, all in CLI files |
| `no-restricted-syntax` (enum), `no-warning-comments`, `no-default-export` (from `eslint-plugin-import-x`) outside `*.config.*`, `react-hooks` recommended | 0 | |

**Timings** (warm, three runs):

| Step | Time |
|---|---|
| `tsc -b` | 0.4-0.5 s (cold 6.5 s with `tsc -p web`) |
| `tsc -p web --noEmit` | 4.5-4.9 s (not incremental) |
| `eslint .`, today's config | 2.4-2.7 s |
| `eslint .`, six typed rules, `projectService` | 7.3-10.1 s |
| `eslint .`, six typed rules, `project` | 7.3-9.1 s (a draw: keep `projectService`) |
| `eslint` on one server file, typed | 1.9-2.0 s; one web file 2.9-3.0 s |
| `prettier --check .` | 1.2-1.3 s |
| `vitest run` (8 files, 86 tests) | 2.6-4.1 s |
| `knip` | 1.2 s |

**knip** with `**/vendor/**` ignored and `docs/images/*.mjs` as an entry: **0 unused files and 0 unused dependencies**, 20 unused exports and 3 unused types (`isUnder`, `pathOf`, `fail`, `parse`, `sameOrigin`, `API_PREFIX`, `PAGE_PATH`, `BODY_LIMIT` in `server/src/app.ts`; `optional`, `DEFAULTS`, `describeIssue`, `WARD_CALLBACK_PATH` in `config.ts`; and others). Exports are a warning (brief 27's rule). Without the `docs/images/*.mjs` entry, `stand-in-cloud.mjs` is reported as an unused file; with default config the vendored Ward bundles are reported as 6 more.

## Owner decisions

Decided on 2026-11-10 unless marked as a default.

1. **Where the configs come from** (Q6, decided 2026-11-10, technical call). `house-style` is **vendored**: Wicket holds a copy with a version header, refreshed by a `house-style:sync` script that finds the `house-style` checkout by name, the way Ward's library is shared today. It is not a git, `github:` or tarball dependency. Both `npm ci` stages of `infrastructure/Dockerfile` run without `git`, and npm locks GitHub dependencies as git URLs, so a dependency would need `git` (or SSH) in every Docker build. So **the Dockerfile is not touched by this brief**, and the two `apk add` lines stay as they are. The copy, its sync script (`package.json` script `house-style:sync`) and the version header come from brief 27; the tag and owner name are never written here. The vendored copy is excluded from Prettier, ESLint and knip, like `server/vendor/`.
2. **Width: 120** (Q8 and Q51, decided 2026-11-10, technical call). One estate width. It changes 68 lines in 20 files and writes 288 (the 120 row above); that reformat is the one-off cost, taken in its own commit (step 2). Record the choice in the decisions entry.
3. **Markdown stays out of Prettier** (Q45, decided 2026-11-10, technical call). `.prettierignore` lists `*.md`.
4. **tsconfig** (Q11, decided 2026-11-10, technical call). Add `verbatimModuleSyntax` and `erasableSyntaxOnly` now; the three parameter properties become declared fields. `exactOptionalPropertyTypes` is not added here: it comes after a count, in a later brief. `strict` is already on, and TypeScript is 6.0.3, past 5.8. `noUncheckedIndexedAccess` is already on (Q50 defers it only where it is off).
5. **Typed lint** (Q12 and Q48, decided 2026-11-10, technical calls). The six typed rules through `projectService`, with `considerDefaultExhaustiveForUnions: true` on `switch-exhaustiveness-check` (its four findings are all the open-union case). `no-floating-promises` names `node:test`'s `describe`, `it` and `test` in `allowForKnownSafeCalls`, which Wicket (vitest) doesn't need.
6. **The house shapes** (Q13 and Q47, decided 2026-11-10, technical calls). All as errors, with these allowances: `console` is allowed in scripts and CLIs; a default export is allowed where a framework needs one (config files). **`!` (`no-non-null-assertion`) is an error in source and a warning in tests**: the seven in source are fixed, and the 51 in `*.test.ts` stay as warnings, with no `nth` helper. `no-process-env` (from `eslint-plugin-n`) starts as a **warning** and brief 13 turns it into an error (a default). Comments as prose are checked by the review gate (Q14), not by lint. Components use named exports (Q49); Wicket has none with a default export.
7. **`check:fast`** (Q10, decided 2026-11-10, technical call). A typecheck plus ESLint on the files changed against `HEAD` and the untracked ones, built incrementally (`tsc -b`). Target 15 s; up to about 30 s is accepted where `tsc` alone is slower. Measured parts: 5-6 s of typecheck and 2-3 s for one typed file, so about 8 s.
8. **The Claude Code layer** (Q7, decided 2026-11-10, technical call). The plugin's hooks: `Stop` runs `check:fast`, `PostToolUse` formats the saved file. Nothing is committed to `.claude/settings.json`.
9. **A root `CLAUDE.md`** (Q46, decided 2026-11-10, technical call). Create one, and move the repo-wide **Hard rules** and **brief-board** sections out of [corpus/CLAUDE.md](../../CLAUDE.md) into it, because they apply outside the corpus. No `features/` question arises here; the server's layout is brief 13's.
10. **`docs-site/` stays outside** Prettier, ESLint, knip and `check`. It has its own `typecheck` and `docs` scripts (default).
11. **No PRs, no branches** (Q4, decided 2026-11-10, owner). Each step is a commit on `main`, pushed to `main`; the owner reviews `main`.

## Files you OWN

- `tsconfig.base.json`, and `web/tsconfig.json` (only to add `incremental` with a `tsBuildInfoFile`).
- `eslint.config.js`.
- New: the Prettier config, `.prettierignore`, `.git-blame-ignore-revs`, `knip.json`, the vendored `house-style` copy and the `house-style:sync` script entry.
- The root `package.json` (scripts, devDependencies, `typescript-eslint` to 8.72.2) and `package-lock.json`.
- The reformat: whitespace-only changes to every file Prettier covers.
- The fixes the rules ask for:
  - `server/src/providers.ts`, `queue.ts`, `tokens.ts` (the three parameter properties);
  - the seven `!` in source (decision 6); the 51 in the tests stay, as warnings;
  - `web/src/usePolling.ts:43`;
  - `server/src/config.test.ts:20`, `server/src/tokens.test.ts:36`.
- New: `.claude/rules/web.md`, `.claude/rules/server.md`, `CLAUDE.md`, `scripts/`.
- [corpus/CLAUDE.md](../../CLAUDE.md): its Hard rules and brief-board sections move out.
- Corpus: [wiki/decisions.md](../../wiki/decisions.md) (a new entry), [wiki/status.md](../../wiki/status.md), [log.md](../../log.md), and [.planned-roots](../../.planned-roots) (drop `.claude` and `scripts` once they exist).

## Files you must NOT touch

- Behaviour. Apart from the fixes above, every change is formatting or configuration.
- `server/vendor/` and `web/vendor/`: generated copies of the Ward library, ignored by ESLint and Prettier.
- `infrastructure/Dockerfile`: decision 1 needs no change to it.
- The layout of `server/src` and the CSS, which are briefs 13 and 12.
- `docs-site/`.
- The skills library and the `house-style` repo.

## What to do

One commit per step, straight on `main`, each with `npm run typecheck`, `npm test`, `npm run lint` and `npm run build` green.

1. **Re-measure.** The numbers above came from a scratch copy; record in the `log.md` entry that they still hold at the commit you start from, and add what brief 27's final configs change (its rule set, the `projectService` allow-list). Any rule that finds more than about 20 real problems, or mostly false ones, goes to the owner before it is turned on. The two this brief already brings are settled (decisions 5 and 6): the `!` rule (error in source, warning in tests) and the exhaustiveness rule (with its option).
2. **Prettier, and the reformat.**
   1. Vendor `house-style` (decision 1) and add `prettier` (pinned) with the config: `printWidth: 120`, `trailingComma: "all"`, from the vendored copy.
   2. Add `.prettierignore`: `*.md`, `server/vendor/`, `web/vendor/`, the vendored `house-style` copy, `package-lock.json`, `dist/`, `data/`, `coverage/`, `docs-site/`.
   3. Add `format` (`prettier --write .`) and `format:check`, and commit this alone.
   4. Run `npm run format` and commit only that, as `style: format with Prettier`. This is the one-off reformat at width 120: about 68 old lines in 20 files.
   5. Put that commit's full hash in `.git-blame-ignore-revs`, in its own commit.
   6. Hand the owner `git config blame.ignoreRevsFile .git-blame-ignore-revs`, as a git setting is an owner step ([corpus/CLAUDE.md](../../CLAUDE.md)).
3. **tsconfig.** Add the two flags. The three parameter properties become declared fields assigned in the constructor, keeping `readonly` and `private`. Add `incremental` and a `tsBuildInfoFile` under `node_modules/.tmp/` to `web/tsconfig.json`. The Dockerfile's `npx tsc -b server` must still build.
4. **ESLint.** Extend the house config with Wicket's roots: web is `web/src`, server is `server/src`, the CLI files are `server/src/index.ts` (later `server.ts`), `server/src/seed.ts` and `docs/images/*.mjs`. The diff in effect:

   | Rule | Today | After | Findings today |
   |---|---|---|---|
   | the six typed rules | off | error, `projectService` | 1 real, 4 false (decision 5) |
   | `no-non-null-assertion` | off | **error in source, warn in `*.test.ts`** (Q47) | 7 in source (fixed), 51 in tests (left as warnings) |
   | `no-restricted-syntax` (enum), `no-warning-comments`, `no-default-export` (from `eslint-plugin-import-x`) outside `*.config.*` | off | error | 0 |
   | `no-console` outside the CLI files | off | error | 0 outside them |
   | `no-process-env` (from `eslint-plugin-n`) on `server/src` outside `config.ts` and tests | off | **warn** | 4 |
   | `@vitest/eslint-plugin` recommended on `*.test.{ts,tsx}` | off | error | 2 |
   | `react-hooks` recommended on `web/src` | on | unchanged | 0 |
   | `better-tailwindcss` | absent | brief 12 | |

   Typed linting needs `allowDefaultProject` for `vitest.config.ts` and `eslint.config.js`; the `.mjs` files take `disableTypeChecked`.
5. **The gate.** `check` runs `typecheck`, `lint`, `format:check`, `check:conventions` and `test`. `check:conventions` is knip (`knip.json` ignores `**/vendor/**`, lists `docs/images/*.mjs` as an entry, and reports exports as a warning) plus the two checkers, with `check-base-ui` `--warn-only` until brief 12 is done and `check-structure` `--warn-only` until brief 13 is done. Add the `house-style:sync` script beside them. `check:fast` runs `typecheck`, then ESLint on the changed and untracked `*.ts`, `*.tsx`, `*.mjs` files that exist, from a small Node script in `scripts/`: no shell-only syntax. Time `check:fast` warm with one changed file, and `check` in full; record both.
6. **`.claude/rules/`**, each under about 40 lines.
   - **`web.md`** (`paths: ["web/src/**"]`): read the `base-ui` skill; Base UI only through `web/src/components/ui/` wrappers (brief 11); a trigger around a component uses `render`; the confirm dialog is the one `ConfirmDialog` wrapper; colours are tokens only; dark mode follows the system until brief 12 replaces it with the Light / Dark / System switch (brief 12 rewrites this line); the vendored Ward hooks are never edited; tests render `QueueView`'s pieces to markup and assert on text, not class names.
   - **`server.md`** (`paths: ["server/src/**", "shared/src/**"]`): read the `code-structure` skill; `config.ts` is the only reader of the environment; **no prompt or answer text at rest and none in a log or an error**, with the test that proves it; errors are `{ code, message }` (`ErrorBody` in `shared/src/api.ts`); app tokens guard `/v1/jobs`, sessions guard the rest of `/v1`, and neither opens the other; `server/vendor/` is generated; `GET /v1/health` stays open for the deploy's check.
   Briefs 12 and 13 add their own lines.
7. **`CLAUDE.md`** at the root, under about 60 lines: one line on what Wicket is; "read [corpus/index.md](../../index.md) first"; the commands (`npm run dev`, `npm run check` before every hand-back, `npm run check:fast`, `npx vitest run <file>`, `npm run seed -w @wicket/server`, `npm run docs`); the places that mislead (the dev ports 8808 and 5179, `.env` at the repo root, the typecheck is two runs, `docs-site/` is a separate package with its own lockfile, the `/wicket-api` prefix is stripped by Caddy and by the server); and the moved Hard rules and brief-board sections. [corpus/CLAUDE.md](../../CLAUDE.md) keeps layout, retrieval, frontmatter, briefs, source of truth, decisions and writing.
8. **Corpus.** Add the decisions entry "The house style, formatted and checked" with the width, the config source, and what was rejected. Update status and the log. Drop `.claude` and `scripts` from [.planned-roots](../../.planned-roots) once they exist. Run `bash corpus/lint.sh` until it is clean.
9. **Report to brief 27.** List every finding in the outcome note for the skills library: the `!` count in tests (kept as warnings), the open-union exhaustiveness case, and `no-misused-promises` on a `setTimeout` callback.

## Acceptance

- [ ] `npm run check` passes. Its run time and `check:fast`'s (warm, one changed file) are in the outcome note, and `check:fast` is under about 15 s.
- [ ] `npx prettier --check .` passes at width 120. `git diff -w <hash>^ <hash>` shows nothing for the reformat commit, and its hash is in `.git-blame-ignore-revs`.
- [ ] `grep -n "verbatimModuleSyntax\|erasableSyntaxOnly" tsconfig.base.json` prints both. `npm run typecheck` passes, and so does `docker build -f infrastructure/Dockerfile .` (not run in the session that wrote this brief: no Docker daemon).
- [ ] `npx eslint .` reports zero errors under step 4's table; the 51 test-file `!` are the only warnings left (plus `no-process-env`'s four until brief 13). Counts before and after are in the outcome note, with every finding left and its reason.
- [ ] A deliberate `enum`, `!` in a source file, `console.log` in `server/src/app.ts`, `// TODO` and an `export default` in a non-config file each fail `npm run lint`. Revert them after.
- [ ] `.claude/rules/web.md` and `server.md` have `paths:` frontmatter. The root `CLAUDE.md` is under about 60 lines and names `npm run check`.
- [ ] With the plugin's hooks on, an agent's edit is formatted on save, and a deliberate type error stops it at `Stop`.
- [ ] `bash corpus/lint.sh` ends clean.

## Interplay

- Brief 11 adds nothing to the gate but its wrapper. Brief 12 adds `better-tailwindcss` and drops `check-base-ui`'s `--warn-only`. Brief 13 ~~adds dependency-cruiser,~~ drops `check-structure`'s `--warn-only`, and turns `no-process-env` (from `eslint-plugin-n`) into an error. (2026-11-11, brief 10: dependency-cruiser landed in this brief instead, as `.dependency-cruiser.cjs` and in `check:conventions`, by the controller's call; brief 13 keeps its deliberate cross-feature import check.)
- The reformat changes `web/src/styles.css` by one line (`font-family`). Brief 12 deletes that file.
- `server/src/testing.ts` moves to `server/src/testing/` in brief 13. Brief 12 rewrites the `web.md` dark-mode line, and its decisions record the family token names (`surface`, `ink`, `accent`, `line`, `danger`).
- The skills library's brief 27 owns the vendored copy and `house-style:sync`; a rule that looks wrong for Wicket is reported there, not patched here.

## Outcome

Built on 2026-11-11 on `main`, committed and not pushed. Commits, in order:
`f42be2a` vendor house-style 1.0.0 and pin its tools, `aa42f94` Prettier at
width 120, `501e322` `style: format with Prettier`, `3b10197` the blame
ignore file, `35d2eee` the tsconfig flags, `104c0e6` the house ESLint
config, `9659a74` the gate, `a0fdee7` the root `CLAUDE.md` and
`.claude/rules/`, `22e4b4d` the decisions entry, then this closeout.

**Re-measured** at `e3b32f6` (the commits since `456609e` touched only the
corpus), with house-style 1.0.0 at library commit `e3c07ae`:

- Prettier at 120: 20 code files, 68 old lines, 288 new, plus one line of
  `infrastructure/docker-compose.yml`. Exactly the 120 row.
- tsc: `verbatimModuleSyntax` 0, `erasableSyntaxOnly` 3 (the same three
  parameter properties).
- ESLint, the house config: `no-misused-promises` 1, `no-non-null-assertion`
  7 in source and 51 in tests, `n/no-process-env` **5** (one more than the
  brief: `docs/images/stand-in-cloud.mjs:14`), every other rule 0.
  `switch-exhaustiveness-check` is 0 because the package sets
  `considerDefaultExhaustiveForUnions`. The package turns
  `vitest/no-conditional-expect` off, so the brief's two findings
  (`config.test.ts:20`, `tokens.test.ts:36`) are not findings and nothing
  changed there.
- knip: 0 unused files and dependencies once `docs-site/` is ignored; 20
  unused exports and 3 unused types, as warnings (the brief's list).
- dependency-cruiser: 0 violations in 55 modules (108 dependencies).
- `check-base-ui --warn-only`: 2 warnings (rule 3 `web/src/ConfirmAction.tsx:1`,
  rule 5 `web/src/styles.css`). `check-structure --warn-only`: 21 (rule 1 ×1,
  rule 3 ×4, rule 6 ×15, rule 11 ×1). Both exit 0.
- What brief 27's final configs change against the brief's scratch config:
  no `allowDefaultProject` (tool configs and JavaScript lint untyped),
  `no-conditional-expect` off and `valid-expect` with `maxArgs: 2`,
  `no-warning-comments` with `location: "start"`, `ban-ts-comment` allowing
  `@ts-expect-error` with a description, `no-explicit-any`, and
  `n/no-process-env` still on in the `console` globs.

**Lint, before and after the fixes.** Before: 13 errors
(`no-misused-promises` 1, `no-non-null-assertion` 7, `n/no-process-env` 5)
and 51 warnings. After: 0 errors, 56 warnings: the 51 test-file `!` (kept,
decision 6) and `n/no-process-env` on `server/src/index.ts:29`,
`server/src/seed.ts:60, 61, 67` and `docs/images/stand-in-cloud.mjs:14`,
a warning in `eslint.config.js` until brief 13. A deliberate `enum`, `!` in
`server/src/app.ts`, `console.log` there, `// TODO` and an `export default` in
a new source file each failed `npm run lint` (exit 1), and were removed.

**The reformat.** `git diff -w 501e322^ 501e322` is not empty: it shows the
same 21 files and 289/69 lines as without `-w`, because Prettier joins and
splits lines, and a changed line break is a change under `-w`. The
non-whitespace changes in it: 48 trailing commas added and 2 dropped (a last
argument now followed by `)` on its line), 4 pairs of parentheses added
around multi-line JSX in a ternary and 1 dropped around an arrow body, one
`;` ending a type-literal member, two `{" "}` for JSX text that began with a
space, and the healthcheck string in `docker-compose.yml` requoted (same
value). The esbuild bundle compare (72 `.ts`, `.tsx`, `.js`, `.mjs`, `.css`
and `.json` files, JSON compared parsed) found 71 identical. The one
difference is `web/src/QueuePage.tsx`: two JSX texts that began with a space
now compile to two children each, `" "` and `"Trying again every few seconds."`
for `" Trying again every few seconds."`, and `" "` and `"sees the ticket as
cancelled, and the next ticket starts."` likewise. The rendered text is the
same.

**Timings** (warm): `check:fast` 5.2-5.8 s with one server file changed,
6.1-6.4 s with one web file, 2.6 s with nothing changed; `check` in full
18.1-19.6 s; `eslint .` 8.4-8.9 s.

**Checks run:** `npm run check` (exit 0; 86 tests), `npm run build` (0),
`npx prettier --check .` (0), `npm run house-style:sync -- --check` (0),
`bash corpus/lint.sh` (clean; one warning from brief 11's `components/ui/`),
`npx tsc -b server` in a copy holding only what the Dockerfile copies (0),
and `docker build -f infrastructure/Dockerfile .`: the first full build failed (exit 1) in the `proddeps` stage, where npm ran better-sqlite3's `node-gyp rebuild` and timed out fetching Node's headers (`gyp ERR! stack AggregateError [ETIMEDOUT]`); the second full build passed (exit 0, image 206 MB), but it reused a `proddeps` layer from a `--target proddeps` build of the same tree that had passed alone, skipping that script as npm 11 does ("install scripts not yet covered by allowScripts"). `proddeps` on the commit before this brief passed alone too. So that stage's `npm ci` ran three times: it failed once beside the `deps` stage and passed twice alone. The cause is not established and did not recur; the stage installs no package this brief added (`--omit=dev`). The plugin's hooks, run by hand with Claude Code's event JSON:
the formatter hook formatted a messy `server/src/metrics.ts` and left
`web/vendor/` and Markdown alone; the Stop hook, after a save noted by
`note-saved-file.mjs`, exited 2 with `TS2322` from a type error in
`web/src/time.ts` on stderr, and 0 once it was reverted; from `server/` with
a `console.log` in `server/src/app.ts` it exited 2 with the ESLint error, then
0.

**Checks skipped:** the live-session hook check waits for the plugin update
on this machine (the hooks were run by hand instead).

**Deviations:**

- `tsconfig.base.json` keeps the house flags itself instead of extending
  `vendor/house-style/tsconfig.base.json`: the image's `deps` stage copies only
  that file, and the Dockerfile is not to be touched (decision 1).
- `n/no-process-env` warns on five reads, not four, and the warning is
  scoped to the three files that read (`server/src/index.ts`,
  `server/src/seed.ts`, `docs/images/*.mjs`), not all of `server/src`, so a
  new reader elsewhere is still an error.
- `.dependency-cruiser.cjs` and dependency-cruiser in `check:conventions`
  landed here, not in brief 13 (the controller's call of 2026-11-11). Brief 13
  and this brief's Interplay line say so.
- knip is configured in `knip.config.js` (spreading the vendored preset), not
  `knip.json`, with `docs-site/**` added to the preset's ignore and the entry
  under `workspaces["."]`.
- `allowDefaultProject` is not needed: the package lints tool configs and
  JavaScript files without types.
- `eslint.config.js` adds a `**/*.cjs` block with Node's CommonJS globals, for
  `.dependency-cruiser.cjs`.
- `pretest` (`tsc -b shared`) is added: without `shared/dist`, 4 of 8 test
  files fail to resolve `@wicket/shared` in a fresh clone.
- `check:fast` runs `npm run typecheck` (both runs), not `tsc -b` alone,
  which would miss the web project.
- `server/src/config.test.ts:20` and `server/src/tokens.test.ts:36`, listed as
  fixes, are untouched: the package turns `vitest/no-conditional-expect` off.
- The acceptance line "`git diff -w` shows nothing" is not met as written
  (see The reformat); the bundle compare stands in for it.
- The re-measure ran in the checkout, step by step and uncommitted until each
  step's numbers were read, not in a scratch clone.
- `.claude/rules/web.md` names today's confirm wrapper, `ConfirmAction.tsx`,
  beside the `ConfirmDialog` brief 11 makes of it.
- The brief-board section of the root `CLAUDE.md` drops "until the owner's
  first sync puts Wicket on the board": Wicket is on the board.

**For the skills library's brief 27** (library paths at commit `e3c07ae`):

1. The `!` rule: 7 in source, fixed with guards; 51 in tests, kept as
   warnings. The open-union `switch` case: `considerDefaultExhaustiveForUnions`
   takes Wicket's four to 0. `no-misused-promises` flagged an async function
   passed to `setTimeout` (`web/src/usePolling.ts:43`); `() => void tick()`
   fixed it.
2. `house-style/eslint.config.js:189-191` gives every JavaScript file an ES
   module's globals, and typescript-eslint's recommended set parses `.cjs` as a
   module, so the `.dependency-cruiser.cjs` the house prescribes fails
   `no-undef` on `module`. Wicket adds a `**/*.cjs` block with
   `n.configs["flat/recommended-script"].languageOptions`; the house config
   could carry it.
3. A script outside `scripts/` (`docs/images/stand-in-cloud.mjs`) has nowhere
   obvious to go. In `console` it may print, but its `process.env` read is an
   error (`house-style/README.md:232-235`); listed in `scripts` it would be
   allowed both. Wicket kept it in `console` with the warning; the docs could
   say a script folder anywhere goes in `scripts`.
4. The knip sample, `export default { ...preset, entry: ["scripts/*.ts"] }`
   (`house-style/README.md:200`, `skills/house-style/references/adoption.md:266`),
   makes knip 6.44.2 print a configuration hint in an npm-workspaces repo
   ("move unused top-level entry to one of workspaces"); it has to be
   `workspaces: { ".": { entry: [...] } }`. A non-workspace package folder
   (`docs-site/`) is reported as 14 unused files until it is in `ignore`.
5. `house-style/README.md:210` shows the tsconfig base extending the copy with
   no word on the Docker trap that `adoption.md:67` describes; Wicket's image
   copies only `tsconfig.base.json`, so the README's line would break its
   build.
6. `adoption.md:251` shows `check:fast` as `tsc -b && …`. Where the web project
   sits outside the `tsc -b` graph (Wicket's `tsc -p web --noEmit`), that
   misses every web type error; it should run the repo's whole typecheck.
7. The reformat acceptance "`git diff -w` shows nothing" (this brief) cannot
   hold: rewrapped lines show under `-w`. The bundle compare is the real proof.
   The sample in `adoption.md:113` covers only JavaScript and TypeScript; CSS
   (esbuild's `css` loader) and JSON (compared parsed) were added here. JSX
   text rewrapped with `{" "}` is a bundle difference to expect and explain.
8. Wicket's `corpus/CLAUDE.md` says code comments don't cite brief numbers,
   and the house asks for "a dated comment naming the brief" when a rule starts
   as a warning (`adoption.md:198, 283`, `README.md:247`). Wicket followed the
   house in `eslint.config.js`; one of the two should give way.
9. The vendored `LICENSE` carries the owner's GitHub name, as Wicket's own
   `LICENSE` and `server/vendor/ward/LICENSE` already do. Nothing else in the
   copy names a machine path, a user or the domain.
10. `.claude/rules/server.md` points at the `code-structure` skill, which isn't
    in the library yet (its brief 03 is open), and `web.md` at the `base-ui`
    skill, untracked in the library while this ran.

**Owner steps:** `git config blame.ignoreRevsFile .git-blame-ignore-revs`;
then `node cli.ts wicket deploy` from the vps-deploy checkout.
