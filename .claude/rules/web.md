---
paths:
  - "web/src/**"
---

# The queue page (`web/src`)

- Read the `base-ui` skill before you add or change a component.
- Base UI is imported only by the wrappers in `web/src/components/ui/`:
  `ConfirmDialog.tsx` and `RadioGroup.tsx`. Pages import the wrapper, never
  `@base-ui/react`.
- A filter, or a setting kept on the device, is a `RadioGroup` (arrow keys
  choose). A picker that saves to the server on each choice is a guarded
  `ToggleGroup`. No native `<select>` for either.
- Jsdom tests only for a wrapper that holds logic (`ConfirmDialog.test.tsx`,
  with a `// @vitest-environment jsdom` docblock); select by role and name.
- A trigger around one of our components uses `render`, never a wrapping
  `span` or `div`.
- Every confirm goes through the one confirm wrapper,
  `components/ui/ConfirmDialog.tsx`. No `window.confirm`, `alert` or `prompt`.
- Styling is Tailwind utilities, merged with `cn()` from `lib/cn.ts`. Tokens
  come only from `@theme` in `web/src/styles/index.css`, the page's one
  stylesheet: no arbitrary colour (`bg-[#…]`), no hex, `rgb()` or named colour
  in a component, and no `style` prop. A new token's name also goes in
  `cn.ts`'s lists.
- `max-sm:` is the phone breakpoint. Type sizes come from the named scale
  (`text-small`, `text-body`, …), not `text-[13px]`.
- Both themes change when a colour token changes: tokens are `light-dark()`
  pairs, and no `dark:` class is needed. `data-theme` on `<html>` is set only
  by the Light / Dark / System switch (`lib/theme.ts`) and the script in
  `web/index.html`.
- A class string held in a bare `const` isn't linted; put it in `cn()` or a
  `className` so `better-tailwindcss` checks its order.
- `web/vendor/ward/` holds Ward's generated client and its React hooks. Never
  edit it; a newer ward-auth build replaces it.
- Tests render `QueueView`'s pieces with `renderToStaticMarkup` and assert on
  the text, never on class names (`web/src/QueueView.test.tsx`).
- `npm run check:conventions` runs `check-base-ui` over this folder, strict.
  `npm run test:e2e -w @wicket/web` runs the Playwright spec (set `CHROME` to an
  installed Chrome).
