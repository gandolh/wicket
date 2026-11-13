import type { AppCounts, QueueResponse, RecordView, RunningJob, WaitingJob } from "@wicket/shared";
import type { ReactNode } from "react";
import { FactGrid, FactTile } from "./components/Facts";
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
// OK and Cancelled stay regular; only a failure is loud.
const OUTCOME_CLASS: Record<RecordView["outcome"], string> = {
  ok: "text-ok",
  failed: "font-bold text-danger",
  cancelled: "text-ink-muted",
};

/** A duration as figures in the mono face and its units in the page's own face, muted: "1 min 05 s". */
function Dur({ ms, className }: { ms: number; className?: string }) {
  return (
    <>
      {duration(ms)
        .split(/(\d+)/)
        .filter((part) => part !== "")
        .map((part, index) =>
          /^\d+$/.test(part) ? (
            <span key={index} className={cn("font-mono font-medium", className)}>
              {part}
            </span>
          ) : (
            <span key={index} className="font-normal text-ink-muted">
              {part}
            </span>
          ),
        )}
    </>
  );
}

/** What stands where a record has no model or no run time: the call never started. */
function NotStarted() {
  return <span className="font-sans font-normal text-ink-muted">not started</span>;
}

/** Waiting's numeral and Running's facts, in one card: the live state of the queue. */
export function LiveCard({ children }: { children: ReactNode }) {
  return (
    <section
      className="rounded-card border border-line-strong bg-surface px-5 pt-4 pb-5 shadow-card max-[560px]:px-4 max-[560px]:pt-3 max-[560px]:pb-4"
      aria-labelledby="now-serving-title"
    >
      {children}
    </section>
  );
}

/** The big number: which ticket the counter is on, and how many wait. */
export function NowServing({ queue }: { queue: QueueResponse }) {
  const waiting = queue.waiting.length;
  return (
    <div>
      <h2 id="now-serving-title" className="font-medium text-ink-muted">
        Now serving
      </h2>
      <p className="flex items-baseline gap-3.5 max-[560px]:gap-3">
        {queue.nowServing === 0 ? (
          <span className="text-title">None yet</span>
        ) : (
          <span className="font-mono text-ticket leading-ticket font-bold tracking-[-0.02em] max-[560px]:text-ticket-phone max-[560px]:leading-ticket-phone">
            {queue.nowServing}
          </span>
        )}
        <span className="text-heading font-normal text-ink-muted">
          {waiting === 0 ? "Nobody waiting" : `${waiting} waiting`}
        </span>
      </p>
    </div>
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
    <div className="mt-2 border-t border-line pt-4 max-[560px]:pt-2.5">
      <h3 className="text-heading">Running</h3>
      {running ? (
        <>
          <FactGrid>
            <FactTile term="Ticket" mono>
              {running.ticket}
            </FactTile>
            <FactTile term="App">{running.app}</FactTile>
            <FactTile term="Elapsed">
              <Dur ms={serverNow - running.startedAt} className="font-bold" />
            </FactTile>
            <FactTile term="Model" mono={running.model !== null}>
              {running.model ?? <span className="font-normal text-ink-muted">Not chosen yet</span>}
            </FactTile>
          </FactGrid>
          {action}
        </>
      ) : (
        <p className="mt-1 text-ink-muted">Nothing running.</p>
      )}
    </div>
  );
}

/** The waiting tickets, oldest first, as the queue holds them. The body scrolls inside its card when it is long. */
export function WaitingTable({ waiting, serverNow }: { waiting: WaitingJob[]; serverNow: number }) {
  if (waiting.length === 0) return <EmptyRow>Nobody waiting.</EmptyRow>;
  return (
    <Table className="max-h-88.25 min-h-38.25 flex-1 overflow-y-auto scroll-edge focus-visible:outline-offset-[-2px]">
      <thead>
        <tr>
          <Th>Ticket</Th>
          <Th>App</Th>
          <Th right>Waited</Th>
        </tr>
      </thead>
      <tbody>
        {waiting.map((job, index) => (
          <tr key={job.id}>
            <Td mono>
              {job.ticket}
              {index === 0 && (
                <span className="ml-2 inline-block rounded-pill bg-accent-soft px-2 font-sans text-small leading-5 font-bold text-accent">
                  next
                </span>
              )}
            </Td>
            <Td>{job.app}</Td>
            <Td right>
              <Dur ms={serverNow - job.queuedAt} />
            </Td>
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
          <Th right>Calls</Th>
          <Th right>OK</Th>
          <Th right>Failed</Th>
          <Th right>Cancelled</Th>
        </tr>
      </thead>
      <tbody>
        {counts.map((row) => (
          <tr key={row.app}>
            <Td>{row.app}</Td>
            <Td right mono>
              {row.total}
            </Td>
            <Td right mono>
              {row.ok}
            </Td>
            <Td right mono className={row.failed > 0 ? "font-bold text-danger" : undefined}>
              {row.failed}
            </Td>
            <Td right mono>
              {row.cancelled}
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

/**
 * The newest calls first. Names and numbers only: Wicket keeps no text. By the width of its own card: a table from
 * 620 px, list rows below (two lines from 480 px).
 */
export function RecordsTable({ records, now }: { records: RecordView[]; now: number }) {
  if (records.length === 0) return <EmptyRow>No calls yet.</EmptyRow>;
  return (
    <div className="@container">
      <Table className="hidden @min-[620px]:block @max-[675px]:[&_td]:px-3 @max-[675px]:[&_th]:px-3">
        <thead>
          <tr>
            <Th>Finished</Th>
            <Th>App</Th>
            <Th>Ticket</Th>
            <Th>Model</Th>
            <Th right>Waited</Th>
            <Th right>Ran</Th>
            <Th>Outcome</Th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id}>
              <Td mono>{when(record.finishedAt, now)}</Td>
              <Td>{record.app}</Td>
              <Td mono>{record.ticket}</Td>
              <Td mono={record.model !== null}>{record.model ?? <NotStarted />}</Td>
              <Td right>
                <Dur ms={record.waitMs} />
              </Td>
              <Td right>{record.runMs === null ? <NotStarted /> : <Dur ms={record.runMs} />}</Td>
              <Td>
                <span className={OUTCOME_CLASS[record.outcome]}>{OUTCOME_LABEL[record.outcome]}</span>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <ul className="m-0 list-none p-0 @min-[620px]:hidden">
        {records.map((record) => (
          <li
            key={record.id}
            className="grid gap-0.5 border-b border-line px-4 py-3 last:border-b-0 max-[560px]:px-3 @min-[480px]:flex @min-[480px]:flex-wrap @min-[480px]:gap-x-6"
          >
            <div className="flex justify-between gap-3 text-heading font-medium @min-[480px]:basis-full">
              <span>{record.app}</span>
              <span className={OUTCOME_CLASS[record.outcome]}>{OUTCOME_LABEL[record.outcome]}</span>
            </div>
            <div className="flex flex-wrap gap-x-4 text-ink-muted">
              <span className="font-mono font-medium">{record.ticket}</span>
              {record.model === null ? <NotStarted /> : <span className="font-mono font-medium">{record.model}</span>}
            </div>
            <div className="flex flex-wrap gap-x-4 text-ink-muted">
              <span>
                Finished <span className="font-mono font-medium text-ink">{when(record.finishedAt, now)}</span>
              </span>
              <span>
                Waited <Dur ms={record.waitMs} className="text-ink" />
              </span>
              <span>Ran {record.runMs === null ? <NotStarted /> : <Dur ms={record.runMs} className="text-ink" />}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
