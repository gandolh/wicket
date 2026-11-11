# Task 12: The web app to Tailwind, a theme switch, and the small tools' shared tokens

**Depends on:**

- In Wicket:
  - brief 10, for the gate, the formatter and the `.claude/rules/web.md` this brief extends;
  - brief 11, which puts the Base UI wrappers (`ConfirmDialog`, `RadioGroup`) in `web/src/components/ui/`, so this brief styles them once, in their final place, and builds the theme switch on `RadioGroup`.
- In the owner's skills library:
  - brief 02, *A base-ui skill, styled with Tailwind*: rules 4-8, the `tailwind.md` reference and the method in `migrating-from-plain-css.md`;
  - brief 27, *A house style, and a quality harness that enforces it*: the `better-tailwindcss` lint;
  - brief 11, *wicket's web app to Tailwind*, the estate draft this brief replaces.
- The owner's grilling of 2026-11-10: Q17 and Q61 (token names), Q18 (the theme switch), Q19 (visual parity), Q20 (order), Q44 (root font size), Q60 and Q62 (tests, type scale, breakpoint). All decided; see Owner decisions.

**Runs before:** the-board's and lantern's Tailwind briefs, which reuse the token names this brief sets (decision 1). Per Q20 (decided 2026-11-10, technical call) Wicket goes second in the estate, after the small todo app's dry run. Brief 14 (the redesign) comes after this brief.

**Before you start:** run `brief-board guide` ([corpus/CLAUDE.md](../../CLAUDE.md)).

## Context

The owner's call of 2026-11-09: Base UI is styled with Tailwind v4, and whole apps move to Tailwind. Wicket's page is one plain stylesheet with a dark mode. This brief moves it to Tailwind 4.3.5 with the looks unchanged, adds the Light / Dark / System switch, and **fixes the token names that Wicket, the-board and lantern share**.

### Corrections to the estate draft

- **25 custom properties** is 25 *definitions*: 13 names on `:root` (`web/src/styles.css:6-19`) and 12 of them redefined under `prefers-color-scheme: dark` (lines 27-41). Every name is read: 71 `var()` uses.
- **No third-party CSS.** Base UI ships none, and nothing else is imported. So the unlayered-vendor-CSS trap (`@layer`) from the Almanac work doesn't apply.
- **The root font size is 14 px** (line 21), not 16. No rule uses `rem`, and one uses `em` (`letter-spacing: 0.02em`, line 161). By Q44 it moves onto `body` (decision 5).

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

**The converged names** (Q17 and Q61, decided 2026-11-10, technical call): a name names a role, never a value, and the family uses `surface`, `ink`, `accent`, `line` and `danger`, as `bg-surface` and `text-ink`, with no `bg-bg`. Today's `--text` becomes `ink` and `--text-muted` becomes `ink-muted`. The page background (`--bg`) becomes `page` (`bg-page`), which is the one name this brief adds to the five. **This brief is the source of the list**: the-board's and lantern's Tailwind briefs and brief-board's brief 18 copy it, and wherever theirs differ, this list wins.

### The token mapping plan

All values stay exactly as `styles.css` has them. Names go into Tailwind's namespaces, so `--surface` becomes `--color-surface` and is used as `bg-surface`.

