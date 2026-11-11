import { jobParamsSchema, jobQuerySchema, jobRequestSchema, type JobView } from "@wicket/shared";
import type { FastifyPluginAsync, FastifyReply } from "fastify";
import { callerOf } from "../../plugins/app-tokens/index.js";
import { fail, parse } from "../../plugins/errors.js";
import { QueueClosedError, QueueFullError, type Queue } from "../queue/index.js";

/** What the job routes take from the app. */
export interface JobsOptions {
  queue: Queue;
}

const noSuchJob = (reply: FastifyReply) =>
  fail(reply, 404, { code: "not_found", message: "no such job for this app (a restart forgets every job)" });

/**
 * The apps' routes, behind their tokens (the app-tokens plugin): put a job in
 * the queue, read it (long-polled with `?wait=N`, N up to 25), and cancel it.
 * An app sees only its own jobs; another app's is a 404.
 */
export const jobRoutes: FastifyPluginAsync<JobsOptions> = async (app, { queue }) => {
  app.post("/v1/jobs", async (request, reply) => {
    const body = parse(jobRequestSchema, request.body, reply);
    if (!body) return reply;
    try {
      const view: JobView = queue.submit(callerOf(request), body);
      return reply.status(202).send(view);
    } catch (error) {
      if (error instanceof QueueFullError) {
        return fail(reply, 503, {
          code: "queue_full",
          message: `${error.limit} jobs are already waiting; try again later`,
        });
      }
      if (error instanceof QueueClosedError) {
        return fail(reply, 503, { code: "internal", message: "Wicket is restarting; try again in a moment" });
      }
      throw error;
    }
  });

  app.get("/v1/jobs/:id", async (request, reply) => {
    const params = parse(jobParamsSchema, request.params, reply);
    if (!params) return reply;
    const query = parse(jobQuerySchema, request.query, reply);
    if (!query) return reply;
    const caller = callerOf(request);
    let view: JobView | undefined;
    if (query.wait && query.wait > 0) {
      // A caller that hangs up ends its wait.
      const hungUp = new AbortController();
      const onClose = () => hungUp.abort();
      request.raw.once("close", onClose);
      try {
        view = await queue.waitForChange(params.id, caller, query.wait * 1000, hungUp.signal);
      } finally {
        request.raw.off("close", onClose);
      }
    } else {
      view = queue.get(params.id, caller);
    }
    return view ?? noSuchJob(reply);
  });

  app.delete("/v1/jobs/:id", async (request, reply) => {
    const params = parse(jobParamsSchema, request.params, reply);
    if (!params) return reply;
    return queue.cancel(params.id, callerOf(request)) ?? noSuchJob(reply);
  });
};
