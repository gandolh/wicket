import type { ErrorBody } from "@wicket/shared";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { BODY_LIMIT } from "../config.js";
import { pathOf } from "../lib/paths.js";

/** Answer with the contract's error body, `{ code, message }`. The one way the server writes an error. */
export function fail(reply: FastifyReply, status: number, body: ErrorBody): FastifyReply {
  return reply.status(status).send(body);
}

/** A route that doesn't exist, in the contract's shape. */
export function notFound(request: FastifyRequest, reply: FastifyReply): FastifyReply {
  return fail(reply, 404, { code: "not_found", message: `no route ${request.method} ${pathOf(request.url)}` });
}

/**
 * The one error handler, wrapped in fastify-plugin so it is set on the root
 * and every route inherits it. Every body is `{ code, message }`, which the
 * page and the apps parse.
 *
 * - Fastify's own 4xx (bad JSON, a body too large, a wrong media type) keep
 *   their status, with a message of Wicket's own: a JSON parse error's message
 *   can quote the body, so it is never passed on.
 * - Anything else is a 500 with a fixed message, logged by its name and code
 *   only: a thrown message could carry text from a call.
 */
const errorHandling: FastifyPluginAsync = async (app) => {
  app.setErrorHandler((error: Error & { statusCode?: number; code?: string }, request, reply) => {
    const status = error.statusCode ?? 500;
    if (status >= 500) {
      request.log.error({ err: { name: error.name, code: error.code } }, "unhandled error");
      return fail(reply, 500, { code: "internal", message: "Wicket hit an error; see its log" });
    }
    const message =
      error.code === "FST_ERR_CTP_INVALID_JSON_BODY" || error.name === "SyntaxError"
        ? "the body is not valid JSON"
        : error.code === "FST_ERR_CTP_BODY_TOO_LARGE"
          ? `the body is larger than ${BODY_LIMIT} bytes`
          : error.code === "FST_ERR_CTP_INVALID_MEDIA_TYPE"
            ? "send the body as application/json"
            : "the request is not valid";
    return fail(reply, status, { code: "invalid_request", message });
  });
};

export const errors = fp(errorHandling, { name: "errors" });
