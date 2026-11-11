import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import {
  errorBodySchema,
  jobParamsSchema,
  jobQuerySchema,
  jobRequestSchema,
  jobViewSchema,
  type JobView,
} from "@wicket/shared";
import type { FastifyReply } from "fastify";
import { callerOf } from "../../plugins/app-tokens/index.js";
import { fail } from "../../plugins/errors.js";
import { QueueClosedError, QueueFullError, type Queue } from "../queue/index.js";

/** What the job routes take from the app. */
export interface JobsOptions {
  queue: Queue;
}

const noSuchJob = (reply: FastifyReply) =>
  fail(reply, 404, { code: "not_found", message: "no such job for this app (a restart forgets every job)" });

const postSchema = { body: jobRequestSchema, response: { 202: jobViewSchema, 503: errorBodySchema } };
const getSchema = {
  params: jobParamsSchema,
  querystring: jobQuerySchema,
  response: { 200: jobViewSchema, 404: errorBodySchema },
};
const deleteSchema = { params: jobParamsSchema, response: { 200: jobViewSchema, 404: errorBodySchema } };

/**
 * The apps' routes, behind their tokens (the app-tokens plugin): put a job in
 * the queue, read it (long-polled with `?wait=N`, N up to 25), and cancel it.
 * An app sees only its own jobs; another app's is a 404. No route declares a
 * schema for the 401 the token guard answers before the route runs.
 */
export const jobRoutes: FastifyPluginAsyncZod<JobsOptions> = async (app, { queue }) => {
  app.post("/v1/jobs", { schema: postSchema }, async (request, reply) => {
    try {
      const view = queue.submit(callerOf(request), request.body);
      return reply.code(202).send(view);
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

  app.get("/v1/jobs/:id", { schema: getSchema }, async (request, reply) => {
    const { id } = request.params;
    const { wait } = request.query;
    const caller = callerOf(request);
    let view: JobView | undefined;
    if (wait && wait > 0) {
      // A caller that hangs up ends its wait.
      const hungUp = new AbortController();
      const onClose = () => hungUp.abort();
      request.raw.once("close", onClose);
      try {
        view = await queue.waitForChange(id, caller, wait * 1000, hungUp.signal);
      } finally {
        request.raw.off("close", onClose);
      }
    } else {
      view = queue.get(id, caller);
    }
    return view ?? noSuchJob(reply);
  });

  app.delete("/v1/jobs/:id", { schema: deleteSchema }, async (request, reply) => {
    return queue.cancel(request.params.id, callerOf(request)) ?? noSuchJob(reply);
  });
};
