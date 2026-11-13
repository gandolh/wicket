import type { Page } from "@playwright/test";

/**
 * The page's stand-in backend: the session, the queue and the records, answered from fixtures, and a frozen clock,
 * so every run draws the same screen. No Wicket and no Ward run. The times are UTC, with the browser pinned to
 * en-US and UTC in the config, so "10:28 AM" reads the same everywhere.
 */

/** The server's clock, and the browser's, for every screen: 10:30:02. */
export const NOW = Date.UTC(2026, 10, 13, 10, 30, 2);

export type QueueState = "busy" | "idle" | "twelve" | "down";
export type SessionState = "signed-in" | "signed-out" | "ended" | "unreachable";

const APPS = ["just-a-bot", "almanac", "postern", "shelfmark", "lantern"] as const;
const MODELS = ["gpt-oss:120b", "gpt-oss:20b", "qwen3-coder:480b"] as const;

const WAITED = [11, 6, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2];

function waiting(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `w${index}`,
    app: APPS[index % APPS.length],
    ticket: 1044 + index,
    queuedAt: NOW - (WAITED[index] ?? 1) * 1000,
  }));
}

function queueBody(state: QueueState) {
  const idle = state === "idle";
  const count = state === "twelve" ? 12 : idle ? 0 : 3;
  return {
    serverTime: NOW,
    nowServing: idle ? 0 : 1043,
    running: idle ? null : { id: "r", app: "shelfmark", ticket: 1043, model: MODELS[0], startedAt: NOW - 14_000 },
    waiting: waiting(count).slice(0, count),
  };
}

type Outcome = "ok" | "failed" | "cancelled";

/** [minutes before 10:30, app, model, waited s, ran s, outcome]: a failed call never reached a model. */
const ROWS: [number, string, string | null, number, number | null, Outcome][] = [
  [2, "shelfmark", MODELS[0], 0, 2, "ok"],
  [9, "just-a-bot", MODELS[1], 1, 3, "ok"],
  [16, "almanac", MODELS[2], 2, 4, "ok"],
  [23, "postern", null, 2, null, "failed"],
  [30, "lantern", MODELS[1], 3, 7, "ok"],
  [37, "shelfmark", MODELS[2], 3, 9, "cancelled"],
  [44, "just-a-bot", MODELS[0], 4, 9, "ok"],
  [51, "almanac", MODELS[1], 0, 11, "ok"],
];

function recordsBody() {
  const records = ROWS.map(([minutes, app, model, waited, ran, outcome], index) => ({
    id: 100 - index,
    app,
    ticket: 1042 - index,
    model,
    outcome,
    queuedAt: NOW - minutes * 60_000 - (waited + (ran ?? 0)) * 1000,
    startedAt: ran === null ? null : NOW - minutes * 60_000 - ran * 1000,
    finishedAt: NOW - minutes * 60_000,
    waitMs: waited * 1000,
    runMs: ran === null ? null : ran * 1000,
  }));
  const day = [
    { app: "shelfmark", total: 31, ok: 28, failed: 2, cancelled: 1 },
    { app: "just-a-bot", total: 22, ok: 21, failed: 1, cancelled: 0 },
    { app: "almanac", total: 9, ok: 9, failed: 0, cancelled: 0 },
    { app: "postern", total: 6, ok: 5, failed: 0, cancelled: 1 },
    { app: "lantern", total: 4, ok: 4, failed: 0, cancelled: 0 },
  ];
  const week = day.map((row) => ({ ...row, total: row.total * 3, ok: row.ok * 3 }));
  return { records, counts: { day, week } };
}

function sessionBody(state: SessionState) {
  if (state === "signed-in")
    return {
      user: { id: 1, username: "demo" },
      session: { origin: "password" },
      ward: { enabled: true, linked: false },
    };
  return {
    user: null,
    session: null,
    ward: { enabled: true, linked: false },
    ...(state === "ended" ? { reason: "ward_session_ended" } : {}),
  };
}

/** Routes the page's requests to the fixtures and freezes the clock. Call before `page.goto`. */
export async function stubApi(page: Page, queue: QueueState = "busy", session: SessionState = "signed-in") {
  await page.clock.install({ time: NOW });
  await page.clock.setFixedTime(NOW);
  await page.route("**/wicket-api/auth/session", (route) =>
    session === "unreachable" ? route.abort() : route.fulfill({ json: sessionBody(session) }),
  );
  await page.route("**/wicket-api/v1/queue", (route) =>
    queue === "down" ? route.abort() : route.fulfill({ json: queueBody(queue) }),
  );
  await page.route("**/wicket-api/v1/records*", (route) => route.fulfill({ json: recordsBody() }));
  await page.route("**/wicket-api/v1/queue/running/cancel", (route) => route.fulfill({ json: { closed: true } }));
  await page.route("**/wicket-api/v1/queue/clear", (route) => route.fulfill({ json: { cleared: 3 } }));
}
