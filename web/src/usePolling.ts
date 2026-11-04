import { useCallback, useEffect, useRef, useState } from "react";

export interface Polled<T> {
  /** The last good answer, kept on screen while the API is unreachable. */
  data: T | null;
  /** When `data` arrived. */
  fetchedAt: Date | null;
  /** The last attempt failed. */
  failing: boolean;
  /** Ask again now, e.g. right after a button changed the queue. */
  refresh: () => void;
}

/**
 * Fetch now and every `everyMs`, paused while the tab is hidden and caught up
 * as soon as it is shown again. A failure keeps the last data and sets
 * `failing`; the next success clears it. A refused session (`Unauthorized`)
 * doesn't count as a failure. `load` must be stable (a module function, or
 * memoised), or the polling restarts on every render.
 */
export function usePolling<T>(load: (signal: AbortSignal) => Promise<T>, everyMs: number): Polled<T> {
  const [state, setState] = useState<Omit<Polled<T>, "refresh">>({ data: null, fetchedAt: null, failing: false });
  const tickRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    let stopped = false;

    const tick = async () => {
      clearTimeout(timer);
      if (document.hidden) return; // resumed by visibilitychange
      controller?.abort();
      controller = new AbortController();
      try {
        const data = await load(controller.signal);
        if (!stopped) setState({ data, fetchedAt: new Date(), failing: false });
      } catch (err) {
        // A 401 is no outage: the gate is taking the page to the login screen (api.ts, auth.ts).
        const name = (err as Error).name;
        if (!stopped && name !== "AbortError" && name !== "Unauthorized") setState((s) => ({ ...s, failing: true }));
      }
      if (!stopped && !document.hidden) timer = setTimeout(tick, everyMs);
    };
    tickRef.current = () => void tick();

    const onVisibility = () => {
      if (!document.hidden) void tick();
      else clearTimeout(timer);
    };
    document.addEventListener("visibilitychange", onVisibility);
    void tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load, everyMs]);

  const refresh = useCallback(() => tickRef.current(), []);
  return { ...state, refresh };
}

/** The current time, updated every `everyMs`, for elapsed times that tick. */
export function useNow(everyMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(timer);
  }, [everyMs]);
  return now;
}
