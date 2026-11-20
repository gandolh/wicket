# Wicket: two directions

Written 2026-11-12 by the art director. Repo: wicket (platform), brief 14. Both directions stay inside the recorded decisions (`corpus/wiki/decisions.md`, `decisions-web.md`): a conventional header and page with plain tables, the ticket number as the page's anchor, Force close and Clear queue behind their confirm dialogs, counts and timings only (no prompt or answer text anywhere, no invented sample text), Light / Dark / System on the Account page with light on a first visit. The token names (`page`, `surface`, `surface-sunk`, `ink`, `ink-muted`, `line`, `accent`, `danger`, `ok`, `banner-bg`, `banner-text`, `shadow-card`) are shared with the-board and lantern, so values change and names stay. Wicket has one place (the queue) plus Account, so neither direction adds a rail or a bottom bar of places: that would be invented navigation.

**Today's palette is borrowed.** Every value in `web/src/styles/index.css` matches Atlassian's design tokens: `#172b4d` ink, `#0c66e4` / `#579dff` blue, `#f4f5f7` page, `#dfe1e6` line, `#5e6c84` muted, `#1d2125` / `#22272b` dark, the `rgb(9 30 66)` shadows. Both directions retune every value, neutrals and shadows included.

**Registry.** Blue is today's family, so A may keep it, retuned to `#2356c2` (hue 221). Five apps already hold a blue (atrium, comercial-website, public-resource-map, SocialEvents, newspapper's process blue), and A's would sit 4 to 10° from three of them, so the accent is an owner question. B takes plum at hue ~315. That is 37° from ro-housing B's violet (278, still undecided) and far from `danger` red, which carries Force close, Clear queue and the Failed counts. Mulberry (319) was the-board's option C, and the-board chose B (ink), so that hue is free. Plum sits clear of the three status colours this page leans on (red, green, the yellow banner), which blue also does, and nothing else free does. Faces: Barlow Semi Condensed + Barlow (A), Reddit Sans + Reddit Mono (B). None appears in the registry or in any directions file. `theme.mjs check` clears Barlow Semi Condensed, Reddit Sans and Reddit Mono as display faces; Barlow is the body only (its Condensed cut is the Piste theme's display, so A uses the Semi Condensed one).

## 1. Today's strengths (keep all of them)

1. **The ticket number is the anchor.** `1043` at 56 px is the first thing read, in its own raised card at the top left.
2. **Live state comes first, in raised cards.** Now serving and Running sit side by side above everything else, and Force close sits in the Running card, beside the call it closes.
3. **Every section head carries its own control.** The title (with a count pill on Waiting) on the left, its action or filter on the right: Clear queue beside Waiting, the period segments beside Calls per app.
4. **Plain tables on their own surface.** A sunk header row, figures right-aligned and tabular, Failed in bold danger only when above 0, outcomes as coloured words (`OK`, `Failed`, `Cancelled`).
5. **Destructive actions are quiet until confirmed.** Outlined danger buttons, then a dialog that names the ticket and says what happens (`Force close ticket 1043?`).
6. **A calm header with freshness.** Wordmark left; `Updated 10:30:02 AM` and the account name right. When the API stops answering, a yellow banner is the first thing under the header and the records stay.

**Fix in both:** tracked capitals on `NOW SERVING` / `RUNNING` (Floor 9); `system-ui` (banned as a default); the borrowed palette; Recent calls scrolls sideways at 390 (seven columns); the full-bleed header's wordmark doesn't line up with the 1100 px content; the Now serving card has dead space under `3 waiting`; the 3-column Waiting table spreads over 1052 px; Recent calls starts below the fold at 1280 x 800.

## 2. The main screen

The queue (route `/`), header included. Today: `light-1280-queue.png`, `light-390-queue.png` (also `dark-1280-queue.png`, `dark-390-queue.png`). The Recent calls rows come from `light-1280-queue-api-down.png` plus the capture stub (the queue shot is viewport-only).

## 3. The content fixture (both directions, word for word)

