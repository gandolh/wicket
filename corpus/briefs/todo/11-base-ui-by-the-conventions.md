# Task 11: Base UI by the conventions

**Depends on:**

- In Wicket: brief 10, for the gate, the formatter and `.claude/rules/web.md`.
- In the owner's skills library:
  - brief 02, *A base-ui skill, styled with Tailwind*: rules 1-13, the references (`confirm.md` is the model for the wrapper below) and `check-base-ui.mjs`;
  - brief 15, *Enforce the base-ui and code-structure skills in every repo*: the checker runs `--warn-only` until brief 12 here is done.
- The owner's grilling of 2026-11-10: Q15 (Base UI only under `ui/`), Q16 (where native controls stay), Q40 and Q58 (no phone menu panel and no form dialog here), Q41 and Q57 (the filter), Q59 (wrappers in `components/ui/`) and Q60 (jsdom for wrappers that hold logic). All decided; see Owner decisions.

**Runs before:** 12. This brief changes structure; brief 12 then changes only the styling, so its before and after screenshots compare like with like.

**Before you start:** run `brief-board guide` ([corpus/CLAUDE.md](../../CLAUDE.md)).

## Context

Wicket already has Base UI 1.9.0 in one place: `ConfirmAction.tsx`, a Base UI `AlertDialog` with a pending state. The skills library's brief 02 names it as the source of its confirm pattern. So this brief is small: one violation to move, one native control to replace, and the wrapper set the later briefs build on.

### The pin (verified 2026-11-10)

- Five `package.json` files exist; only `web/package.json:13` declares `@base-ui/react`, as `"1.9.0"`, exact.
- `package-lock.json` resolves `node_modules/@base-ui/react` at 1.9.0, with `@base-ui/utils` 0.5.0.
- `grep -rn "OTPFieldPreview\|otp-field\|sanitizeValue"` over the source, docs and vendor finds nothing.

**No bump brief is needed.**

### The audit against rules 1-13 (2026-11-10)

| Rule | Violations | Where |
|---|---|---|
| 1. Exact pin | 0 | |
| 2. Subpath imports | 0 | The one import, `web/src/ConfirmAction.tsx:1`, is `@base-ui/react/alert-dialog`. |
| 3. Base UI only under a `ui/` folder | **1** | `web/src/ConfirmAction.tsx:1`. There is no `ui/` folder; `web/src/` is flat (13 files). |
| 4. Tailwind on the parts | 5 class names on parts | `ConfirmAction.tsx:39, 41, 42, 43, 44, 47-48, 51` (`button`, `dialog-backdrop`, `dialog`, `dialog-title`, `dialog-text`, `dialog-actions`). **Brief 12's work.** |
| 5-7. One stylesheet, tokens, motion | all | **Brief 12's work.** Nothing animates today: `styles.css` has no `transition`, no `@keyframes`. |
| 8. Floating parts portalled, z from tokens | 0 | `AlertDialog.Portal` at `ConfirmAction.tsx:40`. The z-indexes, `web/src/styles.css:81` (3), `:390` (20) and `:398` (21), are literals: **brief 12**. |
| 9. A trigger around a component uses `render` | 0 | `AlertDialog.Trigger` (line 39) renders its own `<button>`, no component inside. `AlertDialog.Description render={<div />}` (line 44) is the right use. |
| 10. `Select.Root` with `items` | 0 | No Base UI `Select`, and none after this brief: the one native `<select>`, `web/src/QueuePage.tsx:148`, becomes a `RadioGroup` (decision 3). |
| 11. No native dialogs | 0 | `grep -rnE "window\.(confirm|alert|prompt)"` over `web/src` prints nothing. |
| 12. Dialogs | 0 to fix, 1 to make explicit | Controlled `open` with `onOpenChange` that refuses to close while the action runs (line 38); `Title` (43) and `Description` (44); Cancel is disabled while pending (48). There are no icon-only buttons. `AlertDialog`'s props omit `disablePointerDismissal`, `modal` and `actionsRef` (read from the 1.9.0 types), so an outside press never dismisses it. **No `initialFocus`**: "Cancel focused" (the comment at line 7) holds only because Cancel is the first tabbable in the popup. The wrapper makes it explicit. |
| 13. Base UI over hand-built widgets | **0** by the skill's list, **2** to decide | See below. |

**Rule 13's two candidates:**

