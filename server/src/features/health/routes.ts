import type { FastifyPluginAsyncZod } from "@fastify/type-provider-zod";
import { healthResponseSchema } from "@wicket/shared";

/** `GET /v1/health`, open: the deploy's health check and the container's call it. */
export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/v1/health", { schema: { response: { 200: healthResponseSchema } } }, async () => ({ ok: true as const }));
};
