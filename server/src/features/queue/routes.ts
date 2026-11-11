import type { ClearResponse, ForceCloseResponse, QueueResponse } from "@wicket/shared";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { fail } from "../../plugins/errors.js";
import type { Queue } from "./queue.js";

/** What the queue page's routes take from the app. */
export interface QueueRoutesOptions {
  queue: Queue;
  /** The clock, in epoch milliseconds: the page ticks elapsed times from the server's. */
  now: () => number;
  /** The page's origin as the browser sees it, for the same-origin check on the writes. */
  publicOrigin: string;
}

/**
 * Whether a browser said the request came from this origin. Absent headers
 * pass (a script or curl sends neither); a browser that sent them and named
 * another site does not. On top of the cookie's `SameSite=Lax`, for the two
 * admin writes.
 */
function sameOrigin(request: FastifyRequest, publicOrigin: string): boolean {
  const fetchSite = request.headers["sec-fetch-site"];
  if (typeof fetchSite === "string" && fetchSite !== "" && fetchSite !== "same-origin") return false;
  const origin = request.headers.origin;
  if (typeof origin === "string" && origin !== "") {
    try {
      return new URL(origin).origin === publicOrigin;
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * The queue page's routes, behind a signed-in session (the auth plugin): the
 * queue now, force close and clear. Neither write takes a body.
 */
export const queueRoutes: FastifyPluginAsync<QueueRoutesOptions> = async (app, { queue, now, publicOrigin }) => {
  /** The two writes refuse a browser that says it came from another site. */
  const crossSite = (request: FastifyRequest, reply: FastifyReply): boolean => {
    if (sameOrigin(request, publicOrigin)) return false;
    void fail(reply, 403, { code: "cross_site", message: "open Wicket's page from its own address" });
    return true;
  };

  app.get("/v1/queue", async (): Promise<QueueResponse> => ({ serverTime: now(), ...queue.snapshot() }));

  app.post("/v1/queue/running/cancel", async (request, reply) => {
    if (crossSite(request, reply)) return reply;
    const closed = queue.forceClose();
    if (closed) request.log.info("force closed the running job from the queue page");
    const body: ForceCloseResponse = { closed };
    return body;
  });

  app.post("/v1/queue/clear", async (request, reply) => {
    if (crossSite(request, reply)) return reply;
    const cleared = queue.clear();
    if (cleared > 0) request.log.info(`cleared ${cleared} waiting job(s) from the queue page`);
    const body: ClearResponse = { cleared };
    return body;
  });
};
