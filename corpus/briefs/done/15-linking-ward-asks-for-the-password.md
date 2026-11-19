# Brief 15: Linking Ward asks for the password

**Depends on:** Ward's library at the version that adds the look-alike username check (2026-11-19; the dispatch prompt names the wzd_auth commit to vendor from).

**Before you start:** run `brief-board guide` (the repo's `CLAUDE.md` says so).

Filed 2026-11-19 by the controller. The owner's rule of 2026-11-17: an app links or unlinks a Ward account only after the local password is typed again. Ward's library carries the rule from 1.0.0; this app gets it when it vendors the new copy. The same update refuses a new or changed local username that looks like an existing one (Unicode's confusable skeleton: `AIice` against `alice`, `b0b` against `bob`).

## Context

This app vendors ward-auth 0.7.0 in `server/vendor/ward` and `web/vendor/ward`. Its code calls the link at: `web/src/AccountPage.tsx:71` (link).

What the update changes here:

- `POST /ward/link` takes `{ currentPassword }`: 400 `invalid_request` without it, 401 `invalid_credentials` when it is wrong, 429 `too_many_attempts` with `retryAfterSeconds` under the change-password budget.
- The browser calls take the password: `link(currentPassword)` / `startWardLink(currentPassword)`. The old call shape no longer compiles, so the typecheck finds every call site.
- A link start is held in the server's memory for ten minutes; one still waiting for Ward when the server restarts lands as `?ward_error=invalid_callback` (the words for it exist).
- The username key: a migration at start adds a key column and fills it. Two existing accounts with the same key are both kept and logged once. Nothing to do by hand.

## Decisions

- **Both copies in one commit.** The new server copy refuses a link or unlink from an old web copy (400); an old server ignores the new field.
- **The password field sits with its control:** next to the Link button. Labelled as the app labels its other password fields ("Current password" or the app's language), `type="password"`, `autocomplete="current-password"`. A refusal stays on the page: `invalid_credentials` and `too_many_attempts` (with the wait) show beside the field, which keeps focus.

## Files you OWN

- `server/vendor/ward/` and `web/vendor/ward/`: generated, written only by Ward's vendor script.
- The settings code named above, the server's auth plugin options, and their tests.
- Corpus: `corpus/wiki/status.md`, `corpus/log.md`, the wiki page that describes sign-in.

## Files you must NOT touch

- The wzd_auth repo: read only (its vendor script writes only into this repo). Other features.

## What to do

1. Vendor both copies from the wzd_auth checkout at the commit the dispatch prompt names: `npm run vendor -- <this repo>/server/vendor/ward`, then the same for `web/vendor/ward`, in one commit with the call-site changes.
2. Server tests that POST `/ward/link` with a session send `{ currentPassword }`. New: link without it, with a wrong one and with the right one; a linked user still signs in with Ward.
3. The settings UI as decided, with a test that the call carries the password and that a wrong one shows the message.
4. A test that a new local account with a look-alike name (`AIice` when `alice` exists) is refused with the taken-name answer on `/register`, where this app has a route that creates or renames local accounts; skip it and say so where it has none.
5. Start the app on its dev seed once and read the start log: the username-key migration ran; note any shared-key line.
6. Shots of the settings at 1280 light and 390 dark; read them for clipping.

## Acceptance

- [ ] Both vendored copies at the new version; the tests above pass; `npm run check` exit 0; `bash corpus/lint.sh` OK.
- [ ] The outcome note lists each CHANGELOG entry this app crossed and what it needed.
- [ ] End move `ready_for_deploy` with the app's deploy step (server and web both change).

## Outcome (2026-11-19)

Both vendored copies are ward-auth 1.1.0 (checked against the build's SHA256SUMS), in one commit with the call-site
change. What people notice: the account page's Link Ward has a "Current password" field beside it; a wrong password
reads "Wrong password. Type your Wicket password to link Ward.", too many tries says how long to wait, and the field
keeps focus. A first Ward sign-in whose name looks like a local user's gets `-2`. Rename stays off
(`allowRename: false`).

CHANGELOG entries crossed (0.7.0 to 1.1.0):

- 0.7.1, 0.7.2: nothing to change.
- 1.0.0: link takes the password (done: `LinkWard.tsx`, `useWardLink().link(currentPassword)`); both copies together;
  a link waiting for Ward at a restart lands as `invalid_callback` (words already exist); cookie and budget changes
  need nothing. No unlink in this app.
- 1.1.0: migration 5 runs by itself, nothing by hand. The first boot of a scratch seeded database filled
  `auth_users.username_skeleton` and logged no shared-key line (the app logs nothing for the migration itself). The
  owner's real database gets it at the first boot after deploy; no step back without a backup.

Tests: `server/src/plugins/auth/ward-link.test.ts` (Ward on with a fake discovery: 400 without the password, 401
wrong, 429 after five, 200 with the right one, 401 signed out) and `web/src/LinkWard.test.tsx` (the call carries the
password, empty is caught, a wrong one shows beside the field with focus kept, the wait is named). `npm run check`
exit 0. Shots at 1280 light and 390 dark, with the error showing, read: no clipping. Not done: the look-alike
`/register` test (the app has no register or rename route; both answer 404), a "linked user signs in with Ward" test
(needs a signed ID token; the library's own tests cover it), a live link (no Ward locally).
