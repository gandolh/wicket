import type { AppCounts, QueueResponse, RecordView, RunningJob, WaitingJob } from "@wicket/shared";
import type { ReactNode } from "react";
import { duration, when } from "./time";

/**
 * The queue page's pieces, drawn from props only: no fetching, no hooks with
 * effects, so the tests render them to markup. `serverNow` is the server's
 * clock as of now (its `serverTime` plus what passed since), so times waited
 * and elapsed don't depend on the browser's clock being right.
 */

const OUTCOME_LABEL: Record<RecordView["outcome"], string> = { ok: "OK", failed: "Failed", cancelled: "Cancelled" };

/** The big number: which ticket the counter is on. */
export function NowServing({ queue }: { queue: QueueResponse }) {
  const waiting = queue.waiting.length;
  return (
    <section className="card now-serving" aria-labelledby="now-serving-title">
      <h2 id="now-serving-title" className="card-title">
        Now serving
      </h2>
      <p className="ticket-number">{queue.nowServing === 0 ? "None yet" : queue.nowServing}</p>
      <p className="muted">{waiting === 0 ? "Nobody waiting" : `${waiting} waiting`}</p>
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
    <section className="card running" aria-labelledby="running-title">
      <div className="card-head">
        <h2 id="running-title" className="card-title">
          Running
        </h2>
        {running && action}
      </div>
      {running ? (
        <dl className="facts">
          <dt>Ticket</dt>
          <dd className="num">{running.ticket}</dd>
          <dt>App</dt>
          <dd>{running.app}</dd>
          <dt>Elapsed</dt>
          <dd className="num">{duration(serverNow - running.startedAt)}</dd>
          <dt>Model</dt>
          <dd>{running.model ?? "Not chosen yet"}</dd>
        </dl>
      ) : (
        <p className="muted">Nothing running.</p>
      )}
    </section>
  );
}

/** The waiting tickets, oldest first, as the queue holds them. */
export function WaitingTable({ waiting, serverNow }: { waiting: WaitingJob[]; serverNow: number }) {
  if (waiting.length === 0) return <p className="empty-row muted">Nobody waiting.</p>;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Ticket</th>
            <th scope="col">App</th>
            <th scope="col" className="num">
              Waited
            </th>
          </tr>
        </thead>
        <tbody>
          {waiting.map((job, index) => (
            <tr key={job.id}>
              <td className="num">
                {job.ticket}
                {index === 0 && <span className="next"> next</span>}
              </td>
              <td>{job.app}</td>
              <td className="num">{duration(serverNow - job.queuedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Calls per app over one window. */
export function CountsTable({ counts }: { counts: AppCounts[] }) {
  if (counts.length === 0) return <p className="empty-row muted">No calls in this period.</p>;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">App</th>
            <th scope="col" className="num">
              Calls
            </th>
            <th scope="col" className="num">
              OK
            </th>
            <th scope="col" className="num">
              Failed
            </th>
            <th scope="col" className="num">
              Cancelled
            </th>
          </tr>
        </thead>
        <tbody>
          {counts.map((row) => (
            <tr key={row.app}>
              <td>{row.app}</td>
              <td className="num">{row.total}</td>
              <td className="num">{row.ok}</td>
              <td className={`num${row.failed > 0 ? " has-failed" : ""}`}>{row.failed}</td>
              <td className="num">{row.cancelled}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The newest calls first. Names and numbers only: Wicket keeps no text. */
export function RecordsTable({ records, now }: { records: RecordView[]; now: number }) {
  if (records.length === 0) return <p className="empty-row muted">No calls yet.</p>;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Finished</th>
            <th scope="col">App</th>
            <th scope="col" className="num">
              Ticket
            </th>
            <th scope="col">Model</th>
            <th scope="col" className="num">
              Waited
            </th>
            <th scope="col" className="num">
              Ran
            </th>
            <th scope="col">Outcome</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id}>
              <td className="num">{when(record.finishedAt, now)}</td>
              <td>{record.app}</td>
              <td className="num">{record.ticket}</td>
              <td>{record.model ?? <span className="muted">None</span>}</td>
              <td className="num">{duration(record.waitMs)}</td>
              <td className="num">
                {record.runMs === null ? <span className="muted">None</span> : duration(record.runMs)}
              </td>
              <td>
                <span className={`outcome outcome-${record.outcome}`}>{OUTCOME_LABEL[record.outcome]}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
