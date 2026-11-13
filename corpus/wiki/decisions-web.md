---
summary: Why Wicket's page is styled with Tailwind 4 in the small tools' shared token names (page, surface, ink, line, accent, danger and the rest, shared with the-board and lantern), and why its theme is a Light / Dark / System choice on the account page, light on a first visit, kept on the device and set before first paint (brief 12, 2026-11-11). and the redesign "Live beside the log" (brief 14, 2026-11-13): plum accent, Reddit Sans and Mono, two columns at 1280. Read before changing the tokens, the theme, the layout or how the page is styled.
updated: 2026-11-13
---

# Decisions: the page's styling

The styling entries, split from [decisions.md](decisions.md), which went past 200 lines.

## The page is styled with Tailwind, in the small tools' shared token names
_2026-11-09_, the owner: Base UI is styled with Tailwind 4, and whole apps move to it. Built 2026-11-11. The page's one
stylesheet is `web/src/styles/index.css`: the tokens in `@theme`, a few base rules, and no other CSS. Everything else
is utilities on the JSX, merged with `cn()` (`clsx` and `tailwind-merge`, told the page's names). Tailwind's own colour,
text, radius, shadow, container and font scales are cleared, so only these tokens exist. The look didn't change: the
before and after screenshots at 1280 and 390 px matched, bar the theme switch. The token names are shared with
brief-board (the-board) and lantern, three tools with one vocabulary and a value set per app: a name says the role,
never the value, so `page`, `surface`, `surface-sunk`, `ink`, `ink-muted`, `line`, `accent`, `danger`, `ok`,
`banner-bg` and `banner-text` for colour, `shadow-card` and `height-top` for the old `--shadow` and `--top-h`. The
page's 14 px root size moved to `body`, so `html` keeps the reader's setting. Rejected: keeping the plain stylesheet
beside the Base UI wrappers; CSS modules; and `bg-bg` and `text-text` as names, which name nothing.

## The theme is Light, Dark or System, light on a first visit
_2026-11-10_, the owner. A first visit shows the light theme, even on a dark system; the choice is kept on the device in
`localStorage` and set on `<html data-theme>` by a small script in `web/index.html` before the first paint, so Dark
never flashes light. The colour tokens are `light-dark()` pairs and `color-scheme` follows the attribute, so System
tracks the operating system live and no component writes a `dark:` class. The switch is a `RadioGroup` on the account
page ([ThemeSwitch.tsx](../../web/src/components/ThemeSwitch.tsx), store in
[theme.ts](../../web/src/lib/theme.ts)): it saves nothing on the server, so it is not a `ToggleGroup`. The base-ui
skill's mechanism won over the brief's "redefine the tokens under `[data-theme=dark]`": `light-dark()` keeps both
themes in one place per token. Rejected: following the system with no switch, which Wicket had; a switch that stays
in the header, where the page has no room.

## The redesign "Live beside the log": plum, Reddit Sans and Mono, two columns
_2026-11-13_, the owner approved it on the estate redesign board with every question standing as proposed. Built the
same day; the shipped look is in [design.md](../../docs/design.md). Three calls:

- **Two columns at 1280.** Reopens the layout line of "A queue page with force close and clear queue" in
  [decisions.md](decisions.md), kept there as history. The live state (the numeral, Running's facts, Force close,
  Waiting, Clear queue) is one column beside the log, so every action sits inside its card. Rejected: today's
  full-width stack with two cards side by side, which left an empty band under the waiting count; and runner-up A,
  "The counter, re-set", whose half-width Waiting table stranded Clear queue at the far edge.
- **The accent moves from blue to plum `#7d2668`** (`#e7a6d6` in dark), because five other apps hold a blue. The
  family token names are unchanged and only values moved, so the-board and lantern are not affected. Plum marks only
  the chosen period, the `next` chip, links and the focus ring, never the numeral and never a danger action.
- **Reddit Sans for labels and titles, Reddit Mono for figures only**, three weights, self-hosted from
  `@fontsource` at exact pins. The old system stack and the tracked capitals are gone, and with them the
  `text-page-title` and `tracking-label` tokens.

Also settled on the board: Force close is a tint, not solid, so the dialog's confirm stays the only solid red; a
failed call's Model and Ran read `not started` where the page printed `None`.
