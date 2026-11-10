# Task 12: The web app to Tailwind, and the small tools' shared tokens

**Depends on:**

- In Wicket:
  - brief 10, for the gate, the formatter and the `.claude/rules/web.md` this brief extends;
  - brief 11, which puts the Base UI wrapper in `web/src/components/ui/`, so this brief styles it once, in its final place.
- In the owner's skills library:
  - brief 02, *A base-ui skill, styled with Tailwind*: rules 4-8, the `tailwind.md` reference and the method in `migrating-from-plain-css.md`;
  - brief 27, *A house style, and a quality harness that enforces it*: the `better-tailwindcss` lint;
  - brief 11, *wicket's web app to Tailwind*, the estate draft this brief replaces.
- The owner's grilling of 2026-11-10: Q17 (token names), Q18 (dark mode), Q19 (visual parity), Q20 (order), and the new questions in decisions 1, 5 and 6.

**Runs before:** the-board's and lantern's Tailwind briefs, which reuse the token names this brief sets (decision 1). Per Q20's default Wicket goes second in the estate, after the small todo app's dry run.

**Before you start:** run `brief-board guide` ([corpus/CLAUDE.md](../../CLAUDE.md)).

## Context

The owner's call of 2026-11-09: Base UI is styled with Tailwind v4, and whole apps move to Tailwind. Wicket's page is one plain stylesheet with a dark mode. This brief moves it to Tailwind 4.3.5 with the looks unchanged, and **fixes the token names that Wicket, the-board and lantern share**.

### Corrections to the estate draft

- **25 custom properties** is 25 *definitions*: 13 names on `:root` (`web/src/styles.css:6-19`) and 12 of them redefined under `prefers-color-scheme: dark` (lines 27-41). Every name is read: 71 `var()` uses.
- **No third-party CSS.** Base UI ships none, and nothing else is imported. So the unlayered-vendor-CSS trap (`@layer`) from the Almanac work doesn't apply.
- **The root font size is 14 px** (line 21), not 16. No rule uses `rem`, and one uses `em` (`letter-spacing: 0.02em`, line 161).

### The stylesheet today (measured 2026-11-10)

`web/src/styles.css`: **544 lines**, imported once (`web/src/main.tsx:6`), and:

- 53 class selectors, used by 101 lines of `className` in 6 files: `QueueView.tsx` 41, `QueuePage.tsx` 21, `LoginPage.tsx` 17, `ConfirmAction.tsx` 8 (after brief 11, `web/src/components/ui/ConfirmDialog.tsx`), `AccountPage.tsx` 8, `AuthGate.tsx` 6;
- **2** `@media` blocks: dark (line 27) and `max-width: 640px` (line 524, 4 rules);
- **0** `@keyframes`, **0** `transition`, **0** `!important`, **0** `@container`, **0** inline `style=`;
- 86 lines with `px` values;
- 3 `z-index` literals (3, 20, 21: lines 81, 390, 398), 3 `color-mix()` and 4 `rgb()` colours;
- no class read by code or tests: `QueueView.test.tsx` asserts on text only, so **0 class-name assertions to rewrite**.

What each part of the file styles: the page (`:root`, `body`, focus ring, `.muted`, `.small`, `.num`); the header and banner; the notices; the summary cards and the ticket number; sections and the three tables; buttons (`.button` with `-primary`, `-danger`, `-danger-solid`, and `.link-button`); the confirm dialog (`.dialog*`); the gate, login form and field (`.gate*`, `.field*`, `.login-*`); and the account page.

### The family's tokens: what the three repos share

Read from the three `:root` blocks on 2026-11-10:

| Name | Wicket | the-board | lantern |
|---|---|---|---|
| `--bg`, `--surface`, `--surface-sunk`, `--text`, `--text-muted`, `--line`, `--accent`, `--shadow`, `--top-h` | yes | yes, **same values as Wicket** | yes, other values (a warm palette) |
| `--danger`, `--ok` | yes | no (it has `--blocked`, `--done`) | yes |
| `--banner-bg`, `--banner-text` | yes | yes | no |
| the system font stack, `color-scheme: light dark`, a `prefers-color-scheme: dark` block | yes | yes | yes |

So the **names** are shared by all three for nine tokens; the values are shared only by Wicket and the-board. A later shared token file can hold the names and the neutral values, with lantern overriding values.

### The token mapping plan

All values stay exactly as `styles.css` has them. Names go into Tailwind's namespaces, so `--surface` becomes `--color-surface` and is used as `bg-surface`.

