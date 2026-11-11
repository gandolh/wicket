import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { isUnder, pathOf } from "../../lib/paths.js";
import { fail } from "../errors.js";
import type { AppTokens } from "./tokens.js";

declare module "fastify" {
  interface FastifyRequest {
    /** The app whose token the request carried, on the job routes. */
    wicketApp?: string;
  }
}

export interface AppTokensOptions {
  appTokens: AppTokens;
}

const UNAUTHORIZED_TOKEN = "send your app's token as Authorization: Bearer <token>";

/**
 * The apps' routes, everything under `/v1/jobs`: a token, or 401. The token
 * names the app. A root hook on the path, not a hook inside the jobs routes,
 * so a method no route has under `/v1/jobs` is refused for want of a token
 * before the 404 handler answers it.
 */
const appTokensGuard: FastifyPluginAsync<AppTokensOptions> = async (app, { appTokens }) => {
  app.addHook("onRequest", async (request, reply) => {
    if (!isUnder(pathOf(request.url), "/v1/jobs")) return;
    const name = appTokens.appFor(request.headers.authorization);
    if (name === undefined) return fail(reply, 401, { code: "unauthorized", message: UNAUTHORIZED_TOKEN });
    request.wicketApp = name;
  });
};

export const appTokensPlugin = fp(appTokensGuard, { name: "app-tokens" });

/**
 * The app whose token a job route's request carried. The token hook answers 401 before a job route
 * runs without one, so a request without an app here is a bug.
 */
export function callerOf(request: FastifyRequest): string {
  if (request.wicketApp === undefined) throw new Error("a job route ran without an app token");
  return request.wicketApp;
}
