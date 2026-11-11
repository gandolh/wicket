import { useEffect, useState } from "react";
import { useSession } from "../vendor/ward/ward-auth-react.js";
import { clearQueue, fetchQueue, fetchRecords, forceClose } from "./api";
import { ConfirmDialog } from "./components/ui/ConfirmDialog";
import { RadioGroup } from "./components/ui/RadioGroup";
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
    <div className="app">
      <header className="top">
        <h1 className="brand">Wicket</h1>
        <span className="updated">{queue.fetchedAt ? `Updated ${clock(queue.fetchedAt)}` : "Loading…"}</span>
        <AccountLink />
      </header>

      {queue.failing && (
        <div className="banner" role="status">
          Wicket's API isn't answering.{queue.fetchedAt ? ` Showing what it said at ${clock(queue.fetchedAt)}.` : ""}{" "}
          Trying again every few seconds.
        </div>
      )}

      <main>
        {notice && (
          <p className={notice.error ? "notice notice-error" : "notice"} role={notice.error ? "alert" : "status"}>
            {notice.text}{" "}
            <button type="button" className="link-button" onClick={() => setNotice(null)}>
              Dismiss
            </button>
          </p>
        )}

        {data ? (
          <>
            <div className="summary">
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
                        <p>
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

            <section className="section" aria-labelledby="waiting-title">
              <div className="section-head">
                <h2 id="waiting-title">Waiting {waiting > 0 && <span className="count">{waiting}</span>}</h2>
                <ConfirmDialog
                  label="Clear queue"
                  danger
                  title="Clear the queue?"
                  description={
                    <>
                      <p>
                        {waiting === 0
                          ? "Nobody is waiting right now; clearing drops any ticket that joins before you confirm."
                          : waiting === 1
                            ? "The waiting ticket is dropped, and its app sees it as cancelled."
                            : `The ${waiting} waiting tickets are dropped, and their apps see them as cancelled.`}
                      </p>
                      <p>The running call goes on. Use Force close for that.</p>
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
          !queue.failing && <p className="empty muted">Loading the queue…</p>
        )}

        <section className="section" aria-labelledby="calls-title">
          <div className="section-head">
            <h2 id="calls-title">Calls per app</h2>
            <RadioGroup label="Period" look="segmented" options={PERIODS} value={period} onValueChange={setPeriod} />
          </div>
          {records.data ? (
            <CountsTable counts={records.data.counts[period]} />
          ) : (
            <p className="empty-row muted">Loading…</p>
          )}
        </section>

        <section className="section" aria-labelledby="recent-title">
          <div className="section-head">
            <h2 id="recent-title">Recent calls</h2>
            <span className="muted small">Counts and timings only. Wicket keeps no prompt or answer.</span>
          </div>
          {records.data ? (
            <RecordsTable records={records.data.records} now={now} />
          ) : (
            <p className="empty-row muted">Loading…</p>
          )}
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
      className="account-link"
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
