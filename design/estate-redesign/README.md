# The redesign: "Live beside the log"

This folder is the design record of Wicket's redesign. The estate redesign board, where it was drawn and approved, is a private canvas; this is a copy of the app's page on it plus the build behind that page. The owner approved it on 2026-11-13, and [brief 14](../../corpus/briefs/done/14-a-redesign-with-hallmark-on-the-estate-board.md) built it. The code is now the source of truth: where the app and these files differ, the app wins, and later work may have moved a screen on. Read this folder to see what was decided and why before reshaping a screen.

## The owner's decisions

The owner approved the whole board on 2026-11-13, with every question standing at what the board proposed unless they reopened it. The questions this app's page asked:

- **Ask:** 1. Reopened: the queue page becomes two columns at 1280, with Now serving and Running merged into one card (decisions.md, "A queue page with force close and clear queue": "Conventional layout: a header, a page, plain tables"). The header, the tables and every action stay. Welcome? 2. The accent moves from today's blue to plum #7d2668 (five other apps hold a blue). OK? 3. Approve Live beside the log as Wicket's direction?
- **Reopened:** Recorded (decisions.md, "A queue page with force close and clear queue", 2026-11-04): "Conventional layout: a header, a page, plain tables. The owner rejects metaphor-heavy navigation." Proposed: still a header and plain tables with no new navigation, but the live state is one column beside the log at 1280 and the merged card replaces two side-by-side cards.

Where the files below disagree, the later layer wins: the owner's decisions, then the controller's rulings, then the judges' rulings, then the directions file.

## What is here

| Path | What it holds |
|---|---|
| `directions/wicket.md` | The director's brief: both directions (the winner is the one built), the shared fixture and the screens to draw. |
| `judge/wicket/RESULT.md` | The blind judging against today and the rulings that came with the win. |
| `critiques/wicket-controller.md`, `critiques/wicket.md` | The design critic's review against today, and the controller's rulings over it. |
| `manifests/wicket.tokens.css`, `manifests/wicket.tokens-map.md` | The token hand-off in the app's own names, and the renamed, new and unused tokens. |
| `manifests/wicket.board-notes.md` | What the board said beside the screens: the asks, decisions, reopened rules, open questions, the contrast table and the runner-up. |
| `work/wicket/twins/*.html` | Each drawn screen as static HTML, light and dark: open one in a browser. |
| `work/wicket/shots/` | The twins rendered at 1280 and 390, light and dark, WebP. `direction.webp` is the board's direction sheet. |
| `shots/wicket/` | Today's screens as the board showed them before the redesign. |

People's names and data in the pictures come from seeded demo accounts or are invented.

## Not here

The sketches and the judges' images, the runner-up's build (its notes are in the board's notes), the build's scripts, and the screenshots taken while it was built. They stay in the estate build folder.
