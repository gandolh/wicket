import { existsSync } from "node:fs";
import fastifyStatic from "@fastify/static";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { pathOf } from "../lib/paths.js";
import { notFound } from "./errors.js";

export interface PageOptions {
  /** The built page; skipped when unset or when the directory does not exist. */
  webDist: string | undefined;
  /** The page's base path, with a trailing slash. */
  webBase: string;
}

/**
 * The built page at `webBase` (in production Caddy serves it instead), `/`
 * redirecting there, and the 404 handler: any other `GET` under `webBase` is
 * the page too (`index.html`, so the page's own routes load), and the rest is
 * the contract's 404. Registered last, wrapped in fastify-plugin so the 404
 * handler is the root's.
 */
const page: FastifyPluginAsync<PageOptions> = async (app, { webDist, webBase }) => {
  const serving = webDist !== undefined && existsSync(webDist);
  if (serving) await app.register(fastifyStatic, { root: webDist, prefix: webBase });
  if (webBase !== "/") app.get("/", async (_request, reply) => reply.redirect(webBase));
  app.setNotFoundHandler((request, reply) => {
    const path = pathOf(request.url);
    if (serving && request.method === "GET" && webBase !== "/" && path === webBase.slice(0, -1))
      return reply.redirect(webBase);
    if (serving && (request.method === "GET" || request.method === "HEAD") && path.startsWith(webBase)) {
      return reply.sendFile("index.html");
    }
    return notFound(request, reply);
  });
};

export const pagePlugin = fp(page, { name: "page" });
