# Images

How each image was made, so the next refresh is a re-run. Re-take an image
when the screen it shows changes.

| File | Shows | How to reach that state | Viewport | Data | Taken |
|---|---|---|---|---|---|
| hero.webp | The queue page with a call running and two waiting | The recipe below: one short call from `just-a-bot`, one "quota check" from `ro-housing` (it fails with a 429), then a "slow" call from `just-a-bot` and two short ones from `ro-housing` | 1440×900 @2x, cropped to 1560 px tall | dummy apps, prompts and account, stand-in cloud | 2026-11-04 |
| clear-queue-confirm.webp | The Clear queue dialog | Same state, press Clear queue | 1440×900 @2x, cropped around the dialog | same | 2026-11-04 |
| after-force-close.webp | The page after Clear queue and Force close | Confirm the dialog, then Force close and confirm | 1440×900 @2x, cropped to 1710 px tall | same | 2026-11-04 |
| architecture.svg | How a call moves through Wicket | Hand-written SVG, this file is the source | 1200×630 viewBox | none | 2026-11-04 |

## Recipe

The screenshots need calls that stay running and waiting, which a real cloud
call won't do on cue. [`stand-in-cloud.mjs`](stand-in-cloud.mjs) answers
Ollama's chat API on loopback instead: slowly when the prompt says "slow",
with a 429 when it says "quota", and quickly otherwise. It is not a model and
sends nothing anywhere.

1. `node docs/images/stand-in-cloud.mjs` (listens on 127.0.0.1:11999).
2. In another terminal, with a scratch database and throwaway tokens:

   ```bash
   export WICKET_DB=/tmp/wicket-shots.sqlite
   export WICKET_APP_TOKENS="just-a-bot=$(openssl rand -hex 32),ro-housing=$(openssl rand -hex 32)"
   export OLLAMA_API_KEY=stand-in WICKET_CLOUD_URL=http://127.0.0.1:11999
   SEED_USERNAME=demo SEED_PASSWORD=<any throwaway> npm run seed -w @wicket/server
   npm run dev
   ```

3. Post the calls in the table with `curl` (the job example in
   [getting-started.md](../getting-started.md)), sign in as `demo` at
   <http://localhost:5179/wicket/>, and capture.

Capture method: `agent-browser --session <name> set viewport 1440 900 2`, then
`screenshot` to an absolute path, then
`ffmpeg -i shot.png -vf crop=W:H:X:Y -c:v libwebp -quality 82 <file>.webp`
(see the readme-docs skill's capture guide). The page shows the account name
top right and the app names in the tables, so use a throwaway account and
dummy tokens, never a real account.
