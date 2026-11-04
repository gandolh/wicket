# Images

How each image was made, so the next refresh is a re-run. Re-take an image
when the screen it shows changes.

| File | Shows | How to reach that state | Viewport | Data | Taken |
|---|---|---|---|---|---|
| hero.webp | The queue page with a call running and two waiting | The local container check ([owner-setup.md](../owner-setup.md#5-check-the-containers-locally)), signed in as a throwaway account `demo`; one short call from `just-a-bot`, then a long one ("count from 1 to 400") from `just-a-bot` and two short ones from `ro-housing` | 1440×900 @2x, cropped to 1480 px tall | dummy apps, prompts and account; backup `llama3.2:1b` | 2026-11-04 |
| clear-queue-confirm.webp | The Clear queue dialog | Same state, press Clear queue | 1440×900 @2x, cropped around the dialog | same | 2026-11-04 |
| after-force-close.webp | The page after Clear queue and Force close | Confirm the dialog, then Force close and confirm | 1440×900 @2x, cropped to 1640 px tall | same | 2026-11-04 |
| architecture.svg | How a call moves through Wicket | Hand-written SVG, this file is the source | 1200×630 viewBox | none | 2026-11-04 |

Capture method: `agent-browser --session <name> set viewport 1440 900 2`, then
`screenshot` to an absolute path, then
`ffmpeg -i shot.png -vf crop=W:H:X:Y -c:v libwebp -quality 82 <file>.webp`
(see the readme-docs skill's capture guide). The page shows the account name
top right and the app names in the tables, so use a throwaway account and the
dummy tokens from the container check, never a real account.
