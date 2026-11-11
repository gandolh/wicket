---
paths:
  - "server/src/**"
  - "shared/src/**"
---

# The API (`server/src`, `shared/src`)

- Read the `code-structure` skill before you add or move a route, a plugin or
  a module.
- `server/src/config.ts` is the only reader of the environment. The entry
  and the seed still read it themselves (an ESLint warning until brief 13);
  add no other reader.
- **No prompt or answer text at rest, and none in a log or an error.**
  Records hold counts and timings only. The test "keep no prompt or answer
  text, in the database or the log" in `server/src/app.test.ts` proves it;
  keep it passing.
- Errors are `{ code, message }`, the `ErrorBody` of `shared/src/api.ts`. A
  500 never echoes a thrown message.
- App tokens guard `/v1/jobs`; a signed-in session guards the rest of `/v1`.
  Neither one opens the other's routes.
- `GET /v1/health` stays open: the deploy's health check calls it.
- `server/vendor/` is Ward's generated library. Never edit it.
- `shared/src/api.ts` is the contract just-a-bot and ro-housing build
  against ([corpus/wiki/api.md](../../corpus/wiki/api.md)). Changing it is
  the owner's call.
- `npm run check:conventions` runs `check-structure` over these folders,
  `--warn-only` until brief 13.
