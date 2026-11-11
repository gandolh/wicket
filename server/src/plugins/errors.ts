import { hasZodFastifySchemaValidationErrors, ResponseSerializationError } from "@fastify/type-provider-zod";
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

const INTERNAL: ErrorBody = { code: "internal", message: "Wicket hit an error; see its log" };

/**
 * The one error handler, wrapped in fastify-plugin so it is set on the root
 * and every route inherits it. Every body is `{ code, message }`, which the
 * page and the apps parse.
 *
 * - A request that fails its route schema is a 400 naming the first problem
 *   by where it is (`messages.0.role`, or `request` for the whole body) and
 *   what is wrong, never by its value: a value could be a prompt.
 * - A reply its response schema refuses is a 500: a bug, never the client's
 *   fault.
 * - Fastify's own 4xx (bad JSON, a body too large, a wrong media type) keep
 *   their status, with a message of Wicket's own: a JSON parse error's message
 *   can quote the body, so it is never passed on.
 * - Anything else is a 500 with a fixed message.
 *
 * A 500 is logged by the error's name and code (and a refused reply's method
 * and URL) only: a thrown message, or a refused reply's zod issues, could
 * carry text from a call.
 */
const errorHandling: FastifyPluginAsync = async (app) => {
  app.setErrorHandler((error: Error & { statusCode?: number; code?: string }, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      const issue = error.validation[0];
      const where = issue?.instancePath.slice(1).replaceAll("/", ".") || "request";
      const message = issue === undefined ? "invalid request" : `${where}: ${issue.message ?? "is not valid"}`;
      return fail(reply, 400, { code: "invalid_request", message });
    }
    if (error instanceof ResponseSerializationError) {
      request.log.error(
        { err: { name: error.name, code: error.code }, method: error.method, url: error.url },
        "a reply doesn't match its response schema",
      );
      return fail(reply, 500, INTERNAL);
    }
    const status = error.statusCode ?? 500;
    if (status >= 500) {
      request.log.error({ err: { name: error.name, code: error.code } }, "unhandled error");
      return fail(reply, 500, INTERNAL);
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
