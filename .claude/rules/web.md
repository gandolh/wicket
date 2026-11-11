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
- Colours are tokens only: the custom properties in `web/src/styles.css`.
  No hex, `rgb()` or named colour in a component.
- Dark mode follows the system (`prefers-color-scheme`) until brief 12
  replaces it with the Light / Dark / System switch.
- `web/vendor/ward/` holds Ward's generated client and its React hooks. Never
  edit it; a newer ward-auth build replaces it.
- Tests render `QueueView`'s pieces with `renderToStaticMarkup` and assert on
  the text, never on class names (`web/src/QueueView.test.tsx`).
- `npm run check:conventions` runs `check-base-ui` over this folder,
  `--warn-only` until brief 12.