1. **The period `<select>`**, `web/src/QueuePage.tsx:148-151`: two options ("Last 24 hours", "Last 7 days") whose labels differ from their values. Wicket's [wiki/decisions.md](../../wiki/decisions.md) doesn't keep it native, so rule 13 doesn't excuse it. It switches which counts the "Calls per app" table shows, so by Q41 and Q57 it is a `RadioGroup` (decision 3).
2. **The page's notice**, `QueuePage.tsx:66-73`: an in-flow `role="status"` or `role="alert"` paragraph with a "Dismiss" link-button. It is not a floating toast: it sits above the first section and stays until dismissed or replaced. Left as it is (decision 4).

**Considered and left:**

- **No phone navigation panel** (`grep -rniE "menu|drawer|hamburger" web/src` finds nothing), so Q40's `Drawer` rule doesn't apply. **No dialog holds a form**, so Q58's `disablePointerDismissal` rule doesn't apply; the one dialog is a confirm and already ignores an outside press.
- The text and password inputs (`LoginPage.tsx:64-98`) and their labels: native (rule 13).
- The four tables, `dl` lists and the account link: not widgets.
- The vendored Ward hooks and their types: generated, never edited.

## Owner decisions

Decided on 2026-11-10 unless marked as a default.

1. **Base UI only under `ui/`** (Q15 and Q59, decided 2026-11-10, technical calls). `web/src/components/ui/` is created, and `ConfirmAction.tsx` becomes `web/src/components/ui/ConfirmDialog.tsx`. The rest of `web/src/` stays flat (default): 13 files don't need feature folders, and the checker doesn't look for them (rule 10 of the code-structure skill is review-only).
2. **The wrapper's name and API** (default). `ConfirmDialog` with the props `ConfirmAction` has today (`label`, `title`, `description`, `confirmLabel`, `danger`, `run`), so the two call sites at `QueuePage.tsx:84-103` and `:111-134` change only their import. It follows the skill's confirm pattern: an `AlertDialog` that cannot be dismissed while its action runs, with a "Working…" label. Components use named exports (Q49).
3. **The period filter becomes a `RadioGroup`** (Q41 and Q57, decided 2026-11-10, technical calls; Q16's native-`<select>` allowance is not used). A filter that switches what a list shows uses `RadioGroup`, so arrow keys may choose. `web/src/components/ui/RadioGroup.tsx` is a segmented two-choice group (`day`: "Last 24 hours", `week`: "Last 7 days") with an accessible group label ("Period"); `QueuePage.tsx:146-152` uses it. It is the one intended visible change in this brief, so it is outside Q19's "no visible change" test and is listed in step 5. Brief 12 builds the Light / Dark / System control on this same wrapper. Rejected: a Base UI `Select` (a two-option dropdown for a filter), keeping the native `<select>`, and `ToggleGroup` (it is for pickers that save on each choice).
4. **The notice stays inline** (default). Not a Base UI `Toast`. It reports the result of a confirmed action and should stay in view; a toast that times out would hide "Force closed ticket 41." too soon. Inline "Delete? Yes / No" confirms are not used here (Q58 keeps them where they exist); Wicket's confirm is an `AlertDialog`.
5. **A DOM test environment, for wrappers that hold logic** (Q60, decided 2026-11-10, technical call). `jsdom` (pinned) with Testing Library, set per test file with a `// @vitest-environment jsdom` docblock, so the existing static-markup tests stay in Node. It covers `ConfirmDialog`, which holds logic (the pending guard): the behaviour items in the acceptance become automated tests. `RadioGroup` holds none, so it has no jsdom test; its behaviour is checked in the Playwright pass. Flows stay in Playwright. Tests select by role, and `data-testid` only where no role fits (Q62).
6. **No PRs, no branches** (Q4, decided 2026-11-10, owner). One commit per step, straight on `main`.

## The wrapper set: `web/src/components/ui/`

| File | What it is | From |
|---|---|---|
| `ConfirmDialog.tsx` | Base UI `AlertDialog`, props unchanged; `initialFocus` on Cancel (a ref); the pending guard and "Working…" label as today | `web/src/ConfirmAction.tsx`, moved |
| `RadioGroup.tsx` | Base UI `RadioGroup` as a segmented group; `value`, `onValueChange`, `items` (value and label), an accessible group label (decision 3) | new; `QueuePage.tsx:148` uses it |

`Button` stays native for now: Wicket has four button variants and no Base UI `Button` need ([brief 12](12-the-web-app-to-tailwind.md) builds `buttonClass()`).

## Files you OWN

- `web/src/components/ui/**` (new) and the imports of what moved.
- `web/src/QueuePage.tsx`: the two `ConfirmAction` uses, and the period filter.
- `web/package.json` and `package-lock.json`, only for the test dependencies (`jsdom`, Testing Library, pinned) in decision 5.
- `web/src/components/ui/ConfirmDialog.test.tsx` (new, jsdom).
- The existing CSS rules for markup this brief changes: rename or move a selector, don't restyle. Brief 12 turns them into utilities.
- `web/src/QueueView.test.tsx` only if an import changes. `vitest.config.ts` only if the jsdom docblock needs it.
- Corpus: [wiki/architecture.md](../../wiki/architecture.md) (the page's file list), [wiki/decisions.md](../../wiki/decisions.md) (decision 3's answer), [wiki/status.md](../../wiki/status.md), [log.md](../../log.md); `.claude/rules/web.md`.

## Files you must NOT touch

- `server/`, `shared/`, and the `@base-ui/react` line of `web/package.json`. Every part needed ships in 1.9.0.
- Styling beyond renaming a selector, and the few `styles.css` rules `RadioGroup` needs (brief 12 turns them into utilities).
- The pending logic: Esc, the backdrop and Cancel stay inert while the action runs, and the dialog closes when it settles.
- `web/vendor/`.

## What to do

One commit per step, straight on `main`. After each, `npm run check` passes with `check-base-ui` `--warn-only`.

1. **Before.** Run `check-base-ui` strict and record the counts by rule; expect rule 3 at 1 and rules 4-6 at whatever the checker counts for the CSS. Take Playwright screenshots, at 1280 and 390 px, light and dark (`page.emulateMedia({ colorScheme })`), of: the Force close dialog, the Clear queue dialog with 0, 1 and 2 waiting, a dialog while the action runs (stub `POST /wicket-api/v1/queue/clear` to hold), and the period filter. Brief 12 has the bring-up and the fixtures.
2. **Move the dialog.** `git mv web/src/ConfirmAction.tsx web/src/components/ui/ConfirmDialog.tsx`, rename the export, and update `QueuePage.tsx`. Rule 3 reaches 0.
3. **Make the focus explicit.** `initialFocus` on the popup points at Cancel through a ref. Nothing visible changes.
4. **The period filter** per decision 3: build `RadioGroup.tsx`, swap it in at `QueuePage.tsx:146-152`, and keep the choice-to-table behaviour (`period` state, `CountsTable`).
   **Tests** per decision 5: add `jsdom` and Testing Library, and write `ConfirmDialog.test.tsx` (focus on Cancel at open; Esc, an outside press and Cancel inert while the action is held; closes when it settles).
5. **After.** Take the screenshots again. Per Q19, a few pixels of drift needn't be fixed or listed; list every other difference with its reason (the period filter is the expected one). Run `check-base-ui` strict: rules 1, 2, 3, 9, 10 and 11 report 0. Add the wrapper lines to `.claude/rules/web.md` and update the corpus pages.

## Acceptance

- [ ] `grep -rn "@base-ui/react" web/src --include=*.ts --include=*.tsx | grep -v "components/ui/"` prints nothing.
- [ ] `check-base-ui` strict reports 0 for rules 1, 2, 3, 9, 10 and 11. Rules 4-7 are brief 12's, and their counts are in the outcome note.
- [ ] `grep -n "ConfirmAction" -r web/src` prints nothing.
- [ ] `ConfirmDialog.test.tsx` passes under jsdom: Cancel has focus when the dialog opens; while the action is held, Esc, an outside press and Cancel leave it open; when it settles it closes.
- [ ] In the recorded Playwright pass: the same holds in a real browser for both dialogs, and the period `RadioGroup` changes the table, with arrow keys moving the choice.
- [ ] The before and after screenshots show no visible change except the period filter, which is described.
- [ ] `grep -rn "<select" web/src` prints nothing.
- [ ] `npm run check` passes, and `bash corpus/lint.sh` ends clean.

## Interplay

- Brief 12 styles `web/src/components/ui/` with Tailwind and deletes the `.dialog*` rules this brief renamed. It reuses `RadioGroup.tsx` for its Light / Dark / System control, so keep the wrapper's props general.
- Brief 14 (the redesign) comes after 12 and keeps these wrappers.
- The skills library's `check-base-ui` heuristic for rule 9 may flag `AlertDialog.Description render={<div />}`. That is a false positive, to report to the skill and not to except here.