| Group | Today | In `@theme` | Utility |
|---|---|---|---|
| Colour, shared by all three (7) | `--bg`, `--surface`, `--surface-sunk`, `--text`, `--text-muted`, `--line`, `--accent` | `--color-bg`, `--color-surface`, `--color-surface-sunk`, `--color-text`, `--color-text-muted`, `--color-line`, `--color-accent` | `bg-surface`, `text-text-muted`, `border-line` |
| Colour, shared by two (4) | `--danger`, `--ok`, `--banner-bg`, `--banner-text` | `--color-danger`, `--color-ok`, `--color-banner-bg`, `--color-banner-text` | `text-danger`, `bg-banner-bg` |
| Shadow | `--shadow` (line 16), 4 uses | `--shadow-card` | `shadow-card` |
| Top bar height | `--top-h` | `--height-top` | `min-h-top` |
| Font | the stack at line 20 | `--font-sans` (replaces Tailwind's) | `font-sans` |
| Type sizes | 12 (×5), 14 (root), 16, 18 (×2), 44 and 56 (the ticket number, phone and desktop) | `--text-small`, `--text-body`, `--text-heading`, `--text-title`, `--text-ticket`, `--text-ticket-phone` | `text-small` |
| Radii | 4 (×6), 8 (×5), 10 (the count pill) | `--radius-control`, `--radius-card`, `--radius-pill` | `rounded-card` |
| Weights | 600 (×5), 650 (×3), 700 (×1) | Tailwind's `font-semibold` and `font-bold` kept; `--font-weight-title: 650` | `font-title` |
| Layers | 3, 20, 21 | `--z-index-bar`, `--z-index-backdrop`, `--z-index-dialog` | `z-dialog` |
| Widths | 1100 (main), 560 (account), 440 (dialog), 360 (gate card) | `--container-page`, `--container-account`, `--container-dialog`, `--container-gate` | `max-w-page` |

Spacing: `--spacing: 4px`, and the default colour, text, radius, shadow and font-weight scales cleared (`--color-*: initial`, and so on), so only Wicket's tokens exist. All spacing values are `n × 4 px` or half-steps: 6 px is `1.5`, 10 px is `2.5`, 14 px is `3.5`, 7 px is `1.75`. No arbitrary spacing values are needed.

Dark mode: the 12 dark values are written once, as a redefinition of the `--color-*` names inside `@media (prefers-color-scheme: dark)` in `@layer base`, and **no `dark:` variant appears in a class name** (decision 2).

**Measured on 2026-11-10** with Tailwind 4.3.5 and `@tailwindcss/vite` on Vite 8.3.5, in a scratch project:

- The `:root` redefinition inside `@layer base` flips `bg-surface`: the built CSS holds the media block after the theme variables.
- With the default scales cleared, `bg-red-500` and `text-sm` produce no CSS.
- `p-4` is `calc(var(--spacing) * 4)`, which is 16 px with `--spacing: 4px`: the 14 px root never enters.
- **`max-sm:` and `max-[640px]:` both compile to `width < 640px`** (`@media not all and (width>=640px)`), while Wicket's rule is `max-width: 640px` (`width <= 640px`). The two differ at exactly 640 px. `@custom-variant phone (@media (max-width: 640px));` compiles to `(width<=640px)`: exact (decision 3).

### What the browser does today that Tailwind's preflight stops

Preflight resets heading size and weight and zeroes `p`, `dl` and `dd` margins. Today the page relies on the browser's defaults in these places, so the screenshots must show each:

- **Five headings take the browser's bold**: `web/src/AccountPage.tsx:41`, `QueuePage.tsx:110, 145, 159` (their rule `.section-head h2` sets size and margin, not weight), and the dialog title (`.dialog-title`, line 408, sets size). The two card titles set 650 (`QueueView.tsx:19, 33`).
- **23 `<p>` elements**; three descendant rules zero their margin (`.now-serving p`, `.running p`, `.gate-card p`) and `.dialog-text p` sets `0 0 8px`. The others (for example `QueuePage.tsx:140`, `.empty muted`) keep the browser's 1em margin today.
- **Descendant element selectors**: `.dialog-text p`, `.account a`, `.facts dt/dd`, `.table th/td/tr`, `.field input`. Content passed in as children (`description` in `ConfirmDialog`, supplied by `QueuePage.tsx:90-94, 120-124`) can't take a class from the wrapper: put the classes on the `<p>` at the call site, or an arbitrary `[&_p]:` variant on the wrapper.
- `button, select { font: inherit }` and the box-sizing reset are preflight's.

The fallback, if native controls shift: import Tailwind's `theme.css` and `utilities.css` without preflight, and keep the page's own resets in `@layer base`.

## Owner decisions (defaults this brief builds)

1. **Token names for the small tools family** (Q17). Default: the table above. Colours keep their existing names (they are already semantic and shared); `--shadow` and `--top-h` take the namespace suffixes `-card` and `top`. The names are the interface for the-board and lantern's briefs, which copy this `@theme` block's names. *New question for the grilling*: `--color-bg` and `--color-text` make `bg-bg` and `text-text`; the alternative is `--color-page` and `--color-ink`, which Q17 mentions as the estate vocabulary and which no family member uses today.
2. **Dark mode** (Q18). Default: `prefers-color-scheme`, through token redefinition, no `dark:` classes. It is what the page does today, and the-board and lantern do the same.
3. **The phone breakpoint.** Default: `@custom-variant phone (@media (max-width: 640px))`, exact to today's rule. Alternative: `max-sm:` and accept the one-pixel shift at 640 px. Not a grilling question; the screenshots at 640 and 641 px decide.
4. **Visual parity** (Q19). Default: screenshots at 1280 and 390 px, **light and dark**, plus 640 and 641 px for the breakpoint. Every difference is fixed or listed with its reason.
5. **Tailwind's scale against a 14 px root.** Default: `--spacing: 4px` with the default scales cleared, as in Almanac's brief (which has a 15 px root). The alternative is moving the root size to `body`; no rule uses `rem`, so it would change nothing visible. The-board has the same 14 px root and lantern 15 px, so the answer is the family's. *New question for the grilling*, shared with Almanac's.
6. **Where the `@layer base` page rules live.** Default: `html` (font, size, line-height, colour, background, `color-scheme`) and `:focus-visible` in `@layer base` in `index.css`, with the 12 dark values. Everything else is a utility.
7. **Motion** (rule 7). Default: parity: nothing animates today, so nothing is added. Enter and exit animations on the dialog are a later call.
8. **Preflight.** Default: on, with the reliances listed above fixed at the call sites.
9. **Class order and `cn()`.** `web/src/lib/cn.ts` uses `extendTailwindMerge` with Wicket's `text-*` sizes, `rounded-*`, `shadow-card` and `font-title`, and a test shows `cn("text-text", "text-body")` keeps both (`text-text` is a colour, `text-body` a size) and `cn("font-semibold", "font-title")` keeps the last.

## Files you OWN

- `web/src/styles.css` (it becomes `web/src/styles/index.css`, then everything but the base layer goes), and `web/src/lib/cn.ts` with its test.
- The `className` values in `web/src/**/*.tsx`, and `web/src/components/ui/`.
- The style import in `web/src/main.tsx`.
- `web/package.json`, pinned: `tailwindcss` 4.3.5, `@tailwindcss/vite` 4.3.5 (peer `vite` `^5.2 || ^6 || ^7 || ^8`, Wicket has 8.3.5), `clsx` 2.1.1, `tailwind-merge` 3.7.0; the root devDependency `eslint-plugin-better-tailwindcss` 4.10.0 (peer `tailwindcss` `^4.1.17`, `eslint` up to 10); `package-lock.json`.
- `web/vite.config.ts` (the plugin, line 52) and `eslint.config.js` (the `better-tailwindcss` block only, `entryPoint: "web/src/styles/index.css"`).
- `web/src/QueueView.test.tsx` only if markup changes the text it reads.
- `.claude/rules/web.md`: the Tailwind lines. `scripts/conventions.json`, if the checker needs one.
- Corpus: [wiki/decisions.md](../../wiki/decisions.md), [wiki/architecture.md](../../wiki/architecture.md), [wiki/status.md](../../wiki/status.md), [log.md](../../log.md).

## Files you must NOT touch

- `server/`, `shared/`, `web/vendor/`.
- Behaviour: handlers, polling, routes, the vendored hooks, the confirm pending logic.
- `docs/images/` captures: they are retaken in a later docs pass, and the outcome note says so. `docs-site/`.
- The image: `.dockerignore` excludes `web/src`, and the Dockerfile builds only `shared` and `server`. This brief changes nothing in it.

## What to do

Follow the skill's `migrating-from-plain-css.md`. One commit per numbered step; after each, `npm run check` and `npm run build` pass.

1. **Screenshots before.** Bring the stack up with [docs/images/shots.md](../../../docs/images/shots.md)'s recipe: a scratch `WICKET_DB`, throwaway tokens, a made-up `demo` account, and Playwright. **Stub `GET /wicket-api/v1/queue` and `/v1/records` with `page.route`** using fixtures shaped like `web/src/QueueView.test.tsx`'s, and freeze the clock (`page.clock`): the page ticks elapsed times from `serverTime`, so live data makes pixel comparison impossible. Keep the images out of git. Take each state at 1280 × 800 and 390 × 844, light and dark, plus the header at 640 and 641:

   | Area | States |
   |---|---|
   | Login | the page; empty submit (field errors); a wrong password (`.auth-error`); with Ward (`WARD_OIDC_*` set to dummies: the button and "or"); `?ward_error=access_denied`; the "session ended" notice; the gate's Loading… and "can't be reached" (stop the API) |
   | Queue | idle (nothing running, nobody waiting); one running and two waiting; the API-down banner; a success notice and an error notice; records with each outcome; the period set to 7 days |
   | Dialogs | Force close; Clear queue with 0, 1 and 2 waiting; one while the action is held |
   | Account | default; the "linked" notice; an error |
   | Keyboard | a focus ring on a button and on a field |

   Record the built CSS: **6,575 bytes, 2,024 gzip** and the JS **369,214 bytes, 111,980 gzip** at commit `456609e`; re-measure at your start.
2. **Set up.** Add the dependencies and the plugin. Write `web/src/styles/index.css`: `@import "tailwindcss"`, `@theme` with the default scales cleared and the mapping above, `--spacing: 4px`, `@custom-variant phone`, and the `@layer base` page rules with the dark redefinition. Keep `styles.css` for now, importing it **after** `index.css`'s layers are declared only if a selector can't move yet; add `cn.ts` and its test. Write a comment at the top of the `@theme` block listing the family names for the-board and lantern.
3. **Migrate one area at a time**, in this order, deleting each rule from `styles.css` as it goes; build after each:
   1. the page: `html`, `body`, `main`, focus ring, `.muted`, `.small`, `.num` (`sr-only`-style helpers where needed);
   2. buttons: one `buttonClass({ variant })` helper for `button`, `-primary`, `-danger`, `-danger-solid` and `.link-button`; used by the native buttons and by `ConfirmDialog`'s trigger, Cancel and confirm;
   3. `ConfirmDialog` in `web/src/components/ui/`: the backdrop, popup, title, description, actions, with `z-dialog`;
   4. the header, banner and notices;
   5. the summary cards, the facts list and the ticket number (`text-ticket`, `phone:text-ticket-phone`);
   6. sections, the three tables and the count pill;
   7. the gate, login form, field and account page (`aria-invalid:border-danger` for `.field input[aria-invalid]`);
   8. the phone rules, as `phone:` variants where each rule's element is.
   Then delete `styles.css`.
4. **Lint.** Turn on `better-tailwindcss`'s correctness rules and its class order as errors; fix what they find.
5. **Screenshots after.** Same states, the same stubs and frozen clock. Compare each pair pixel by pixel (Playwright's comparison or pixelmatch). Fix every difference, or list it with its reason. Expect the preflight reliances above to show first.
6. **Corpus.**
   - [wiki/decisions.md](../../wiki/decisions.md): the page's styling is now Tailwind (the "built like brief-board" entry says "a React 19 page on Vite with Base UI for widgets"; add the Tailwind line and the family token names with the reason: three tools, one vocabulary, values per app).
   - [wiki/architecture.md](../../wiki/architecture.md) and the page file list.
   - Add to `.claude/rules/web.md`: tokens only from `@theme`; no arbitrary colours; the `phone` variant, not `max-sm:`; dark mode through the `@layer base` redefinition.
   - Run `bash corpus/lint.sh --index`, then `bash corpus/lint.sh`.
7. **The gate.** Drop `check-base-ui`'s `--warn-only` from `check:conventions`.

## Acceptance

- [ ] `find web/src -name '*.css'` prints only `web/src/styles/index.css`.
- [ ] `check-base-ui` passes **strict**, with no exception in `scripts/conventions.json`.
- [ ] `grep -rnE "(bg|text|border|fill|stroke|ring|outline|shadow)-\[(#|rgb|hsl)" web/src` prints nothing, and `grep -rn "dark:" web/src` prints nothing.
- [ ] `index.css`'s `@theme` defines exactly the mapped tokens; `bg-red-500` or `text-sm` in a component produces no CSS.
- [ ] The `cn` test passes for `cn("text-text", "text-body")` and `cn("font-semibold", "font-title")`.
- [ ] The screenshot pairs match, light and dark, with every difference listed and explained, and the CSS size before and after in the outcome note.
- [ ] `npm run check` (with `better-tailwindcss`) and `npm run build` pass, and so do the 86 existing tests.
- [ ] The decisions are revisited in [wiki/decisions.md](../../wiki/decisions.md) with a `log.md` entry, and `bash corpus/lint.sh` ends clean.

## Interplay

- Brief 11's renamed `.dialog*` rules are migrated here like any other.
- The-board's and lantern's briefs copy this brief's `@theme` names. If this brief's names change in the grilling (Q17, decision 1), tell them.
- Brief 13 doesn't touch `web/`; they conflict only in `package-lock.json`, so don't run them at the same time.
