import type { FastifyPluginAsync, FastifyRequest } from "fastify";
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

/** `GET /metrics`, for the box's Prometheus: open on loopback, and a 404 to anything that came through a proxy. */
export const metricsRoutes: FastifyPluginAsync<MetricsOptions> = async (app, { metrics, queue }) => {
  app.get("/metrics", async (request, reply) => {
    // Loopback only: through Caddy it would publish app names and counts.
    if (forwarded(request))
      return fail(reply, 404, { code: "not_found", message: `no route GET ${pathOf(request.url)}` });
    return reply.type("text/plain; version=0.0.4; charset=utf-8").send(metrics.render(queue.snapshot()));
  });
};
