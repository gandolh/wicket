import { useEffect, useState } from "react";
import { useSession } from "../vendor/ward/ward-auth-react.js";
import { clearQueue, fetchQueue, fetchRecords, forceClose } from "./api";
import { ConfirmDialog } from "./components/ui/ConfirmDialog";
import { buttonClass } from "./components/ui/buttonClass";
import { RadioGroup } from "./components/ui/RadioGroup";
import { EmptyRow } from "./components/Table";
import { cn } from "./lib/cn";
import { CountsTable, NowServing, RecordsTable, RunningCard, WaitingTable } from "./QueueView";
import { navigate, pathOf } from "./route";
import { clock } from "./time";
import { useNow, usePolling } from "./usePolling";

/** How often the page asks: the queue moves fast, the records slowly. */
const QUEUE_MS = 2_000;
const RECORDS_MS = 10_000;

type Period = "day" | "week";

const PERIODS = [
  { value: "day", label: "Last 24 hours" },
  { value: "week", label: "Last 7 days" },
] as const;

/**
 * The queue page: now serving, the running call with Force close, the waiting
 * tickets with Clear queue, and the recent calls. Plain sections and tables,
 * the way any admin page looks.
 */
export function QueuePage() {
  const queue = usePolling(fetchQueue, QUEUE_MS);
  const records = usePolling(fetchRecords, RECORDS_MS);
  const now = useNow();
  const [period, setPeriod] = useState<Period>("day");
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);

  const data = queue.data;
  // The server's clock now: its time at the answer, plus what passed here since.
  const serverNow = data && queue.fetchedAt ? data.serverTime + (now - queue.fetchedAt.getTime()) : now;
  const waiting = data?.waiting.length ?? 0;

  useEffect(() => {
    document.title = waiting > 0 ? `(${waiting} waiting) Wicket` : "Wicket";
  }, [waiting]);

  const act = async (action: () => Promise<string>) => {
    try {
      setNotice({ text: await action(), error: false });
    } catch (error) {
      // A 401 is the gate's to handle; anything else is said here.
      if ((error as Error).name !== "Unauthorized")
        setNotice({ text: "That didn't work. Wicket may be down; try again.", error: true });
    }
    queue.refresh();
    records.refresh();
  };

  const running = data?.running ?? null;

  return (
    <div>
      <header className="sticky top-0 z-bar flex min-h-top flex-wrap items-center gap-x-5 gap-y-2 border-b border-line bg-surface px-6 py-2.5 max-sm:px-4">
        <h1 className="mr-2 text-title font-title">Wicket</h1>
        <span className="ml-auto text-ink-muted tabular-nums">
          {queue.fetchedAt ? `Updated ${clock(queue.fetchedAt)}` : "Loading…"}
        </span>
        <AccountLink />
      </header>

      {queue.failing && (
        <div className="mx-6 mt-3 rounded-control bg-banner-bg px-3 py-2 text-banner-text max-sm:mx-4" role="status">
          Wicket's API isn't answering.{queue.fetchedAt ? ` Showing what it said at ${clock(queue.fetchedAt)}.` : ""}{" "}
          Trying again every few seconds.
        </div>
      )}

      <main className="mx-auto max-w-page px-6 pt-4 pb-12 max-sm:px-4 max-sm:pt-3 max-sm:pb-10">
        {notice && (
          <p
            className={cn("mb-4 rounded-control px-3 py-2", notice.error ? "bg-danger-wash text-danger" : "bg-ok-wash")}
            role={notice.error ? "alert" : "status"}
          >
            {notice.text}{" "}
            <button type="button" className={buttonClass("link")} onClick={() => setNotice(null)}>
              Dismiss
            </button>
          </p>
        )}

        {data ? (
          <>
            <div className="grid grid-cols-[minmax(200px,1fr)_minmax(0,2fr)] gap-4 max-sm:grid-cols-1">
              <NowServing queue={data} />
              <RunningCard
                running={running}
                serverNow={serverNow}
                action={
                  running && (
                    <ConfirmDialog
                      key={running.id}
                      label="Force close"
                      danger
                      title={`Force close ticket ${running.ticket}?`}
                      description={
                        <p className="mb-2">
                          Wicket aborts {running.app}'s call{running.model ? ` to ${running.model}` : ""}. {running.app}{" "}
                          sees the ticket as cancelled, and the next ticket starts.
                        </p>
                      }
                      confirmLabel="Force close"
                      run={() =>
                        act(async () => {
                          const { closed } = await forceClose();
                          return closed ? `Force closed ticket ${running.ticket}.` : "Nothing was running by then.";
                        })
                      }
                    />
                  )
                }
              />
            </div>

            <section className="mt-7" aria-labelledby="waiting-title">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <h2 id="waiting-title" className="text-heading font-bold">
                  Waiting{" "}
                  {waiting > 0 && (
                    <span className="ml-1.5 rounded-pill bg-surface-sunk px-1.75 align-[2px] text-small text-ink-muted tabular-nums">
                      {waiting}
                    </span>
                  )}
                </h2>
                <ConfirmDialog
                  label="Clear queue"
                  danger
                  title="Clear the queue?"
                  description={
                    <>
                      <p className="mb-2">
                        {waiting === 0
                          ? "Nobody is waiting right now; clearing drops any ticket that joins before you confirm."
                          : waiting === 1
                            ? "The waiting ticket is dropped, and its app sees it as cancelled."
                            : `The ${waiting} waiting tickets are dropped, and their apps see them as cancelled.`}
                      </p>
                      <p className="mb-2">The running call goes on. Use Force close for that.</p>
                    </>
                  }
                  confirmLabel="Clear queue"
                  run={() =>
                    act(async () => {
                      const { cleared } = await clearQueue();
                      return cleared === 0
                        ? "Nobody was waiting."
                        : `Cleared ${cleared} waiting ${cleared === 1 ? "ticket" : "tickets"}.`;
                    })
                  }
                />
              </div>
              <WaitingTable waiting={data.waiting} serverNow={serverNow} />
            </section>
          </>
        ) : (
          !queue.failing && <p className="my-3.5 py-12 text-center text-ink-muted">Loading the queue…</p>
        )}

        <section className="mt-7" aria-labelledby="calls-title">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <h2 id="calls-title" className="text-heading font-bold">
              Calls per app
            </h2>
            <RadioGroup label="Period" look="segmented" options={PERIODS} value={period} onValueChange={setPeriod} />
          </div>
          {records.data ? <CountsTable counts={records.data.counts[period]} /> : <EmptyRow>Loading…</EmptyRow>}
        </section>

        <section className="mt-7" aria-labelledby="recent-title">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <h2 id="recent-title" className="text-heading font-bold">
              Recent calls
            </h2>
            <span className="text-small text-ink-muted">
              Counts and timings only. Wicket keeps no prompt or answer.
            </span>
          </div>
          {records.data ? <RecordsTable records={records.data.records} now={now} /> : <EmptyRow>Loading…</EmptyRow>}
        </section>
      </main>
    </div>
  );
}

/** The signed-in user's name in the header, leading to the account page. */
function AccountLink() {
  const session = useSession();
  const name = session.status === "signed_in" ? session.user.username : "Account";
  return (
    <a
      className="font-semibold text-accent no-underline hover:underline"
      href={pathOf("account")}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        navigate("account");
      }}
    >
      {name}
    </a>
  );
}
