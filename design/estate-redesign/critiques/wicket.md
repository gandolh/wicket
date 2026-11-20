fix

# Wicket critique: Live beside the log (design critic, 2026-11-13)

I read today's shots in board/shots/wicket, the builder's renders and twins in board/work/wicket, the manifest's screens and stickies, the direction, judge/wicket/RESULT.md and wicket's corpus/wiki/decisions*.md. I also rendered the six twins headless at 1280x800, 1024x768, 768x1024, 390x844 and 360x800. My measuring scripts stay in my scratchpad.

## First-screen density, counting whole table or list rows per section

| Screen, viewport | Today | Build |
|---|---|---|
| Queue 1280x800 | Now serving, Running, Waiting 3, Calls per app 5, Recent calls title only. **8 rows** | Live card, Waiting 3, Calls per app 5, Recent calls 8. **16 rows** |
| Queue 390x844 | Now serving, Running, Waiting 3, Calls per app 2. **5 rows** | Live card, Waiting 3, Calls per app 3. **6 rows** |
| Queue 360x800 | No shot | Live card, Waiting 3, Calls per app **1**. 4 rows |
| Queue 1024x768 | No shot. Today's Recent calls is a table at every width | Recent calls 3, as 93 px list rows |
| Queue 768x1024 | No shot | Recent calls 0. Its 14 calls stand 1355 px tall |
| API down 1280x800 | Banner, Calls 5, Recent 7, the 8th cut by 1 px. 12 rows | Banner card, Calls 5, Recent 8. 13 rows |
| API down 390x844 | Banner, Calls 5, Recent 6 with Waited, Ran and Outcome cut off at the right. 11 rows | Banner, Calls 5, Recent 3 list rows. 8 rows |

Force close and Clear queue are whole on the first screen at every viewport I measured, today and build. In the build Force close sits at 383-423 px at 1280 and 303-351 at 390 and 360, Clear queue at 469-505 and 379-423. Nothing is truncated. I found no ellipsis and no clipped text, only clipped cell padding at 360 (issue 1).

## Regressions against today

1. **Recent calls at 768 to 1159 px, on the queue and API-down screens.** Today's log is a 7-column table at every width. Below a 1160 px page the build swaps it for three-line list rows, 93 px a call against 40. At 1024x768 three calls show on the first screen and the 14 calls stand 1355 px tall. About 60% of each row is empty, and Waited and Ran can no longer be read down a column. Issue 2 fixes it.

Nothing else regressed. Every section head still carries its own action, and the confirm dialog and the API-down banner hold or get better. Clear queue now sits beside its 3 rows instead of 900 px away, the header lines up with the cards, and the phone log no longer scrolls sideways.

## Priority issues, ranked by cost to the operator

