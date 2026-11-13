import { useEffect, useState } from "react";
import { useSession } from "../vendor/ward/ward-auth-react.js";
import { clearQueue, fetchQueue, fetchRecords, forceClose } from "./api";
import { ConfirmDialog } from "./components/ui/ConfirmDialog";
import { buttonClass } from "./components/ui/buttonClass";
import { RadioGroup } from "./components/ui/RadioGroup";
import { Card } from "./components/Card";
import { EmptyRow } from "./components/Table";
import { cn } from "./lib/cn";
import { CountsTable, LiveCard, NowServing, RecordsTable, RunningCard, WaitingTable } from "./QueueView";
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
      <header className="sticky top-0 z-bar border-b border-line bg-surface shadow-card">
        <div className="mx-auto flex h-top max-w-page items-center justify-between gap-4 px-6 ">
          <h1 className="text-title tracking-tight">Wicket</h1>
          <div className="flex items-center gap-5 whitespace-nowrap text-ink-muted max-[560px]:gap-3 max-[560px]:text-[13px] max-[560px]:leading-[18px]">
            <span>
              {queue.fetchedAt ? (
                <>
                  Updated <span className="font-mono font-medium">{clock(queue.fetchedAt)}</span>
                </>
              ) : (
                "Loading…"
              )}
            </span>
            <AccountLink />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-page items-start gap-2 px-6 pt-2 pb-12 min-[840px]:grid-cols-[360px_minmax(0,1fr)] min-[840px]:gap-6 min-[840px]:pt-6 min-[1200px]:grid-cols-[var(--container-live)_minmax(0,1fr)]">
        {notice && (
          <p
            className={cn(
              "col-span-full rounded-control px-3 py-2",
              notice.error ? "bg-danger-wash text-danger" : "bg-ok-wash",
            )}
            role={notice.error ? "alert" : "status"}
          >
            {notice.text}{" "}
            <button type="button" className={buttonClass("link")} onClick={() => setNotice(null)}>
              Dismiss
            </button>
          </p>
        )}

        <div className="flex min-w-0 flex-col gap-2 min-[840px]:sticky min-[840px]:top-[calc(var(--height-top)+1.5rem)] min-[840px]:max-h-[calc(100dvh-var(--height-top)-3rem)] min-[840px]:gap-4 [@media(max-height:640px)]:static [@media(max-height:640px)]:max-h-none">
          {queue.failing && (
            <div
              className="flex items-start gap-3 rounded-card border border-line-strong bg-banner-bg px-4 py-3.5 font-medium text-banner-text shadow-card max-[560px]:text-[16px] max-[560px]:leading-6"
              role="status"
            >
              <svg
                className="mt-0.5 flex-none"
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="8.5" />
                <path d="M12 7.5v5M12 16v.5" />
              </svg>
              <p>
                Wicket's API isn't answering.
                {queue.fetchedAt ? ` Showing what it said at ${clock(queue.fetchedAt)}.` : ""} Trying again every few
                seconds.
              </p>
            </div>
          )}

          {data ? (
            <>
              <LiveCard>
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
                        triggerVariant="danger-tint"
                        triggerClassName="mt-4 w-full max-[560px]:mt-3 max-[560px]:min-h-12 max-[560px]:text-heading"
                        title={`Force close ticket ${running.ticket}?`}
                        description={
                          <p className="mb-2">
                            Wicket aborts {running.app}'s call
                            {running.model && (
                              <>
                                {" "}
                                to <span className="font-mono font-medium">{running.model}</span>
                              </>
                            )}
                            . {running.app} sees the ticket as cancelled, and the next ticket starts.
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
              </LiveCard>

              <Card
                className="flex min-h-0 flex-col"
                titleId="waiting-title"
                title={
                  <>
                    Waiting
                    {waiting > 0 && (
                      <span className="inline-flex h-5 min-w-6 items-center justify-center rounded-pill bg-accent-soft px-1.75 font-mono text-small font-bold">
                        {waiting}
                      </span>
                    )}
                  </>
                }
                action={
                  <ConfirmDialog
                    label="Clear queue"
                    danger
                    triggerClassName="min-h-9 max-[560px]:min-h-11"
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
                }
              >
                <WaitingTable waiting={data.waiting} serverNow={serverNow} />
              </Card>
            </>
          ) : (
            !queue.failing && (
              <p className="rounded-card border border-line-strong bg-surface px-5 py-12 text-center text-ink-muted shadow-card">
                Loading the queue…
              </p>
            )
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-2 min-[840px]:gap-6">
          <Card
            titleId="calls-title"
            title="Calls per app"
            action={
              <RadioGroup label="Period" look="segmented" options={PERIODS} value={period} onValueChange={setPeriod} />
            }
          >
            {records.data ? <CountsTable counts={records.data.counts[period]} /> : <EmptyRow>Loading…</EmptyRow>}
          </Card>

          <Card
            titleId="recent-title"
            title="Recent calls"
            note="Counts and timings only. Wicket keeps no prompt or answer."
          >
            {records.data ? <RecordsTable records={records.data.records} now={now} /> : <EmptyRow>Loading…</EmptyRow>}
          </Card>
        </div>
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
      className="inline-flex min-h-11 items-center font-bold text-accent no-underline hover:underline max-[560px]:min-w-11 max-[560px]:justify-end"
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