| Group | Today | In `@theme` | Utility |
|---|---|---|---|
| Colour, shared by all three (7) | `--bg`, `--surface`, `--surface-sunk`, `--text`, `--text-muted`, `--line`, `--accent` | `--color-page`, `--color-surface`, `--color-surface-sunk`, `--color-ink`, `--color-ink-muted`, `--color-line`, `--color-accent` | `bg-page`, `bg-surface`, `text-ink-muted`, `border-line` |
| Colour, shared by two (4) | `--danger`, `--ok`, `--banner-bg`, `--banner-text` | `--color-danger`, `--color-ok`, `--color-banner-bg`, `--color-banner-text` | `text-danger`, `bg-banner-bg` |
| Shadow | `--shadow` (line 16), 4 uses | `--shadow-card` | `shadow-card` |
| Top bar height | `--top-h` | `--height-top` | `min-h-top` |
| Font | the stack at line 20 | `--font-sans` (replaces Tailwind's) | `font-sans` |
| Type sizes (Q62: a named scale, kept in px as today) | 12 (×5), 14 (the body size), 16, 18 (×2), 44 and 56 (the ticket number, phone and desktop) | `--text-small`, `--text-body`, `--text-heading`, `--text-title`, `--text-ticket`, `--text-ticket-phone` | `text-small` |
| Radii | 4 (×6), 8 (×5), 10 (the count pill) | `--radius-control`, `--radius-card`, `--radius-pill` | `rounded-card` |
| Weights | 600 (×5), 650 (×3), 700 (×1) | Tailwind's `font-semibold` and `font-bold` kept; `--font-weight-title: 650` | `font-title` |
| Layers | 3, 20, 21 | `--z-index-bar`, `--z-index-backdrop`, `--z-index-dialog` | `z-dialog` |
| Widths | 1100 (main), 560 (account), 440 (dialog), 360 (gate card) | `--container-page`, `--container-account`, `--container-dialog`, `--container-gate` | `max-w-page` |

Spacing: Tailwind's default `--spacing` (0.25rem, which is 4 px on the browser's 16 px root, decision 5), and the default colour, text, radius, shadow and font-weight scales cleared (`--color-*: initial`, and so on), so only Wicket's tokens exist. All spacing values are `n × 4 px` or half-steps: 6 px is `1.5`, 10 px is `2.5`, 14 px is `3.5`, 7 px is `1.75`. No arbitrary spacing values are needed.

Dark mode (decision 2): the 12 dark values are written once, as a redefinition of the `--color-*` names under `[data-theme="dark"]` in `@layer base`, with `@custom-variant dark` keyed off the same attribute. **No `dark:` variant appears in a class name**, because every utility follows the redefined tokens.

**Measured on 2026-11-10** with Tailwind 4.3.5 and `@tailwindcss/vite` on Vite 8.3.5, in a scratch project:

- The `:root` redefinition inside `@layer base` flips `bg-surface`: the built CSS holds the media block after the theme variables.
- With the default scales cleared, `bg-red-500` and `text-sm` produce no CSS.
- `p-4` is `calc(var(--spacing) * 4)`, which was 16 px with `--spacing: 4px`. With Q44 the root is back at 16 px and the default `--spacing` is 0.25rem, so `p-4` is 16 px again; step 2 confirms it with a computed-style check.
- **`max-sm:` and `max-[640px]:` both compile to `width < 640px`** (`@media not all and (width>=640px)`), while Wicket's rule is `max-width: 640px` (`width <= 640px`). The two differ at exactly 640 px. By Q62 that one pixel is accepted and `max-sm:` is used (decision 3).

### What the browser does today that Tailwind's preflight stops

Preflight resets heading size and weight and zeroes `p`, `dl` and `dd` margins. Today the page relies on the browser's defaults in these places, so the screenshots must show each:

- **Five headings take the browser's bold**: `web/src/AccountPage.tsx:41`, `QueuePage.tsx:110, 145, 159` (their rule `.section-head h2` sets size and margin, not weight), and the dialog title (`.dialog-title`, line 408, sets size). The two card titles set 650 (`QueueView.tsx:19, 33`).
- **23 `<p>` elements**; three descendant rules zero their margin (`.now-serving p`, `.running p`, `.gate-card p`) and `.dialog-text p` sets `0 0 8px`. The others (for example `QueuePage.tsx:140`, `.empty muted`) keep the browser's 1em margin today.
- **Descendant element selectors**: `.dialog-text p`, `.account a`, `.facts dt/dd`, `.table th/td/tr`, `.field input`. Content passed in as children (`description` in `ConfirmDialog`, supplied by `QueuePage.tsx:90-94, 120-124`) can't take a class from the wrapper: put the classes on the `<p>` at the call site, or an arbitrary `[&_p]:` variant on the wrapper.
- `button, select { font: inherit }` and the box-sizing reset are preflight's. (After brief 11 there is no `<select>`.)

The fallback, if native controls shift: import Tailwind's `theme.css` and `utilities.css` without preflight, and keep the page's own resets in `@layer base`.

