# The wicket tokens: board role to app token

Mechanism: the app's own, kept. `@theme` holds each colour as `light-dark(light, dark)`, picked by `color-scheme` on `:root`; the shadows use `light-dark()` inside their colour slots, so there is no `[data-theme="dark"]` block. `wicket.tokens.css` replaces the colour, shadow, font, text, radius and container groups of `web/src/styles/index.css`; the `--*: initial` resets, `--height-top`, the z-index group, `--container-account|dialog|gate`, `@layer base` and the custom variant stay. Every colour value moves: today's palette is Atlassian's, the board's is a plum-tinted grey ladder with a plum accent.

## Renamed or remapped (board role to app token)
- page, surface, surface-sunk, ink, ink-muted, line, danger, ok, banner-bg, banner-text: same names, new values
- accent: same name, now plum (#7d2668 light, #e7a6d6 dark) instead of blue; the base layer's `:focus-visible` outline keeps using it
- danger-line: same name, now two explicit values instead of a mix of danger and line
- ok-wash, danger-wash: same names and same mixes (12% over the surface); danger-wash now also fills Force close
- scrim: same name, new values per theme (was a fixed `rgb(9 30 66 / 0.45)`)
- shadow-card (elevation 1: card, header) and shadow-dialog (elevation 2): same names, tinted from ink; dark has no shadow on cards, a lighter surface and the `line-strong` edge carry it
- fonts: Reddit Sans -> `font-sans` (was `system-ui`); Reddit Mono -> new `font-mono`, also set as `default-mono-font-family`
- sizes, with line height and weight on each as `--text-*--line-height|font-weight`: 12/16 -> `text-small`; 14/20 -> `text-body`; 16/24 700 -> `text-heading`; 20/28 700 -> `text-title` (was 18; also every card's band title from a 561 px page up, 16 on the phone); 96 -> `text-ticket` (was 56) with `leading-ticket` 1 (was 1.1); 64 -> `text-ticket-phone` (was 44). Weights are 400, 500, 700 only
- `font-weight-title` 650 -> 700 (Reddit Sans ships 400, 500, 700 here)
- radii: control 4 -> 8; group 6 -> 8; card 8 -> 10; pill stays 10
- `container-page` 1100 -> 1200; the page's grid is `grid-cols-[var(--container-live)_minmax(0,1fr)]` at 1200 and up
- spacing: the board's 4 8 12 16 20 24 are Tailwind's default 4 px scale; no tokens

## New tokens (component that needs them)
- `line-strong`: every card's 1 px edge and the dialog's 
- `line-control`: the Period group's edge and Cancel's edge (3:1 UI edge, quieter than ink-muted)
- `accent-soft`: the count pill on Waiting, the `next` chip, the chosen Period segment's fill
- `font-mono`: the numeral, ticket numbers, elapsed, waited, ran, model ids, counts, times
- `leading-ticket-phone`: the numeral's 56 px line at 64 px type on a phone
- `radius-segment`: a Period segment inside its group
- `container-live`: the live column's width (the page grid)

## App tokens the design no longer uses (keep or drop is the code brief's call)
- `text-page-title` (21 px): the wordmark is `text-title` now
- `tracking-label` (0.02em): the tracked capitals on Now serving and Running are gone (Floor 9)
- a separate `on-accent` was never added: plum is a text, outline and ring colour here, and its only fill is the pale `accent-soft`, which takes `ink`
- the dialog's solid confirm keeps today's `text-surface` on `bg-danger`
