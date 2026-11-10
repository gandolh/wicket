# Task 10: The house style and the quality harness

**Depends on:**

- In Wicket: nothing. This brief runs first.
- In the owner's skills library:
  - brief 27, *A house style, and a quality harness that enforces it*: the `house-style` package at `v1.0.0`, the `house-style` skill, and the plugin's `Stop` and `PostToolUse` hooks. **This brief is the proof run that brief 27's step 4 asks for**: Wicket is the first repo to adopt the harness.
  - brief 15, *Enforce the base-ui and code-structure skills in every repo*: how the convention checkers are wired, and when they run `--warn-only`.
- The owner's grilling of 2026-11-10, questions Q5-Q14 of the skills library's open questions.

**Runs before:** 11, 12 and 13. The reformat touches 13 TypeScript and CSS files, and those briefs rewrite or move most of them. Formatting first gives one clean reformat commit, and the formatter hook keeps every later diff formatted.

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

Brief 27's table says 2.5% for Wicket at 120. The file set and the counting differ; the ranking is the same. Of the 130 column's 13 files, seven are tests. `infrastructure/docker-compose.yml` changes one line more. At every width the same ten files keep a floor of about 30 lines, because Prettier also joins hand-wrapped lines (the `eslint.config.js` rule array, `font-family` in `web/src/styles.css:20`, and the like).

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

## Owner decisions (defaults this brief builds)

1. **Where the configs come from** (skills library Q6). Default: the `house-style` package. Wicket's constraint is the same as in any repo with this Dockerfile: both `npm ci` stages run without `git`, so a `github:` dependency fails the image build. Default within that: the tagged GitHub tarball URL, which npm fetches without git. If the owner prefers `github:`, add `git` to both `apk add` lines (32 and 56) in the same commit. If Q6 goes the other way, the same rules land as local files with a version header and steps 3-5 don't change. The tag and owner name come from brief 27, never written here.
2. **Width** (Q8). Default: the estate's one width. If it isn't settled, **130**: it changes 39 lines, and 140 saves seven lines more for a looser wrap. Record the choice.
3. **Markdown stays out of Prettier.** Default: `.prettierignore` lists `*.md`. *New question for the grilling.*
4. **tsconfig** (Q11). Default: add `verbatimModuleSyntax` and `erasableSyntaxOnly`, and not `exactOptionalPropertyTypes`.
5. **Typed lint** (Q12). Default: the six rules through `projectService`, with `considerDefaultExhaustiveForUnions: true` on `switch-exhaustiveness-check` (its four findings are all the open-union case). *New question for the grilling*: the option, because it is a loosening.
6. **The house shapes as errors** (Q13). All of them, with one exception that goes back to the owner: **the 51 test-file `!` assertions are over brief 27's "about 20" line.** Source's 7 are fixed. Default for the tests: a `nth(array, index)` helper in `server/src/testing.ts` (it throws a named error instead of returning `undefined`), so `calls[0]!` becomes `nth(calls, 0)`. The alternative is `no-non-null-assertion` as a warning in `*.test.ts`. *New question for the grilling.* `no-process-env` (from `eslint-plugin-n`) starts as a **warning** (brief 13 turns it into an error).
7. **`check:fast`** (Q10). Default: typecheck plus ESLint on the files changed against `HEAD` and the untracked ones. Measured parts: 5-6 s of typecheck and 2-3 s for one typed file, so about 8 s.
8. **The Claude Code layer** (Q7). Default: the plugin's hooks. If the owner chooses committed hooks, add them to `.claude/settings.json` here.
9. **A root `CLAUDE.md`.** Default: create one, and move the repo-wide **Hard rules** and **brief-board** sections out of [corpus/CLAUDE.md](../../CLAUDE.md) into it, because they apply outside the corpus. *New question for the grilling.*
10. **`docs-site/` stays outside** Prettier, ESLint, knip and `check`. It has its own `typecheck` and `docs` scripts.

## Files you OWN

- `tsconfig.base.json`, and `web/tsconfig.json` (only to add `incremental` with a `tsBuildInfoFile`).
- `eslint.config.js`.
- New: the Prettier config, `.prettierignore`, `.git-blame-ignore-revs`, `knip.json`.
- The root `package.json` (scripts, devDependencies, `typescript-eslint` to 8.72.2) and `package-lock.json`.
- The reformat: whitespace-only changes to every file Prettier covers.
- The fixes the rules ask for:
  - `server/src/providers.ts`, `queue.ts`, `tokens.ts` (the three parameter properties);
  - the seven `!` in source, and the 51 in the tests (decision 6);
  - `web/src/usePolling.ts:43`;
  - `server/src/config.test.ts:20`, `server/src/tokens.test.ts:36`.