## Owner decisions

Decided on 2026-11-10 unless marked as a default.

1. **Token names for the small tools family** (Q17 and Q61, decided 2026-11-10, technical call). The table above: `page`, `surface`, `surface-sunk`, `ink`, `ink-muted`, `line`, `accent`, `danger`, `ok`, `banner-bg`, `banner-text`; `--shadow` and `--top-h` take the suffixes `-card` and `top`. No `bg-bg`, no `text-text`. The names are the interface for the-board's and lantern's briefs and for brief-board's brief 18, which copy this `@theme` block's names.
2. **Dark mode: a Light / Dark / System switch, light by default** (Q18, decided 2026-11-10, owner). A first visit shows the light theme, not the system's. `dark:` keys off a `data-theme` attribute through `@custom-variant dark`, not `prefers-color-scheme`. The 12 dark values stay one block in `@layer base`, now under `[data-theme="dark"]`, redefining `--color-*`, so every utility follows. The choice is kept on the device in `localStorage` (Wicket keeps no other settings). The control lives on the account page, on brief 11's `RadioGroup` wrapper, and writes nothing to the API. Step 6 builds it.
3. **The phone breakpoint** (Q62, decided 2026-11-10, technical call). `max-sm:` is used, with no `phone` variant, and the one-pixel edge at 640 px is accepted. `phone:` is replaced by `max-sm:` throughout (`max-sm:text-ticket-phone`).
4. **Visual parity** (Q19, decided 2026-11-10, owner). Close enough: screenshots at 1280 and 390 px in light show no visible change to layout or colour. A few pixels of drift in spacing or rounding needn't be fixed or listed. The one intended difference, the period `RadioGroup`, is brief 11's and is already described. Dark is checked for unreadable text.
5. **The 14 px root** (Q44, decided 2026-11-10, technical call). The root font size goes back to the browser's default, and the app's 14 px moves onto `body`. A pixel size on `html` overrides the reader's own font setting and skews every `rem` utility. Tailwind's default spacing then stays (4 px at a 16 px root), with the default text, radius, shadow and colour scales cleared. No rule here uses `rem`, so nothing visible changes. The same applies to the-board (14 px) and lantern (15 px).
6. **Where the `@layer base` page rules live** (default). `html` (`color-scheme`) and `body` (font, 14 px size, line-height, colour, background), and `:focus-visible`, in `@layer base` in `index.css`, with the 12 dark values under `[data-theme="dark"]`. Everything else is a utility.
7. **Motion** (rule 7, default). Parity: nothing animates today, so nothing is added. Enter and exit animations on the dialog are a later call.
8. **Preflight** (default). On, with the reliances listed above fixed at the call sites.
9. **Class order and `cn()`** (default; Q62 for the scale). `web/src/lib/cn.ts` uses `extendTailwindMerge` with Wicket's `text-*` sizes, `rounded-*`, `shadow-card` and `font-title`, and a test shows `cn("text-ink", "text-body")` keeps both (`text-ink` is a colour, `text-body` a size) and `cn("font-semibold", "font-title")` keeps the last.
10. **Tests** (Q60 and Q62, decided 2026-11-10, technical calls). The existing tests assert on text, so no class-name assertion needs rewriting. The theme module's tests run under jsdom (brief 11 adds it); flows stay in Playwright. Tests select by role, and `data-testid` only where no role fits.
11. **No PRs, no branches** (Q4, decided 2026-11-10, owner). One commit per step, straight on `main`.

## Files you OWN