- **Header.** `Wicket`; `Updated 10:30:02 AM`; the account link `demo`.
- **Now serving.** Label `Now serving`, numeral `1043`, line `3 waiting`.
- **Running.** Label `Running`; button `Force close`; facts `Ticket 1043`, `App shelfmark`, `Elapsed 14 s`, `Model gpt-oss:120b`.
- **Waiting** (pill `3`), button `Clear queue`. Columns `Ticket`, `App`, `Waited`. Rows: `1044` + `next` / `just-a-bot` / `11 s`; `1045` / `almanac` / `6 s`; `1046` / `postern` / `2 s`.
- **Calls per app**, a radio group named `Period`: `Last 24 hours` (chosen), `Last 7 days`. Columns `App`, `Calls`, `OK`, `Failed`, `Cancelled`. Rows: shelfmark 31 28 **2** 1; just-a-bot 22 21 **1** 0; almanac 9 9 0 0; postern 6 5 0 1; lantern 4 4 0 0 (bold = danger). The 7-day set, if a sketch shows it: 214 201 9 4; 167 160 5 2; 58 58 0 0; 41 38 2 1; 26 25 1 0.
- **Recent calls**, with `Counts and timings only. Wicket keeps no prompt or answer.` Columns `Finished`, `App`, `Ticket`, `Model`, `Waited`, `Ran`, `Outcome`. Fourteen rows, newest first:

| Finished | App | Ticket | Model | Waited | Ran | Outcome |
|---|---|---|---|---|---|---|
| 10:28 AM | shelfmark | 1042 | gpt-oss:120b | 0 s | 2 s | OK |
| 10:21 AM | just-a-bot | 1041 | gpt-oss:20b | 1 s | 3 s | OK |
| 10:14 AM | almanac | 1040 | qwen3-coder:480b | 2 s | 4 s | OK |
| 10:07 AM | postern | 1039 | None | 2 s | None | Failed |
| 10:00 AM | lantern | 1038 | gpt-oss:20b | 3 s | 7 s | OK |
| 09:53 AM | shelfmark | 1037 | qwen3-coder:480b | 3 s | 9 s | Cancelled |
| 09:46 AM | just-a-bot | 1036 | gpt-oss:120b | 4 s | 9 s | OK |
| 09:39 AM | almanac | 1035 | gpt-oss:20b | 0 s | 11 s | OK |
| 09:32 AM | postern | 1034 | qwen3-coder:480b | 1 s | 12 s | OK |
| 09:25 AM | lantern | 1033 | gpt-oss:120b | 2 s | 2 s | OK |
| 09:18 AM | shelfmark | 1032 | gpt-oss:20b | 2 s | 4 s | OK |
| 09:11 AM | just-a-bot | 1031 | None | 3 s | None | Failed |
| 09:04 AM | almanac | 1030 | gpt-oss:120b | 4 s | 6 s | OK |
| 08:57 AM | postern | 1029 | gpt-oss:20b | 4 s | 9 s | Cancelled |

