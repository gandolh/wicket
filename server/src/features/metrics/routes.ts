import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import { errorBodySchema } from "@wicket/shared";
import type { FastifyRequest } from "fastify";
import { z } from "zod";
import { pathOf } from "../../lib/paths.js";
import { fail } from "../../plugins/errors.js";
import type { Queue } from "../queue/index.js";
import type { Metrics } from "./metrics.js";

/** What the metrics route takes from the app. */
export interface MetricsOptions {
  metrics: Metrics;
  queue: Pick<Queue, "snapshot">;
}

/** A request that came through a proxy: Caddy always adds `X-Forwarded-For`. */
function forwarded(request: FastifyRequest): boolean {
  return request.headers["x-forwarded-for"] !== undefined || request.headers.forwarded !== undefined;
}

/**
 * `GET /metrics`, for the box's Prometheus: open on loopback, and a 404 to
 * anything that came through a proxy. The 200 is Prometheus's text format: a
 * string sent with a text content type, which Fastify passes through as it is.
 */
export const metricsRoutes: FastifyPluginAsyncZod<MetricsOptions> = async (app, { metrics, queue }) => {
  const schema = { response: { 200: z.string(), 404: errorBodySchema } };
  app.get("/metrics", { schema }, async (request, reply) => {
    // Loopback only: through Caddy it would publish app names and counts.
    if (forwarded(request))
      return fail(reply, 404, { code: "not_found", message: `no route GET ${pathOf(request.url)}` });
    return reply.type("text/plain; version=0.0.4; charset=utf-8").send(metrics.render(queue.snapshot()));
  });
};
