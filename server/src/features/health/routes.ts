import type { HealthResponse } from "@wicket/shared";
import type { FastifyPluginAsync } from "fastify";

/** `GET /v1/health`, open: the deploy's health check and the container's call it. */
export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/v1/health", async (): Promise<HealthResponse> => ({ ok: true }));
};