- New: `.claude/rules/web.md`, `.claude/rules/server.md`, `CLAUDE.md`, `scripts/`.
- [corpus/CLAUDE.md](../../CLAUDE.md): its Hard rules and brief-board sections move out.
- `infrastructure/Dockerfile`: only the two `apk add` lines, and only under decision 1's `github:` branch.
- Corpus: [wiki/decisions.md](../../wiki/decisions.md) (a new entry), [wiki/status.md](../../wiki/status.md), [log.md](../../log.md), and [.planned-roots](../../.planned-roots) (drop `.claude` and `scripts` once they exist).

## Files you must NOT touch

- Behaviour. Apart from the fixes above, every change is formatting or configuration.
- `server/vendor/` and `web/vendor/`: generated copies of the Ward library, ignored by ESLint and Prettier.
- The layout of `server/src` and the CSS, which are briefs 13 and 12.
- `docs-site/`.
- The skills library and the `house-style` repo.

## What to do

One commit per step, each with `npm run typecheck`, `npm test`, `npm run lint` and `npm run build` green.

1. **Re-measure.** The numbers above came from a scratch copy; record in the `log.md` entry that they still hold at the commit you start from, and add what brief 27's final configs change (its rule set, the `projectService` allow-list). Any rule that finds more than about 20 real problems, or mostly false ones, goes to the owner before it is turned on: the `!` rule and the exhaustiveness rule are the two this brief already brings.
2. **Prettier, and the reformat.**
   1. Add `prettier` (pinned) and the config: `printWidth` per decision 2, `trailingComma: "all"`.
   2. Add `.prettierignore`: `*.md`, `server/vendor/`, `web/vendor/`, `package-lock.json`, `dist/`, `data/`, `coverage/`, `docs-site/`.
   3. Add `format` (`prettier --write .`) and `format:check`, and commit this alone.
   4. Run `npm run format` and commit only that, as `style: format with Prettier`.
   5. Put that commit's full hash in `.git-blame-ignore-revs`, in its own commit.
   6. Hand the owner `git config blame.ignoreRevsFile .git-blame-ignore-revs`, as a git setting is an owner step ([corpus/CLAUDE.md](../../CLAUDE.md)).
3. **tsconfig.** Add the two flags. Fix the three parameter properties with a declared field assigned in the constructor, keeping `readonly` and `private`. Add `incremental` and a `tsBuildInfoFile` under `node_modules/.tmp/` to `web/tsconfig.json`. The Dockerfile's `npx tsc -b server` must still build.
4. **ESLint.** Extend the house config with Wicket's roots: web is `web/src`, server is `server/src`, the CLI files are `server/src/index.ts` (later `server.ts`), `server/src/seed.ts` and `docs/images/*.mjs`. The diff in effect:

   | Rule | Today | After | Findings today |
   |---|---|---|---|
   | the six typed rules | off | error, `projectService` | 1 real, 4 false (decision 5) |
   | `no-non-null-assertion` | off | error | 58 |
   | `no-restricted-syntax` (enum), `no-warning-comments`, `no-default-export` (from `eslint-plugin-import-x`) outside `*.config.*` | off | error | 0 |
   | `no-console` outside the CLI files | off | error | 0 outside them |
   | `no-process-env` (from `eslint-plugin-n`) on `server/src` outside `config.ts` and tests | off | **warn** | 4 |
   | `@vitest/eslint-plugin` recommended on `*.test.{ts,tsx}` | off | error | 2 |
   | `react-hooks` recommended on `web/src` | on | unchanged | 0 |
   | `better-tailwindcss` | absent | brief 12 | |

   Typed linting needs `allowDefaultProject` for `vitest.config.ts` and `eslint.config.js`; the `.mjs` files take `disableTypeChecked`.
