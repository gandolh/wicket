# wicket: the controller's rulings on the critique (2026-11-13)

They override the critic (`wicket.md`) where they differ. Everything else in the critique stands.

1. **360: take the critic's fix.** Below a 380 px container, data-table rows are 40 px with 8 px cell padding, so nothing clips and two Calls rows show at 360x800 (four at 390x844). Table rows are not tap targets; every control keeps 44 px or more.
2. **Recent calls by the card's width, not the viewport's.** A container query: the table at 620 px of card width and up (12 px cell padding under 676), two-line rows below that. Today's table at 1024 must not become three-line rows.
3. **A long queue.** The live column stays sticky; cap it at the viewport height under the header, and let Waiting's body scroll inside it with a visible edge (a rule or a fade) so the inner scroll is discoverable. Draw it once: a 12-waiting state at 1280 as an extra Proposed artboard (More states). Use only fixture-shaped rows (repeat the fixture's apps and models; no invented app names).
4. **Period and Cancel edges:** a `line-control` edge at about 3.3:1, not `ink-muted`. The plum ring stays the only strong mark on the chosen period.
5. **Type ladder:** band titles at `text-title` 20/28 when the card is 560 px or wider; phone row names at 500. Fact values stay where they are.
6. **OK column:** regular weight; bold only on a non-zero Failed (danger), as the fixture says. The `s` unit is set in the UI face; mono is for the figures only.
7. **The API-down clash:** ruling 7 of the judge result wins (whole rows over today's six cut ones). No change.
8. Re-run every Floor check from scratch, and report the first-screen table at 1280x800, 1024x768, 390x844 and 360x800 (whole rows per section; Force close and Clear queue reachable without scrolling).
