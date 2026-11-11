import type { ErrorBody } from "@wicket/shared";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { createWardClient, wardAuth, type Accounts, type WardClientOptions } from "../../../vendor/ward/ward-auth.js";
import { AUTH_ROUTE_PREFIX, SESSION_COOKIE } from "../../config.js";
import { isUnder, pathOf } from "../../lib/paths.js";
import { USER_ROLE } from "./accounts.js";

export interface AuthOptions {
  accounts: Accounts;
  /** "Sign in with Ward", or undefined for local accounts only. */
  ward: WardClientOptions | undefined;
  /** The page's origin as the browser sees it. */
  publicOrigin: string;
  /** The API prefix as the browser sees it: the session cookie's path. */
  apiPrefix: string;
  /** The page's base path, with a trailing slash. */
  webBase: string;
  /** Peers besides loopback whose `X-Forwarded-For` the login lockout believes. */
  trustedProxies: readonly string[];
}

const UNAUTHORIZED_SESSION = "sign in to Wicket's page; app tokens don't open the admin routes";

/**
 * The session guard and the sign-in routes under `/auth`, from the vendored
 * ward-auth plugin. Registered before the token guard and the routes, so
 * every route after it is behind it, and wrapped in fastify-plugin so its
 * hooks are the root's.
 */
const auth: FastifyPluginAsync<AuthOptions> = async (app, options) => {
  // Checks the settings and imports the key now; talks to Ward only on first use, so Wicket starts while Ward is down.
  const ward = options.ward && (await createWardClient(options.ward));
  await app.register(wardAuth, {
    accounts: options.accounts,
    cookieName: SESSION_COOKIE,
    // The API prefix as the browser sees it: every request that needs the session is under it.
    cookiePath: options.apiPrefix,
    publicOrigin: options.publicOrigin,
    routePrefix: AUTH_ROUTE_PREFIX,
    publicRoutes: ["GET /v1/health", "GET /metrics"],
    // The page offers no rename, and the seed matches accounts by name.
    allowRename: false,
    isPublic: (request) => {
      const path = pathOf(request.url);
      // The apps' routes: their token decides (the app-tokens plugin), never a session.
      if (isUnder(path, "/v1/jobs")) return true;
      // Every other API route needs a session; the plugin's own list decides under /auth.
      if (isUnder(path, "/v1") || isUnder(path, AUTH_ROUTE_PREFIX)) return false;
      // The page's files, the redirect to them, /metrics and a 404: the login page has to load.
      return true;
    },
    trustedProxies: options.trustedProxies,
    ...(ward && {
      ward: {
        client: ward,
        loginPath: `${options.webBase}login`,
        settingsPath: `${options.webBase}account`,
        afterSignInPath: options.webBase,
        roleFor: () => USER_ROLE,
      },
    }),
  });

  // The guard answers `{ error: "unauthorized" }`; under `/v1` the contract's
  // error shape is `{ code, message }`. The sign-in routes keep the plugin's
  // shape for its hooks. This runs after serialisation, which is why no route
  // declares a 401 response schema: the guard's own body would fail it.
  app.addHook("onSend", async (request, reply, payload) => {
    if (reply.statusCode !== 401 || typeof payload !== "string" || !isUnder(pathOf(request.url), "/v1")) return payload;
    let body: unknown;
    try {
      body = JSON.parse(payload);
    } catch {
      return payload;
    }
    if (typeof body !== "object" || body === null || !("error" in body) || "code" in body) return payload;
    const refused: ErrorBody = { code: "unauthorized", message: UNAUTHORIZED_SESSION };
    return JSON.stringify(refused);
  });
};

export const authPlugin = fp(auth, { name: "auth" });
