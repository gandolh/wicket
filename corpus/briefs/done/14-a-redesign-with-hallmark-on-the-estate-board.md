# Task 14: A redesign with Hallmark, on the estate board

**Depends on:**

- In Wicket: [brief 12](../done/12-the-web-app-to-tailwind.md), which puts the page in Tailwind with the family token names and adds the Light / Dark / System switch, on the wrappers from [brief 11](../done/11-base-ui-by-the-conventions.md). A redesign is then mostly a new token set and layout.
- In the owner's skills library:
  - brief 24, which vendors Hallmark as the design skill and adopts taste-skill 2.5's ideas (palettes and type dealt by trade, its copy layer);
  - the estate redesign board: one artifact with a page per app, owned by the skills library.
- The owner's answer of 2026-11-10 (Q39): no bake-off; Hallmark redesigns every web UI, keeping what is useful from taste-skill 2.5, and the owner approves each app on the board before any code changes.

**Runs before:** nothing. **Runs after:** 10 to 13, the redesign last. Brief 13 is server-only and does not block it.

**Before you start:** run `brief-board guide` ([corpus/CLAUDE.md](../../CLAUDE.md)).

## Context

Wicket is the one service that holds the Ollama Cloud key and queues every app's model calls. Its page is for the owner alone: who is being served now, what is running, who waits, and what the last calls did, with two emergency actions (Force close, Clear queue). It is a small admin tool, read often on a phone.

### The screens (read 2026-11-10, `web/src/route.ts`, `App.tsx`, `AuthGate.tsx`)

The page has three views, chosen by path under the base (`/wicket/`) with no router library.

| Screen | Path | File |
|---|---|---|
| Queue: header, API-down banner, notice, now serving and running cards, the waiting table, calls per app (with the period filter), recent calls | `/wicket/` | `web/src/QueuePage.tsx`, `web/src/QueueView.tsx` |
| Confirm dialogs: Force close, Clear queue (0, 1 and 2 waiting, and while the action runs) | over the queue | `web/src/components/ui/ConfirmDialog.tsx` |
| Log in: the form, field errors, a wrong password, "Sign in with Ward", the session-ended notice | `/wicket/login` | `web/src/LoginPage.tsx` |
| Account: the signed-in account, the Ward link, the theme switch | `/wicket/account` | `web/src/AccountPage.tsx` |
| The gate: "Loading…" and "can't be reached" | every path | `web/src/AuthGate.tsx` |
| The shell: the header with the brand and the account link | every page | `web/src/App.tsx`, `web/src/QueuePage.tsx` |

### What the design docs fix today