- `web/src/styles.css` (it becomes `web/src/styles/index.css`, then everything but the base layer goes), and `web/src/lib/cn.ts` with its test.
- The theme switch: `web/src/theme.ts` with its test, the inline script in `web/index.html`'s `<head>`, and the control on `AccountPage.tsx`.
- The `className` values in `web/src/**/*.tsx`, and `web/src/components/ui/`.
- The style import in `web/src/main.tsx`, and `web/index.html` (the theme script and the `color-scheme` meta).
- `web/package.json`, pinned: `tailwindcss` 4.3.5, `@tailwindcss/vite` 4.3.5 (peer `vite` `^5.2 || ^6 || ^7 || ^8`, Wicket has 8.3.5), `clsx` 2.1.1, `tailwind-merge` 3.7.0; the root devDependency `eslint-plugin-better-tailwindcss` 4.10.0 (peer `tailwindcss` `^4.1.17`, `eslint` up to 10); `package-lock.json`.
- `web/vite.config.ts` (the plugin, line 52) and `eslint.config.js` (the `better-tailwindcss` block only, `entryPoint: "web/src/styles/index.css"`).
- `web/src/QueueView.test.tsx` only if markup changes the text it reads.
- `.claude/rules/web.md`: the Tailwind lines, and the dark-mode line brief 10 wrote. `scripts/conventions.json`, if the checker needs one.
- Corpus: [wiki/decisions.md](../../wiki/decisions.md), [wiki/architecture.md](../../wiki/architecture.md), [wiki/status.md](../../wiki/status.md), [log.md](../../log.md).

## Files you must NOT touch

- `server/`, `shared/`, `web/vendor/`.
- Behaviour: handlers, polling, routes, the vendored hooks, the confirm pending logic.
- `docs/images/` captures: they are retaken in a later docs pass, and the outcome note says so. `docs-site/`.
- The image: `.dockerignore` excludes `web/src`, and the Dockerfile builds only `shared` and `server`. This brief changes nothing in it.

## What to do

Follow the skill's `migrating-from-plain-css.md`. One commit per numbered step, straight on `main`; after each, `npm run check` and `npm run build` pass.

1. **Screenshots before.** Bring the stack up with [docs/images/shots.md](../../../docs/images/shots.md)'s recipe: a scratch `WICKET_DB`, throwaway tokens, a made-up `demo` account, and Playwright. **Stub `GET /wicket-api/v1/queue` and `/v1/records` with `page.route`** using fixtures shaped like `web/src/QueueView.test.tsx`'s, and freeze the clock (`page.clock`): the page ticks elapsed times from `serverTime`, so live data makes pixel comparison impossible. Keep the images out of git. Take each state at 1280 × 800 and 390 × 844 in light (decision 4):

   | Area | States |
   |---|---|
   | Login | the page; empty submit (field errors); a wrong password (`.auth-error`); with Ward (`WARD_OIDC_*` set to dummies: the button and "or"); `?ward_error=access_denied`; the "session ended" notice; the gate's Loading… and "can't be reached" (stop the API) |
   | Queue | idle (nothing running, nobody waiting); one running and two waiting; the API-down banner; a success notice and an error notice; records with each outcome; the period set to 7 days |
   | Dialogs | Force close; Clear queue with 0, 1 and 2 waiting; one while the action is held |
   | Account | default; the "linked" notice; an error |
   | Keyboard | a focus ring on a button and on a field |

   Record the built CSS: **6,575 bytes, 2,024 gzip** and the JS **369,214 bytes, 111,980 gzip** at commit `456609e`; re-measure at your start.
2. **Set up.** Add the dependencies and the plugin. Write `web/src/styles/index.css`: `@import "tailwindcss"`, `@theme` with the default scales cleared and the mapping above (default `--spacing`), `@custom-variant dark` on `data-theme`, and the `@layer base` page rules (`body` takes the 14 px) with the dark redefinition under `[data-theme="dark"]`. At this step the dark block may still sit under `prefers-color-scheme` until step 6, so the screenshots compare like with like. Keep `styles.css` for now, importing it **after** `index.css`'s layers are declared only if a selector can't move yet; add `cn.ts` and its test. Write a comment at the top of the `@theme` block listing the family names for the-board and lantern.
3. **Migrate one area at a time**, in this order, deleting each rule from `styles.css` as it goes; build after each:
   1. the page: `html`, `body`, `main`, focus ring, `.muted`, `.small`, `.num` (`sr-only`-style helpers where needed);
   2. buttons: one `buttonClass({ variant })` helper for `button`, `-primary`, `-danger`, `-danger-solid` and `.link-button`; used by the native buttons and by `ConfirmDialog`'s trigger, Cancel and confirm;
   3. `ConfirmDialog` in `web/src/components/ui/`: the backdrop, popup, title, description, actions, with `z-dialog`;
   4. the header, banner and notices;
   5. the summary cards, the facts list and the ticket number (`text-ticket`, `max-sm:text-ticket-phone`);
   6. sections, the three tables and the count pill;
   7. the gate, login form, field and account page (`aria-invalid:border-danger` for `.field input[aria-invalid]`);
   8. the phone rules, as `max-sm:` variants where each rule's element is.
   Then delete `styles.css`.
