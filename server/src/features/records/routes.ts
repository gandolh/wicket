import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import { MAX_RECORDS, recordsQuerySchema, recordsResponseSchema } from "@wicket/shared";
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

/**
 * `GET /v1/records`, behind a signed-in session: the newest records, and the
 * counts per app over a day and a week. The response schema sends only the
 * contract's fields, so a column added to the table never reaches the page.
 */
export const recordRoutes: FastifyPluginAsyncZod<RecordsRoutesOptions> = async (app, { records, now }) => {
  const schema = { querystring: recordsQuerySchema, response: { 200: recordsResponseSchema } };
  app.get("/v1/records", { schema }, async (request) => {
    const at = now();
    return {
      records: records.recent(Math.min(request.query.limit ?? DEFAULT_RECORDS, MAX_RECORDS)),
      counts: { day: records.countsSince(at - DAY_MS), week: records.countsSince(at - 7 * DAY_MS) },
    };
  });
};
