import type { QueueResponse, RecordView } from "@wicket/shared";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CountsTable, NowServing, RecordsTable, RunningCard, WaitingTable } from "./QueueView";

/** The queue page's pieces as markup: no DOM needed to see what they say. */
const now = Date.UTC(2026, 10, 4, 12, 0, 0);
const queue: QueueResponse = {
  serverTime: now,
  nowServing: 41,
  running: { id: "a", app: "ro-housing", ticket: 41, model: "gpt-oss:120b", startedAt: now - 65_000 },
  waiting: [
    { id: "b", app: "just-a-bot", ticket: 42, queuedAt: now - 12_000 },
    { id: "c", app: "ro-housing", ticket: 43, queuedAt: now - 3_000 },
  ],
};

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

describe("the queue page", () => {
  it("shows now serving and how many wait", () => {
    const html = text(renderToStaticMarkup(<NowServing queue={queue} />));
    expect(html).toContain("Now serving 41 2 waiting");
    expect(text(renderToStaticMarkup(<NowServing queue={{ ...queue, nowServing: 0, waiting: [] }} />))).toContain(
      "None yet Nobody waiting",
    );
  });

  it("shows the running call with its app, ticket, elapsed time and model", () => {
    const html = text(
      renderToStaticMarkup(
        <RunningCard running={queue.running} serverNow={now} action={<button>Force close</button>} />,
      ),
    );
    expect(html).toContain("Force close");
    expect(html).toContain("Ticket 41 App ro-housing Elapsed 1 min 05 s Model gpt-oss:120b");
    expect(
      text(renderToStaticMarkup(<RunningCard running={null} serverNow={now} action={<button>Force close</button>} />)),
    ).toBe("Running Nothing running.");
  });

  it("lists the waiting tickets oldest first, with time waited", () => {
    const html = text(renderToStaticMarkup(<WaitingTable waiting={queue.waiting} serverNow={now} />));
    expect(html).toBe("Ticket App Waited 42 next just-a-bot 12 s 43 ro-housing 3 s");
    expect(text(renderToStaticMarkup(<WaitingTable waiting={[]} serverNow={now} />))).toBe("Nobody waiting.");
  });

  it("shows calls per app and recent records, with no text but names and numbers", () => {
    const counts = text(
      renderToStaticMarkup(<CountsTable counts={[{ app: "just-a-bot", total: 5, ok: 3, failed: 1, cancelled: 1 }]} />),
    );
    expect(counts).toContain("just-a-bot 5 3 1 1");
    const record: RecordView = {
      id: 1,
      app: "just-a-bot",
      ticket: 40,
      model: null,
      outcome: "cancelled",
      queuedAt: now - 5_000,
      startedAt: null,
      finishedAt: now - 1_000,
      waitMs: 4_000,
      runMs: null,
    };
    const records = text(renderToStaticMarkup(<RecordsTable records={[record]} now={now} />));
    expect(records).toContain("just-a-bot 40 None 4 s None Cancelled");
  });
});