1. **At 360 px, a common Android width, the Calls per app table spills its card and one row shows.** The table is 318 px in a 312 px card. The Cancelled figures end 5 px from the card edge against 13 px on the left, and the card's `overflow:hidden` cuts the rest of the padding. The Period group wraps under the title, so 1 Calls row is whole at 360x800 and 3 at 390. The fix changes no words. Make phone table rows 40 px instead of 44, since rows aren't tap targets and the type stays 16 px. Under a 380 px container, give cells 8 px side padding with 12 on the first and last. On a scratch copy the table then measures 310 px in 312, with 2 Calls rows whole at 360x800 and 4 at 390x844.
2. **Recent calls switches on the page width, not the card's.** The 7-column table needs 676 px with 16 px cell padding, 620 with 12 and 592 with 10 (measured). Use a container query on the Recent calls card. At 680 px and wider, show the table with 16 px padding, which covers 768 with its 720 px card. From 620 to 679, show the table with 12 px padding, which covers a 1100 px page with its 668 px card. Below 620, which is 1024 at 592, use list rows, and above about 480 px let line 2 (ticket, model) and line 3 (Finished, Waited, Ran) share one wrapping line: `li{display:flex;flex-wrap:wrap;column-gap:24px}` with line 1 at full width. Measured at 1024, that gives 71 px rows, a 1047 px card instead of 1355, and 4 calls on the first screen. The phone keeps its wrap.
3. **The sticky live column breaks with a long queue, which is exactly when Force close and Clear queue get used.** With 12 waiting at 1280x800 the column is 787 px tall. At the top of the page, Waiting's 8-row scroll box ends at 867 px, below the fold. At the end of the page the column gets pushed up, and `Now serving` and the top half of `1043` slide under the header. The decision says sticky "only while it fits", and the comp doesn't draw that. Fix it with `.live{max-height:calc(100dvh - var(--bar) - 48px);display:flex;flex-direction:column}`, Waiting at `flex:1;min-height:0` and its body at `overflow:auto` with at least 3 rows showing. Turn sticky off below about 640 px of viewport height. Draw Waiting with 12 tickets at 1280 on the Direction sheet.
4. **The Period group carries the loudest outline on the page, which ruling 2 asked to avoid.** Its 1 px `ink-muted` edge is 7.1:1 in light and 6.5 in dark, and the chosen segment adds a 1.5 px plum ring inside it, so the eye gets two outlines 2 px apart. In dark at 390 it is the brightest line on the screen. Cancel has the same edge, so with the dialog's initial focus ring, which stays, it reads as a triple outline. Add a `line-control` token near 3.3:1 on `surface`, about `#8e8693` light and `#766e7c` dark, and re-run contrast.mjs. Use it on the group and on Cancel, and keep the plum ring on the chosen segment.
5. **The type ladder is flat, and the detector's `flat-type-hierarchy` finding is right.** Card titles are 16/24 700. Running's fact values match that, and on the phone so does each Recent calls row's app name, so `Recent calls` and `shelfmark` look the same at 390. The direction put card titles at 20/28, and `text-title` 20/28 is already in the token map. Use it for band titles above 560 px, where it fits the 52 px band. On phone list rows set the app name at 16/24 500, so the band title is the only 16/700 line in its card. Leave the phone title at 16, because a bigger one pushes the Period group onto a second line at 390.
6. **The Outcome column shouts OK.** Fourteen bold green `OK`s make the strongest stripe in the log, and the two `Failed` rows don't stand out from them. Set `OK` and `Cancelled` at 500 and keep `Failed` at 700 in `danger`. Do the same on the phone list rows.
7. **The mono units look gappy.** `11 s`, `0 s` and `14 s` sit wholly in Reddit Mono, so every Waited, Ran and Elapsed figure has a full mono cell before the `s`. Set the unit in Reddit Sans `ink-muted` and keep the figure in mono.

## The builder's deviations

- **Surface `#fdfbfd` instead of white holds.** A card on the page is 1.14:1 against white's 1.17, but the `line-strong` edge, 1.56 light and 2.08 dark, and the light shadow carry the island in both themes. The near-white also stays in the plum-tinted family. Keep the head band's bottom `line`, because the band is only 1.08:1 over the card.
- **Weights 400, 500 and 700 only holds.** I measured Reddit Sans at 400/500/700 and Reddit Mono at 500/700. The 96 px numeral at 700 is heavier than the direction's 600, and it's the anchor, so that's fine. Issues 5 and 6 are about 700 doing every job, not about losing 600.
- **Three 44 px phone targets instead of 48 hold.** The demo link is 44x44, each Period segment 44x105 inside one group, and Clear queue 44x111 behind a confirm dialog with nothing within 8 px. Force close and both dialog buttons are 48. Android's 48 dp is a recommendation, and none of the three can destroy anything without a confirm.
- **Dropping `on-accent` holds.** Plum never fills anything. The chosen segment is `accent-soft` with `ink`, and the chip is plum on `accent-soft`. Bring the token back only if a solid plum control ever appears.
- **Period and Cancel edges in `ink-muted` don't hold as drawn.** Aiming for 3:1 is right. The value is twice that, and it gives the page its noisiest outline (issue 4).
- **The API-down screen's short left column holds.** When the API comes back, the live card fills the left column and the log doesn't move. Today the live cards land above the tables and push them all down. The banner is still the first thing read. One option is to keep the live card's frame under the banner with the app's own `Loading the queue…`, so the column reads as not loaded yet rather than as a hole.

**One clash with the rulings.** On the API-down screen at 390 the build shows 3 Recent calls on the first screen against today's 6. Ruling 7's phone list rows cause it. The ruling wins, because today's 6 rows were missing three of their seven columns. None of my fixes undoes a ruling. Issue 4 asks for what ruling 2 already asks, and issue 1 adds Calls rows on top of ruling 6.