- There is no design document for the page. [wiki/decisions.md](../../wiki/decisions.md) holds the look-and-layout decisions: "A queue page with force close and clear queue" (a conventional layout, a header, a page and plain tables; **the owner rejects metaphor-heavy navigation**), "Tickets and now serving, like a market counter" (the ticket number is the page's anchor) and "Sign-in like brief-board" (the same sign-in as the board, with Ward). "A Fastify API and a React page, built like brief-board" and brief 12's entry record the stack: Base UI wrappers and Tailwind with the family tokens.
- The theme switch is the owner's call of 2026-11-10 (Q18): Light / Dark / System, light on a first visit, `data-theme`. Brief 12 builds it.
- The family token names (`page`, `surface`, `ink`, `accent`, `line`, `danger`) are shared with the-board and lantern. A redesign may change values freely; renaming a token is a change for all three and goes on the board as one.
- The page shows counts and timings only, never prompt or answer text ([wiki/decisions.md](../../wiki/decisions.md), "Records hold counts and timings, never text"). A redesign shows no invented sample text either.

The redesign stays inside these decisions unless the owner reopens one on the board.

## Owner decisions

Answered 2026-11-10: Q39 (Hallmark, with taste-skill 2.5's useful parts; approval on the board first). Default: the proposal keeps the conventional header-and-page layout, the ticket number as the anchor, plain tables, and the two emergency actions behind their confirm dialogs. Anything that moves one of those is flagged on the board as a reopened decision.

No PRs, no branches (Q4): one commit per step, straight on `main`.

## Files you OWN

- `web/src/styles/index.css` (the tokens) and the screens listed above, one commit each.
- A design document recorded from the shipped result (`docs/design.md`, new; the repo has none today), and a link to it from [wiki/decisions.md](../../wiki/decisions.md).
- Corpus: [wiki/decisions.md](../../wiki/decisions.md) (the visual direction, if it changes), [wiki/status.md](../../wiki/status.md), [log.md](../../log.md).

## Files you must NOT touch

- `server/`, `shared/` and `web/vendor/` (the vendored Ward hooks).
- Behaviour: polling, the confirm pending logic, routes, the sign-in flow.
- The copy's meaning: its wording stays unless the board approves a change. No invented facts or numbers.
- `docs/images/` captures are retaken in a later docs pass, and the outcome note says so.

## What to do

1. **Today.** Take Playwright screenshots of every screen above at 1280 and 390 px, in light and dark, kept out of git. Use brief 12's stubs for `GET /wicket-api/v1/queue` and `/v1/records` and a frozen clock, so the page is the same on every run. Include the idle and busy queue, the API-down banner, both notices, every dialog state, and the login states.
2. **Propose.** With Hallmark (and taste-skill 2.5's trade palettes and copy layer where they help), make a proposal per screen, inside the recorded decisions. Check each against the Floor: contrast, a visible focus ring, a reduced-motion path, no invented facts, no broken phone layout.
3. **Board.** Put the proposals on this app's page of the estate board, beside today's screenshots at both widths.
4. **Approval.** The owner approves on the board. Nothing below starts before that, and the approval is recorded in `log.md` with its date.
5. **Build.** First as a token change in `web/src/styles/index.css` (colours, radii, shadows, type, spacing, both themes), then one screen per commit. Keep the Base UI wrappers and the theme switch working.

## Acceptance

- [ ] The owner's approval is on the board and recorded in `log.md` with the date.
- [ ] Contrast: every text and icon pair in both themes clears 4.5:1 (3:1 for large text and UI parts), measured with a script over the built tokens and listed in the outcome note.
- [ ] A Playwright test tabs through each screen and asserts a visible focus ring on every stop.
- [ ] A Playwright test with `reducedMotion: "reduce"` asserts no running animation or transition on each screen.
- [ ] A Playwright test at 390 px asserts `document.documentElement.scrollWidth <= window.innerWidth` on each screen.
- [ ] Every figure shown comes from the data or the copy; the outcome note lists none invented, and no prompt or answer text appears anywhere.
- [ ] The theme switch still gives Light, Dark and System, light on a first visit, and brief 12's theme tests pass.
- [ ] `npm run check` passes, and `bash corpus/lint.sh` ends clean.

## Interplay

- Brief 12 owns the tokens' names, the wrappers' styling and the theme switch; this brief changes values and layout on top. The-board and lantern share the token names, so a rename here is raised on the board for all three.
- Brief 11's `RadioGroup` (the period filter and the theme control) and `ConfirmDialog` stay Base UI wrappers; the redesign restyles them.
- Brief 10's formatter and lint run on every redesign commit.

## Outcome (2026-11-13)

Built after the owner approved the direction "Live beside the log" on the estate redesign board (steps 1 to 4 were done
there; the approval is in `log.md`). Not pushed or deployed: the deploy is `node cli.ts wicket deploy` from vps-deploy
(the web client only). The shipped look is in [docs/design.md](../../../docs/design.md); the changed decision is in
[wiki/decisions.md](../../wiki/decisions.md) and [wiki/decisions-web.md](../../wiki/decisions-web.md).

- **Commits:** the approval, the tokens, one each for the queue page, the dialogs, sign-in with the gate, and the
  account page, then the Floor tests, a phone-type match, and the docs.
- **Contrast** (`web/src/styles/contrast.test.ts`, 52 cases over the tokens, both themes): text minimum 5.27:1 light
  and 5.36:1 dark (danger on the Force close tint); icons, edges and rings 3.32:1 light (`line-control` on
  `surface-sunk`) and 3.05:1 dark (`danger-line` on the Force close tint).
- **Floor tests** (`web/e2e/floor.spec.ts`): on 11 screens, a visible focus ring on every Tab stop, no running
  animation or transition under reduced motion, and no sideways scroll at 390 px in light and dark. Brief 12's theme
  tests pass with the new page colours.
- **Figures:** every number shown comes from the data or the copy; none invented. The test fixtures
  (`web/e2e/fixtures.ts`) use the board's own rows, with weekly counts as three times the daily ones (never shown in a
  screenshot). No prompt or answer text appears anywhere.
- **Copy:** the one approved change, `not started` in a record's Model and Ran cells where it printed `None`. It
  keys on each cell being empty, so a record with no model but a run time would also read `not started` in Model; the
  server's types allow it, and no approved string covers it.
- **Not retaken:** `docs/images/`, left for a later docs pass.

### Deviations

- Two tokens the design no longer uses, `text-page-title` and `tracking-label`, were dropped from the stylesheet.
- A `scroll-edge` utility in `index.css` draws the foot shadow on Waiting's scroll box.
- The comps' `--gutter: 16px` and `--bar: 52px` phone rules never applied in the comps themselves (they style the
  container they are set on), so the build follows what the owner saw: 24 px gutter, 56 px header, 14 px body text, 16
  px where the comps set it.
- The board's `Queue empty` title and typographic apostrophes were stickies, not rulings, and are not built.
- An empty queue's "None yet" is 20 px, since the 96 px numeral does not fit a 400 px column in 8 characters.
