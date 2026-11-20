# The board's notes: Wicket

The estate redesign board is a private canvas. This file copies what its page for this app said beside the screens: the owner's asks, the decisions, the rules the design reopened, the open questions and the Floor. The owner's answers are in [README.md](../README.md#the-owners-decisions).

## Asks to the owner

- 1. Reopened: the queue page becomes two columns at 1280, with Now serving and Running merged into one card (decisions.md, "A queue page with force close and clear queue": "Conventional layout: a header, a page, plain tables"). The header, the tables and every action stay. Welcome? 2. The accent moves from today's blue to plum #7d2668 (five other apps hold a blue). OK? 3. Approve Live beside the log as Wicket's direction? (beside `wicket-direction`)

## Decisions

- Now serving and Running are one card: the numeral with 3 waiting on its baseline, a rule, then Running's four facts as a 2 x 2 grid of bold values under small labels. Nothing was dropped; the empty band under 3 waiting is gone. (beside `wicket-proposed-queue-1280`)
- Force close is a danger tint with a bold label, full width at the foot of the live card at every width. It is the only loud control on the page; Clear queue stays an outline and the dialog's confirm is the only solid red. (beside `wicket-proposed-queue-1280`)
- The chosen period is a plum-tinted segment with a plum outline, no solid fill. Plum marks only this, the next chip, the account link and the focus ring, never the numeral and never a danger action. (beside `wicket-proposed-queue-1280`)
- A failed call's Model and Ran cells read not started, in muted type. Today the app prints None there (web/src/QueueView.tsx, the Model and Ran cells): a small copy fix for the redesign brief. A running call with no model keeps today's Not chosen yet. (beside `wicket-proposed-queue-1280`)
- Waiting keeps its head band with the title, the count pill and Clear queue, and the plain table is the card's own body. Past eight tickets the body scrolls inside the card, up to the 200-ticket cap, and the column stays sticky only while it fits under the header. (beside `wicket-proposed-queue-1280`)
- Reddit Sans carries every label and title; Reddit Mono carries figures only (the numeral, tickets, elapsed, waited, ran, model ids, counts and times). Both are on Google Fonts. Three weights in all (400, 500, 700); no tracked capitals. (beside `wicket-direction`)
- Phone: the live card comes first, then Waiting, Calls per app and Recent calls as list rows. Tables use 16 px type and 40 px rows (rows are not tap targets; every control stays 44 px or more), the Period segments sit on the title's row, and the first screen shows Force close, Clear queue and four Calls per app rows at 390x844 (two at 360x800; today shows two at 390). (beside `wicket-proposed-queue-390`)
- The dialog keeps today's words and today's order (Cancel focused, confirm on the right) over a dimmed, aria-hidden page; the page behind uses the dialog shot's values (10:30:04 AM, 13 s, 10 s / 5 s / 1 s waited). On the phone the two buttons share the row at 48 px. (beside `wicket-proposed-force-close-dialog-1280`)
- When the API stops answering, the banner becomes the live column's first card, so the column never reads as a hole beside the log; the records stay. Under 840 px it is the first card of the stack. The left column is short while it is down, since the live cards never loaded. (beside `wicket-proposed-queue-api-down-1280`)
- A long queue (12 waiting, fixture-shaped rows). The live column stays sticky but is capped at the viewport height under the header; Waiting's body scrolls inside its card, shows at least 3 rows, and a soft shadow at the foot of the scroll box says there is more. Force close and Clear queue stay on the first screen. Under 640 px of viewport height the column is not sticky. (beside `wicket-proposed-queue-12-waiting-1280`)

## Reopened rules

- Recorded (decisions.md, "A queue page with force close and clear queue", 2026-11-04): "Conventional layout: a header, a page, plain tables. The owner rejects metaphor-heavy navigation." Proposed: still a header and plain tables with no new navigation, but the live state is one column beside the log at 1280 and the merged card replaces two side-by-side cards. (beside `wicket-proposed-queue-1280`)

## The Floor

- Round 2. Contrast is scripted over 34 pairs in both themes: text min 5.25 light and 5.37 dark (danger on the Force close tint), control edges, icons and rings 3.32 and 3.06 at the lowest (the Period group and Cancel use the new line-control edge, 3.6 / 3.5 on surface), cards 1.14 and 1.17 against the page plus a 1.56 / 2.08 edge. No page overflow at 1280, 1100, 1024, 768, 390 or 360 in either theme, and no control spills its box; phone controls are 44 to 48 px, table rows 40. First screen, whole rows per section, Force close and Clear queue whole at every size: 1280x800 Waiting 3, Calls 5, Recent 8 (16 rows, today 8); 1024x768 Waiting 3, Calls 5, Recent 4 (12); 390x844 Waiting 3, Calls 4 (7, today 5); 360x800 Waiting 3, Calls 2 (5). With 12 waiting at 1280x800: Waiting 6, Calls 5, Recent 8 (19). Sloplint --scope app --render gives 0 FAIL and 0 WARN on all seven Proposed twins; the 24b half steps are waived in the stamp with their reason. (beside `wicket-direction`)

## Other notes

- Round 2, from the critique and the controller's rulings: below a 380 px container, table cells take 8 px side padding (12 at the ends) so nothing clips at 360; Recent calls follows its own card's width (table from 620 px, 12 px cell padding under 676, otherwise list rows, two lines from 480 px); the Period group and Cancel use a new line-control edge (3.4:1 light, 3.3:1 dark) so the plum ring is the only strong mark; band titles are 20/28 from 561 px and phone row names are 500; OK and Cancelled are regular weight, only Failed is bold danger; the s unit is set in Reddit Sans, muted.
- Wicket has no menu and no toast, so the component strip shows its inline notices and the sign-in field instead. Queue empty is the one new string (a title above today's Nobody waiting.); every other state uses the app's own words.
- Apostrophes in the app's strings are set as typographic ’ (Hallmark F1); the words are otherwise unchanged. Times and durations keep the app's format (10:28 AM, 14 s).
- Handoff: manifests/wicket.tokens.css and wicket.tokens-map.md carry the tokens in the app's own names, keeping its light-dark() mechanism.

## Contrast, as measured

| Pair | Light | Dark | Needs |
|---|---|---|---|
| ink on surface | 16.82 | 13.26 | 4.5 |
| ink on page | 14.76 | 15.54 | 4.5 |
| ink on surface-sunk (head band) | 15.56 | 14.85 | 4.5 |
| ink-muted on surface | 7.1 | 6.52 | 4.5 |
| ink-muted on surface-sunk (labels, privacy line) | 6.57 | 7.31 | 4.5 |
| ink-muted on page | 6.23 | 7.64 | 4.5 |
| accent on surface (account link) | 8.68 | 8.32 | 4.5 |
| accent on page | 7.62 | 9.75 | 4.5 |
| accent on accent-soft (next chip) | 7.45 | 7.11 | 4.5 |
| ink on accent-soft (count pill, chosen period) | 14.43 | 11.32 | 4.5 |
| danger on surface (Failed, Clear queue) | 6.38 | 6.57 | 4.5 |
| danger on surface-sunk | 5.9 | 7.35 | 4.5 |
| danger on danger-wash (Force close) | 5.25 | 5.37 | 4.5 |
| surface on danger (Force close confirm) | 6.38 | 6.57 | 4.5 |
| ink on danger-wash (notice) | 13.86 | 10.86 | 4.5 |
| danger on danger-wash (error notice) | 5.25 | 5.37 | 4.5 |
| ink on ok-wash (notice) | 14.25 | 10.61 | 4.5 |
| ok on surface (OK outcome) | 5.62 | 7.93 | 4.5 |
| banner-text on banner-bg | 8.51 | 9.24 | 4.5 |
| danger-line on surface (Clear queue edge) | 4.11 | 3.74 | 3 |
| danger-line on danger-wash (Force close edge) | 3.39 | 3.06 | 3 |
| line-control on surface (Period group edge) | 3.59 | 3.5 | 3 |
| line-control on surface-sunk (Cancel edge) | 3.32 | 3.92 | 3 |
| ink-muted on surface (unit s, not started) | 7.1 | 6.52 | 4.5 |
| line-strong on surface (dialog edge) | 1.78 | 1.78 | 1.3 |
| accent on accent-soft (chosen period outline) | 7.45 | 7.11 | 3 |
| accent on surface (focus ring) | 8.68 | 8.32 | 3 |
| accent on page (focus ring) | 7.62 | 9.75 | 3 |
| accent on surface-sunk (focus ring) | 8.03 | 9.32 | 3 |
| line-strong on page (card edge) | 1.56 | 2.08 | 1.3 |
| line-strong on banner-bg (banner edge) | 1.61 | 1.5 | 1.3 |
| surface on page (light: card also carries an edge) | 1.14 | 1.17 | 1.09 |
| surface-sunk on surface (head band) | 1.08 | 1.12 | 1.03 |
| surface on page (dark lifts by lightness, needs 1.15) | 1.14 | 1.17 | 1.15 |

## The runner-up

**Runner-up: A, The counter, re-set (sketch only, not built)**

Note: how this direction was picked. Two directions were sketched (A evolve today, B live beside the log) and two judges compared every pair against today, in both orders, at 1280 light and 390 dark. All 12 verdicts agreed: B won 4, A 1, today 1. At 1280 both judges preferred today to A: A's half-width Waiting table strands Clear queue at the far edge and its Running card has an empty band. B won on grouping by job: the live queue (serving, running, Force close, waiting, Clear queue) in one column, history beside it. What A did better: a huge condensed ticket number, a calmer selected segment, and proportional figures. Say so here if you'd rather keep today's blue (A).

## The artboards on the board

- Direction · Live beside the log
- Queue · 1280 · light · today
- Queue · 390 · light · today
- Force close dialog · 1280 · light · today
- Force close dialog · 390 · light · today
- Queue, API down · 1280 · light · today
- Queue, API down · 390 · light · today
- Queue · 1280 · light · proposed
- Queue · 390 · dark · proposed
- Force close dialog · 1280 · light · proposed
- Force close dialog · 390 · dark · proposed
- Queue, API down · 1280 · light · proposed
- Queue, API down · 390 · dark · proposed
- Queue, 12 waiting · 1280 · light · proposed (more states)
- Runner-up A, The counter, re-set · light 1280 (sketch)
- Runner-up A, The counter, re-set · dark 390 (sketch)