## Phone

This is a real phone design, not a squeezed desktop. One column, the live card first, the four facts in a 2x2 grid, Force close full width at 48 px, and Recent calls as list rows with nothing scrolling sideways, which was today's worst phone defect. Wicket has one place, so no bottom bar is right. Force close sits at 303-351 px, in the upper third, and that's fine for a destructive action. The phone bands have 2 px of vertical padding, so Clear queue and the Period group sit 2-3 px from the band's edges and look jammed. With issue 1's 40 px rows, raise that padding to 6 px. I measured 4 Calls rows at 390 and 2 at 360 with both changes. The list rows are uneven in height. A failed call's row is 113 px against 93 at 390 because `Ran not started` wraps to its own line, and at 360 `Ran 11 s` wraps too. That's honest wrapping, and I'd leave it.

## Dark

Dark is designed, not inverted. Cards rise by lightness, `#241f27` on `#121014`, with a 2.08:1 edge and no shadow. The head bands sit darker than the card body, like today's table heads. Plum softens to `#e7a6d6`, danger to salmon, and the Force close tint stays a quiet wine. The surfaces separate at 1280 and 390. The one fault specific to dark is the Period group's bright double outline (issue 4).

## Strengths to keep

1. The live column at 1280. The numeral, the running facts, Force close, then Waiting with Clear queue, all on the first screen, with 16 table rows against today's 8. It's built for this product: a ticket counter beside its log, not a generic dashboard.
2. The islands. Every section is a raised card with a 1 px edge, its title, count and action sit on a sunk head band, and the table is the card's own body. This is the structure the owner asked for after shelfmark.
3. Mono for figures only, `not started` instead of `None`, outcomes as coloured words, and the dialog keeps today's words and order, with Cancel focused and the only solid red on the page.
4. The phone list rows for Recent calls.

## Heuristic scores, 32/40, and cognitive load

1. Visibility of system status, 3. Freshness, elapsed time, the numeral and the banner all show, but a long queue hides the numeral (issue 3).
2. Match with the real world, 4. Ticket-counter language, plain words.
3. User control and freedom, 3. Both destructive actions confirm and say what happens. By nature neither can be undone.
4. Consistency and standards, 3. A conventional header, cards and a segmented radio group, but the log changes form at 1159 px (issue 2).
5. Error prevention, 4. Cancel is focused, Force close tinted, Clear queue outlined, and only the dialog's confirm is solid.
6. Recognition rather than recall, 4. Every figure has a label, and list rows say Finished, Waited and Ran.
7. Flexibility and efficiency, 2. Clear queue is the one bulk action, and widths from 768 to 1159 lose column scanning.
8. Aesthetic and minimalist design, 3. The double outline and the bold OK column are noise.
9. Error recognition and recovery, 3. The banner, `That didn't work. Wicket may be down; try again.` and the dated `Showing what it said at 10:30 AM` variant are clear.
10. Help and documentation, 3. The privacy line and the dialogs' stated consequences arrive at the right moment, and this tool needs no more.

Cognitive load is low, with one checklist item failed: visual hierarchy, through the flat titles of issue 5. No decision point shows more than 4 options.

## Detector

Run as written it reported DEGRADED and returned `[]`. From a scratch copy with presentation-sites' parser modules it exits 2 on all seven twins.
- I dismissed `cramped-padding` on `.seg` in the queue, API-down and Direction twins, on `.wk` in the dialog frame, and on 6 `.card` specimens on the Direction sheet. They are a segment track, a full-bleed frame and tables that are meant to be the card's body.
- `flat-type-hierarchy`, 12/14/16/20 at 1.7:1 on all six screens, is real. It's issue 5. The 96 px numeral is the only big step.
- I dismissed `gpt-thin-border-wide-shadow` on the dialog. It's the recorded elevation 2, a 1 px edge plus a 16 px shadow.
- I dismissed `em-dash-overuse`, 32 on the Direction sheet. The sheet has no em dashes, and the hits are `--color-*` token names.

Keep the live column and the islands whole while fixing: every fix here is a padding, a breakpoint, a weight or an edge value, and the two-column page, the merged live card, the head bands and the phone list rows all stay.