5. **The gate.** `check` runs `typecheck`, `lint`, `format:check`, `check:conventions` and `test`. `check:conventions` is knip (`knip.json` ignores `**/vendor/**`, lists `docs/images/*.mjs` as an entry, and reports exports as a warning) plus the two checkers, with `check-base-ui` `--warn-only` until brief 12 is done and `check-structure` `--warn-only` until brief 13 is done. `check:fast` runs `typecheck`, then ESLint on the changed and untracked `*.ts`, `*.tsx`, `*.mjs` files that exist, from a small Node script in `scripts/`: no shell-only syntax. Time `check:fast` warm with one changed file, and `check` in full; record both.
6. **`.claude/rules/`**, each under about 40 lines.
   - **`web.md`** (`paths: ["web/src/**"]`): read the `base-ui` skill; Base UI only through `web/src/components/ui/` wrappers (brief 11); a trigger around a component uses `render`; the confirm dialog is the one `ConfirmDialog` wrapper; colours are tokens only; dark mode comes from `prefers-color-scheme`; the vendored Ward hooks are never edited; tests render `QueueView`'s pieces to markup and assert on text, not class names.
   - **`server.md`** (`paths: ["server/src/**", "shared/src/**"]`): read the `code-structure` skill; `config.ts` is the only reader of the environment; **no prompt or answer text at rest and none in a log or an error**, with the test that proves it; errors are `{ code, message }` (`ErrorBody` in `shared/src/api.ts`); app tokens guard `/v1/jobs`, sessions guard the rest of `/v1`, and neither opens the other; `server/vendor/` is generated; `GET /v1/health` stays open for the deploy's check.
   Briefs 12 and 13 add their own lines.
7. **`CLAUDE.md`** at the root, under about 60 lines: one line on what Wicket is; "read [corpus/index.md](../../index.md) first"; the commands (`npm run dev`, `npm run check` before every hand-back, `npm run check:fast`, `npx vitest run <file>`, `npm run seed -w @wicket/server`, `npm run docs`); the places that mislead (the dev ports 8808 and 5179, `.env` at the repo root, the typecheck is two runs, `docs-site/` is a separate package with its own lockfile, the `/wicket-api` prefix is stripped by Caddy and by the server); and the moved Hard rules and brief-board sections. [corpus/CLAUDE.md](../../CLAUDE.md) keeps layout, retrieval, frontmatter, briefs, source of truth, decisions and writing.
8. **Corpus.** Add the decisions entry "The house style, formatted and checked" with the width, the config source, and what was rejected. Update status and the log. Drop `.claude` and `scripts` from [.planned-roots](../../.planned-roots) once they exist. Run `bash corpus/lint.sh` until it is clean.
9. **Report to brief 27.** List every finding in the outcome note for the skills library: the `!` count in tests, the open-union exhaustiveness case, and `no-misused-promises` on a `setTimeout` callback.

## Acceptance

- [ ] `npm run check` passes. Its run time and `check:fast`'s (warm, one changed file) are in the outcome note, and `check:fast` is under about 15 s.
- [ ] `npx prettier --check .` passes. `git diff -w <hash>^ <hash>` shows nothing for the reformat commit, and its hash is in `.git-blame-ignore-revs`.
- [ ] `grep -n "verbatimModuleSyntax\|erasableSyntaxOnly" tsconfig.base.json` prints both. `npm run typecheck` passes, and so does `docker build -f infrastructure/Dockerfile .` (not run in the session that wrote this brief: no Docker daemon).
- [ ] `npx eslint .` reports zero errors under step 4's table. Counts before and after are in the outcome note, with every finding left and its reason.
- [ ] A deliberate `enum`, `!`, `console.log` in `server/src/app.ts`, `// TODO` and an `export default` in a non-config file each fail `npm run lint`. Revert them after.
- [ ] `.claude/rules/web.md` and `server.md` have `paths:` frontmatter. The root `CLAUDE.md` is under about 60 lines and names `npm run check`.
- [ ] With the plugin's hooks on, an agent's edit is formatted on save, and a deliberate type error stops it at `Stop`.
- [ ] `bash corpus/lint.sh` ends clean.

## Interplay

- Brief 11 adds nothing to the gate but its wrapper. Brief 12 adds `better-tailwindcss` and drops `check-base-ui`'s `--warn-only`. Brief 13 adds dependency-cruiser, drops `check-structure`'s `--warn-only`, and turns `no-process-env` (from `eslint-plugin-n`) into an error.
- The reformat changes `web/src/styles.css` by one line (`font-family`). Brief 12 deletes that file.
- `server/src/testing.ts` gains `nth` here and moves to `server/src/testing/` in brief 13.