4. **Lint.** Turn on `better-tailwindcss`'s correctness rules and its class order as errors; fix what they find.
5. **Screenshots after.** Same states, the same stubs and frozen clock. Compare each pair (Playwright's comparison or pixelmatch). Fix any difference a person would see in layout or colour (decision 4); drift of a few pixels needn't be fixed or listed. Expect the preflight reliances above to show first. Record the CSS sizes.
6. **The theme switch** (decision 2), in its own commit after the screenshots:
   1. `web/src/theme.ts` reads the stored choice (`light`, `dark` or `system`, from `localStorage` inside a `try`, since storage can be blocked) and sets `data-theme` on `<html>`; the dark block moves from `prefers-color-scheme` to `[data-theme="dark"]`.
   2. A small inline script in `web/index.html`'s `<head>` does the same before first paint: the stored choice, else `light`. With `system` it follows `prefers-color-scheme` and listens for changes, and the `color-scheme` meta follows the theme.
   3. A Light / Dark / System control on the account page, on the `RadioGroup` wrapper from brief 11.
   4. Tests: each stored value maps to the attribute; `system` follows a changed media query; the control is found by role.
   5. Take dark screenshots of each main screen (login, queue, dialogs, account) and read them for unreadable text.
7. **Corpus.**
   - [wiki/decisions.md](../../wiki/decisions.md): the page's styling is now Tailwind (the "built like brief-board" entry says "a React 19 page on Vite with Base UI for widgets"; add the Tailwind line, the family token names with the reason (three tools, one vocabulary, values per app), and the theme switch: Light / Dark / System, light first, `data-theme`, kept on the device).
   - [wiki/architecture.md](../../wiki/architecture.md) and the page file list.
   - Add to `.claude/rules/web.md`: tokens only from `@theme`; no arbitrary colours; `max-sm:` is the phone breakpoint; type sizes from the named scale; both themes change when a colour token changes, under `data-theme`; the Light / Dark / System switch is the only place that sets it.
   - Run `bash corpus/lint.sh --index`, then `bash corpus/lint.sh`.
8. **The gate.** Drop `check-base-ui`'s `--warn-only` from `check:conventions`.

## Acceptance

- [ ] `find web/src -name '*.css'` prints only `web/src/styles/index.css`.
- [ ] `check-base-ui` passes **strict**, with no exception in `scripts/conventions.json`.
- [ ] `grep -rnE "(bg|text|border|fill|stroke|ring|outline|shadow)-\[(#|rgb|hsl)" web/src` prints nothing, and `grep -rn "dark:" web/src` prints nothing.
- [ ] `index.css`'s `@theme` defines exactly the mapped tokens; `bg-red-500` or `text-sm` in a component produces no CSS; `grep -rn "bg-bg\|text-text" web/src` prints nothing.
- [ ] The `cn` test passes for `cn("text-ink", "text-body")` and `cn("font-semibold", "font-title")`.
- [ ] `grep -n "font-size" web/src/styles/index.css` shows the 14 px on `body`, none on `html`.
- [ ] The light screenshot pairs at 1280 and 390 px show no visible change to layout or colour, with the CSS size before and after in the outcome note.
- [ ] The switch has three choices. A first visit with no stored choice is light even when the system is dark; "Dark" and "System" (with a dark system) set `data-theme="dark"` before first paint, with no flash; the choice survives a reload. A Playwright test covers all three, and dark screenshots of each main screen show no unreadable text. `grep -rn "prefers-color-scheme" web/src` finds only the "System" code and the theme script.
- [ ] `npm run check` (with `better-tailwindcss`) and `npm run build` pass, and so do the 86 existing tests and the new theme tests.
- [ ] The decisions are revisited in [wiki/decisions.md](../../wiki/decisions.md) with a `log.md` entry, and `bash corpus/lint.sh` ends clean.

## Interplay

- Brief 11's renamed `.dialog*` rules are migrated here like any other.
- The-board's and lantern's briefs and brief-board's brief 18 copy this brief's `@theme` names (decision 1). If a name changes while building, tell them: this list wins wherever theirs differ.
- Brief 11's `RadioGroup` is the theme control's base. Brief 14 (the redesign) changes the tokens and layout on top of this brief and must keep the switch working in both themes.
- Brief 13 doesn't touch `web/`; they conflict only in `package-lock.json`, so don't run them at the same time.

## Outcome (2026-11-11)

Built in four code commits, 3393d65 to e5b35a1, then the closeout; local, not pushed. Board: ready for deploy.

- **Parity.** A script took 24 states at 1280 x 800 and 390 x 844 in light (login and its error and Ward states, the
  gate's loading and unreachable screens, the queue idle, busy, down, with a notice, the 7-day period, every dialog,
  the account page, a focus ring on a button and on a field), with the API stubbed through `page.route` and the clock
  frozen. After pixel comparison, every state matched the old page at 0 px except the account page, which gained the
  theme switch and drifts 1 to 2 px under the heading (its `h2` had the browser's 0.83em margin; `my-4.5` is 18 px
  against 17.4). Dark was read by eye on the queue, a dialog, the login error and the account page: no unreadable text.
- **Sizes.** Built CSS 7,572 bytes (2,228 gzip) before, 19,327 (4,808) after. JS 387,804 (118,089) before, 420,999
  (129,297) after (`tailwind-merge` and `clsx`).
- **Checks.** `npm run check` exit 0 (typecheck, ESLint with `better-tailwindcss`, Prettier, knip, dependency-cruiser,
  `check-base-ui` strict at 0, `check-structure`, 107 tests); `npm run test:e2e -w @wicket/web` 3 passed.

### Deviations

- **The theme follows the base-ui skill's `theme.md`, not decision 2's wording.** `data-theme` is `light`, `dark` or
  `system`; the colour tokens are `light-dark()` pairs and `color-scheme` follows the attribute, so System follows the
  operating system in CSS, with no `matchMedia` listener. The store is `web/src/lib/theme.ts`, not `web/src/theme.ts`.
  Because of that, `@custom-variant dark` in `index.css` mentions `prefers-color-scheme`, so the acceptance grep finds
  it there as well as in the script; no `dark:` class is used.
- **Extra tokens** beyond the brief's table: `--color-scrim`, `--color-ok-wash`, `--color-danger-wash`,
  `--color-danger-line` (the three `color-mix()` colours and the backdrop's rgb), `--shadow-dialog`, `--radius-group`
  (the segmented control's 6 px), `--text-page-title` (the account page's `h2` is 1.5em, 21 px), `--leading-ticket`,
  `--tracking-label`. The family list in `index.css`'s comment is unchanged.
- **Commits are by area, not by component.** The brief's step 3 (eight component commits) went in one commit, because
  the old stylesheet's rules shared selectors across components and one pass was quicker to verify than eight.
- **A `legacy` layer** held the old stylesheet for one commit only; the final layer order is
  `theme, base, vendor, components, utilities` (the skill's), with `vendor` empty.
- **The screenshots stub the API completely** (session, queue, records, login), so no server and no scratch database
  ran, and no `.env` was involved. The brief's recipe named a scratch `WICKET_DB`; nothing needed it.
- **Playwright is new to this repo** (`@playwright/test` 1.62.0 in `web/`, `web/playwright.config.ts`, `web/e2e/`, a
  port 5189 dev server). `@tailwindcss/vite` is also a root devDependency, because `vitest.config.ts` (the stylesheet
  test) imports it and knip wants it listed where it is imported.
- **No `color-scheme` meta tag**: the skill's mechanism sets `color-scheme` in CSS from `data-theme`.
- **86 tests** in the brief became 107: the repo had 102 at the start.
- `web/src/gate.ts` holds two class strings in bare constants, which `better-tailwindcss` doesn't lint.
