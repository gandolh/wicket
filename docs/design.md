# The page's design

The queue page, as it shipped on 2026-11-13: the direction "Live beside the log", approved on the estate redesign
board. This describes what the code does; the reasons are in [decisions-web.md](../corpus/wiki/decisions-web.md).

## The idea

A header, a page and plain tables, with no new navigation. At 1280 px the page is two columns: the live state of the
queue on the left, the log on the right.

- **Live column** (400 px from 1200 px up, 360 px from 840 px): one card holding the ticket numeral with its waiting
  count, a rule, and Running's four facts in a 2 x 2 grid, with Force close at its foot; then Waiting. The column is
  sticky under the header and capped to the viewport height, so Waiting's body scrolls inside its card past eight
  tickets, with a soft shadow at its foot while there is more.
- **Log column:** Calls per app, with the Period switch in its head band, then Recent calls.
- **Under 840 px** one column, in this order: the live card, Waiting, Calls per app, Recent calls. When the API stops
  answering, the banner is the first card of the live column (the first card of the stack on a phone).

## Tokens

All in `web/src/styles/index.css`, light and dark as `light-dark()` pairs. The family names are unchanged; only
values moved.

| Group | Values |
|---|---|
| Neutrals | A plum-tinted grey ladder: `page`, `surface` (lighter than the page in both themes), `surface-sunk` (a head band), `ink`, `ink-muted`, `line` (row rules), `line-strong` (a card's edge), `line-control` (a control's edge, at least 3:1) |
| Accent | Plum `#7d2668` light, `#e7a6d6` dark, for links, the focus ring and the chosen period's outline. Its only fill is `accent-soft`, a pale plum under the count pill, the `next` chip and the chosen period; the text on it is `ink`. Never on the numeral, never on a danger action |
| Status | `danger` and `danger-line`, `ok`, `banner-bg` and `banner-text`; `danger-wash` and `ok-wash` are 12% mixes over the surface |
| Elevation | `shadow-card` (card, header), `shadow-dialog`. Dark has no card shadow: the lighter surface and `line-strong` carry it |
| Type | Reddit Sans 400, 500, 700 for labels and titles; Reddit Mono 500, 700 for figures only (the numeral, tickets, times, durations, model ids, counts). Self-hosted from `@fontsource/reddit-sans` and `@fontsource/reddit-mono`, both 5.3.0. Sizes 12, 14, 16, 20, 96, and 64 on a phone |
| Shape | Radii 8 (control, group), 6 (a Period segment), 10 (card, pill). The page is 1200 px wide |

## Controls

- **Force close** is a tint (`danger-wash` fill, `danger-line` edge) at the foot of the live card, full width, at every
  width. It is the only loud control on the page.
- **Clear queue** is an outline in Waiting's head band. The dialog's confirm is the only solid red.
- **Period** is a segmented group with a `line-control` edge; the chosen segment is `accent-soft` with a plum outline.
- Buttons are 40 px tall, 44 on a phone; the dialog's two buttons are 44, and 48 sharing the row on a phone. Table
  rows are 40 px; rows are not tap targets.
- Tinted primary button (sign-in): `accent-soft` fill, plum edge, `ink` text.

## Tables and lists

- Calls per app and Waiting are tables. Under a 380 px page their cells take 8 px of side padding (12 at the ends).
- Recent calls follows its own card's width, by a container query: a table from 620 px (12 px cell padding under
  676), list rows below that, in two lines from 480 px.
- The OK and Cancelled columns are regular weight; only a non-zero Failed is bold and red.
- A call that never started shows `not started`, muted, in its Model and Ran cells. A running call with no model yet
  keeps `Not chosen yet`.

## Screens the board never drew

They take the tokens and the patterns above, with no new layout: sign-in (the card, `line-control` fields, the tinted
button), the session-ended notice, the gate's Loading and "can't be reached", the account page, the Clear queue dialog
in its four states, the action notices, and an idle queue ("None yet", "Nothing running.", "Nobody waiting.").

## Checks

`npm run check` runs the contrast test (`web/src/styles/contrast.test.ts`, 52 cases over the tokens in both themes).
`npm run test:e2e -w @wicket/web` runs the theme tests and `floor.spec.ts`: a visible focus ring on every Tab stop, no
running animation under reduced motion, and no sideways scroll at 390 px, on each screen. Screenshots of every screen
come from the same fixtures: `SHOTS_DIR=<folder> npx playwright test shots` in `web/`.
