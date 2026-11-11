import { MAX_RECORDS, recordsQuerySchema, type RecordsResponse } from "@wicket/shared";
import type { FastifyPluginAsync } from "fastify";
import { parse } from "../../plugins/errors.js";
import type { Records } from "./store.js";

/** What the records route takes from the app. */
export interface RecordsRoutesOptions {
  records: Pick<Records, "recent" | "countsSince">;
  /** The clock, in epoch milliseconds: the day and week counts end now. */
  now: () => number;
}

/** How many records the page gets when it doesn't say. */
const DEFAULT_RECORDS = 50;

const DAY_MS = 24 * 60 * 60 * 1000;

/** `GET /v1/records`, behind a signed-in session: the newest records, and the counts per app over a day and a week. */
export const recordRoutes: FastifyPluginAsync<RecordsRoutesOptions> = async (app, { records, now }) => {
  app.get("/v1/records", async (request, reply) => {
    const query = parse(recordsQuerySchema, request.query, reply);
    if (!query) return reply;
    const at = now();
    const body: RecordsResponse = {
      records: records.recent(Math.min(query.limit ?? DEFAULT_RECORDS, MAX_RECORDS)),
      counts: { day: records.countsSince(at - DAY_MS), week: records.countsSince(at - 7 * DAY_MS) },
    };
    return body;
  });
};
