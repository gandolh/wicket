import type { AppCounts, QueueResponse, RecordView, RunningJob, WaitingJob } from "@wicket/shared";
import type { ReactNode } from "react";
import { Fact, Facts } from "./components/Facts";
import { EmptyRow, Table, Td, Th } from "./components/Table";
import { cn } from "./lib/cn";
import { duration, when } from "./time";

/**
 * The queue page's pieces, drawn from props only: no fetching, no hooks with
 * effects, so the tests render them to markup. `serverNow` is the server's
 * clock as of now (its `serverTime` plus what passed since), so times waited
 * and elapsed don't depend on the browser's clock being right.
 */

const OUTCOME_LABEL: Record<RecordView["outcome"], string> = { ok: "OK", failed: "Failed", cancelled: "Cancelled" };
const OUTCOME_CLASS: Record<RecordView["outcome"], string> = {
  ok: "text-ok",
  failed: "text-danger",
  cancelled: "text-ink-muted",
};

const CARD = "rounded-card bg-surface px-5 py-4 shadow-card";
const CARD_TITLE = "text-small font-title tracking-label text-ink-muted uppercase";

/** The big number: which ticket the counter is on. */
export function NowServing({ queue }: { queue: QueueResponse }) {
  const waiting = queue.waiting.length;
  return (
    <section className={cn(CARD, "flex flex-col gap-1")} aria-labelledby="now-serving-title">
      <h2 id="now-serving-title" className={CARD_TITLE}>
        Now serving
      </h2>
      <p className="text-ticket leading-ticket font-bold tabular-nums max-sm:text-ticket-phone">
        {queue.nowServing === 0 ? "None yet" : queue.nowServing}
      </p>
      <p className="text-ink-muted">{waiting === 0 ? "Nobody waiting" : `${waiting} waiting`}</p>
    </section>
  );
}

/** The running call, with its force-close button passed in as `action`. */
export function RunningCard({
  running,
  serverNow,
  action,
}: {
  running: RunningJob | null;
  serverNow: number;
  action?: ReactNode;
}) {
  return (
    <section className={CARD} aria-labelledby="running-title">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="running-title" className={CARD_TITLE}>
          Running
        </h2>
        {running && action}
      </div>
      {running ? (
        <Facts>
          <Fact term="Ticket" numeric>
            {running.ticket}
          </Fact>
          <Fact term="App">{running.app}</Fact>
          <Fact term="Elapsed" numeric>
            {duration(serverNow - running.startedAt)}
          </Fact>
          <Fact term="Model">{running.model ?? "Not chosen yet"}</Fact>
        </Facts>
      ) : (
        <p className="text-ink-muted">Nothing running.</p>
      )}
    </section>
  );
}

/** The waiting tickets, oldest first, as the queue holds them. */
export function WaitingTable({ waiting, serverNow }: { waiting: WaitingJob[]; serverNow: number }) {
  if (waiting.length === 0) return <EmptyRow>Nobody waiting.</EmptyRow>;
  return (
    <Table>
      <thead>
        <tr>
          <Th>Ticket</Th>
          <Th>App</Th>
          <Th numeric>Waited</Th>
        </tr>
      </thead>
      <tbody>
        {waiting.map((job, index) => (
          <tr key={job.id}>
            <Td numeric>
              {job.ticket}
              {index === 0 && <span className="ml-1.5 text-small font-semibold text-accent"> next</span>}
            </Td>
            <Td>{job.app}</Td>
            <Td numeric>{duration(serverNow - job.queuedAt)}</Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

/** Calls per app over one window. */
export function CountsTable({ counts }: { counts: AppCounts[] }) {
  if (counts.length === 0) return <EmptyRow>No calls in this period.</EmptyRow>;
  return (
    <Table>
      <thead>
        <tr>
          <Th>App</Th>
          <Th numeric>Calls</Th>
          <Th numeric>OK</Th>
          <Th numeric>Failed</Th>
          <Th numeric>Cancelled</Th>
        </tr>
      </thead>
      <tbody>
        {counts.map((row) => (
          <tr key={row.app}>
            <Td>{row.app}</Td>
            <Td numeric>{row.total}</Td>
            <Td numeric>{row.ok}</Td>
            <Td numeric className={row.failed > 0 ? "font-semibold text-danger" : undefined}>
              {row.failed}
            </Td>
            <Td numeric>{row.cancelled}</Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

/** The newest calls first. Names and numbers only: Wicket keeps no text. */
export function RecordsTable({ records, now }: { records: RecordView[]; now: number }) {
  if (records.length === 0) return <EmptyRow>No calls yet.</EmptyRow>;
  return (
    <Table>
      <thead>
        <tr>
          <Th>Finished</Th>
          <Th>App</Th>
          <Th numeric>Ticket</Th>
          <Th>Model</Th>
          <Th numeric>Waited</Th>
          <Th numeric>Ran</Th>
          <Th>Outcome</Th>
        </tr>
      </thead>
      <tbody>
        {records.map((record) => (
          <tr key={record.id}>
            <Td numeric>{when(record.finishedAt, now)}</Td>
            <Td>{record.app}</Td>
            <Td numeric>{record.ticket}</Td>
            <Td>{record.model ?? <span className="text-ink-muted">None</span>}</Td>
            <Td numeric>{duration(record.waitMs)}</Td>
            <Td numeric>
              {record.runMs === null ? <span className="text-ink-muted">None</span> : duration(record.runMs)}
            </Td>
            <Td>
              <span className={cn("font-semibold", OUTCOME_CLASS[record.outcome])}>
                {OUTCOME_LABEL[record.outcome]}
              </span>
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