`None` is drawn in `ink-muted`. **States** (the Direction sheet's strip, real copy only): idle `None yet`, `Nobody waiting`, `Nothing running.`, `Nobody waiting.`, `No calls in this period.`, `No calls yet.`; loading `Loading…`, `Loading the queue…`; API down `Wicket's API isn't answering. Trying again every few seconds.` with `Loading…` in the header, the live cards absent and the records still shown.

## 4. Directions

### A. The counter, re-set (Evolve today)

- **Idea:** today's page in today's order, with the ticket number set like counter signage and a palette of its own.
- **Skeleton:**
  - **1280.** A 56 px sticky header on `surface` with a `line` foot; its contents sit inside the 1100 px container, so `Wicket` lines up with the cards. Under it, today's 1fr / 2fr row: the Now serving card and the Running card, equal height. Running sets its four facts as one row of term-over-value pairs (Ticket, App, Elapsed, Model), with `Force close` (outlined danger, 36 px) at the head's right. Then Waiting, Calls per app and Recent calls, each a head row (title in the display face, count pill, control on the right) over its table card. Waiting's table is capped at 640 px so `11 s` stays near `1044`. The privacy line sits under the Recent calls title, not floated to the far edge.
  - **Cards:** `surface`, radius 10, `shadow-card` in light and a 1 px `line-strong` edge in dark. Table heads on `surface-sunk`; rows 40 px at 1280, 48 at 390. `next` becomes a small `accent-soft` chip, same word.
  - **390.** The same stack, 16 px gutters. Running's facts as a 2 x 2 grid; `Force close` full width (48 px) at the card's foot. Waiting and Calls per app stay tables (they fit). Recent calls becomes list rows in one card: app (16/24, 600) with the outcome word on the right; under it ticket and model in `ink-muted`; under that `Finished 10:28 AM`, `Waited 0 s`, `Ran 2 s` as spaced label and value pairs (no middle dots). No sideways scroll.
- **Type:** Barlow Semi Condensed 600 for the numeral (88/88 at 1280, 64/64 at 390), the wordmark (22/28) and section titles (18/24). Barlow 400/500/600 for the rest: 12/16 pill and privacy line; 14/20 tables, facts and labels at 1280; 16/24 body and phone rows. Card labels `Now serving` and `Running` in Barlow 14/20 600 `ink-muted`, sentence case. `tnum` on every figure; check that Barlow's tabular lining figures render at 88 px.
- **Palette** (light / dark), today's names: page `#ecedf1` / `#111317`; surface `#ffffff` / `#1f2229`; surface-sunk `#f3f4f7` / `#171a1e`; ink `#191c23` / `#e7e9ee`; ink-muted `#565c69` / `#a2a8b4`; line `#d8dbe2` / `#343842`; line-strong (new, card edges in dark) `#c0c5ce` / `#4b505c`; accent `#2356c2` / `#8fb3f7`; on-accent `#ffffff` / `#0b1530`; accent-soft (new, the `next` chip and chosen segment hover) `#e5ecfa` / `#1e2d4a`; danger `#ad2e27` / `#f2877d`; danger-line `#c55a53` / `#b8605a`; ok `#1b7444` / `#62c996`; banner-bg `#fbf0c8` / `#352d16`; banner-text `#574100` / `#f0d27c`. Shadows tint from ink, never from `rgb(9 30 66)`.
  - Pre-checked (light / dark): ink on surface 17.1 / 13.1; ink-muted on surface-sunk 6.1 / 7.3; ink-muted on page 5.7 / 7.8; accent on surface 6.6 / 7.6; accent on page 5.6 / 8.8; on-accent on accent 6.6 / 8.6; accent on accent-soft 5.6 / 6.5; danger on page 5.6 / 7.6; danger-line on page 3.6 / 4.3 and on surface 4.2 / 3.7; ok on surface 5.8 / 7.8; banner 8.5 / 9.2; surface on page 1.17 / 1.17; line-strong on page 1.48 / 2.3. Re-run `contrast.mjs`.
- **Signature:** the ticket numeral as counter signage: `1043` in Barlow Semi Condensed at 88 px, tabular, in `ink` (never the accent), with `3 waiting` under it.
- **Reference:** `stripe`, for one move: a dense tabular rhythm, figures right-aligned in a column you can scan. Nothing of its palette or type.

### B. Live beside the log

- **Idea:** everything happening now sits in one column that stays put, and the record of what already happened scrolls beside it.
- **Skeleton:**
  - **1280.** The 56 px header as A, inside a 1200 px container with 24 px gutters. Under it two columns, 24 px apart:
    - **Live, 400 px, sticky under the header.** Card 1, `Now serving`: the numeral in Reddit Mono 600 at 96/96 with `3 waiting` beside it on the baseline, a `line` rule, then `Running` as a sub-head over the four facts (Ticket, App, Elapsed, Model) as term and value rows, and `Force close` full width (outlined danger, 40 px) at the card's foot. Card 2, `Waiting`: a `surface-sunk` head band with the title, pill `3` and `Clear queue`, and the plain table as the card's own body (not a card in a card). Today's two top cards become one, and every fact and button stays.
    - **The log, the rest of the width.** A Calls per app card (head band with title and the `Period` segments, then the table) and a Recent calls card (head band with title and the privacy line, then the 7-column table). At 1280 x 800 the live column and the first five Recent calls rows show without scrolling.
  - **Cards:** `surface`, radius 10, a 1 px `line-strong` edge in both themes plus `shadow-card` in light, so the `surface-sunk` head bands (about 1.06 against `page`) stay inside a visible edge. The count pill is `accent-soft` with `ink` text (14.4 / 11.3), never sunk on a sunk band.
  - **A long queue.** The column stays sticky only while it fits under the header. Waiting shows its first 8 rows and the card's body scrolls inside the card for the rest (up to 200 tickets).
  - **840 to 1199:** live column 360 px. **Under 840:** one column, live first, nothing sticky.
  - **390.** Card 1 with the numeral at 72/72, facts as a 2 x 2 grid, `Force close` 48 px full width; then Waiting, Calls per app, and Recent calls as two-line list rows (app and outcome on line 1; ticket and model in Reddit Mono `ink-muted`, then `Finished 10:28 AM`, `Waited 0 s`, `Ran 2 s` on line 2, wrapping as needed).
  - **API down.** The banner (same copy) becomes the live column's first card, on `banner-bg` with a `line-strong` edge, so the column never sits empty beside the log.
- **Type:** Reddit Sans 400/500/600/700 for all UI and labels: 12/16 pill and privacy line; 14/20 tables and facts; 16/24 body and phone rows; 20/28 card titles and the wordmark (700). Reddit Mono 500/600 only where the data is an identifier or a figure: the numeral, the Ticket column, model ids, times and durations. Never for a label (Floor 64).
- **Palette** (light / dark), today's names plus A's two new ones: page `#eeecf0` / `#121014`; surface `#ffffff` / `#241f27`; surface-sunk `#f4f2f5` / `#18151a`; ink `#1d1920` / `#ece7ef`; ink-muted `#5a5460` / `#a9a2b0`; line `#dbd6de` / `#38323d`; line-strong `#c4bdc8` / `#4d4652`; accent (plum) `#7d2668` / `#e7a6d6`; on-accent `#ffffff` / `#230b1c`; accent-soft `#f6e6f0` / `#3e2536`; danger, danger-line, ok and banner as A.
  - Pre-checked (light / dark): ink on surface 17.3 / 13.3; ink-muted on surface 7.3 / 6.5; ink-muted on surface-sunk 6.6 / 7.3; accent on surface 8.9 / 8.3; accent on page 7.6 / 9.8; accent on accent-soft 7.5 / 7.1; on-accent on accent 8.9 / 9.5; danger on surface 6.6 / 6.6; ok on surface 5.8 / 7.9; surface on page 1.17 / 1.17; line-strong on page 1.56 / 2.1. Re-run `contrast.mjs`.
- **Accent use:** the chosen period segment, the `next` chip, the account link and the focus ring. Never the numeral, never a danger action.
- **Signature:** the live column. The number, the running call with its Force close, and the waiting line, all visible at once at 1280 x 800 and still in place while the log scrolls.
- **Reference:** `vercel`, for one move: a deployment page's status card held beside a scrolling log. Nothing of its palette or Geist.

## 5. Registry lines

| wicket (A) | The counter, re-set | Barlow Semi Condensed (numeral, wordmark, titles) | Barlow | blue `#2356c2`, hue 221 (today's family, retuned off Atlassian's values) | 56 px header aligned to the container; Now serving and Running cards side by side; head rows with their control over plain table cards; phone: one stack, Recent calls as list rows |
| wicket (B) | Live beside the log | Reddit Mono (numeral, tickets, model ids, timings) | Reddit Sans | plum `#7d2668`, hue ~315 | 56 px header; a 400 px sticky live column (Now serving merged with Running, then Waiting) beside a log column (Calls per app, Recent calls); phone: live first, Recent calls as list rows |

## 6. Questions for the owner (ask sticky)

1. B makes the page two columns at 1280 and merges Now serving and Running into one card. Both directions turn Recent calls into list rows at 390. The recorded "a header, a page, plain tables" (decisions.md, "A queue page with force close and clear queue") arguably moves. Is that welcome?
2. The accent: keep today's blue, retuned (A; five other apps hold a blue), or move to plum (B)?
3. Approve this direction?
