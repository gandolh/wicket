import { serializerCompiler, validatorCompiler } from "@fastify/type-provider-zod";
import type { AppCounts, ErrorBody } from "@wicket/shared";
import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { errors } from "../../plugins/errors.js";
import { recordRoutes, type RecordsRoutesOptions } from "./routes.js";
import type { StoredRecord } from "./store.js";

const NOW = Date.UTC(2026, 10, 11, 12);

const row: StoredRecord = {
  id: 1,
  app: "just-a-bot",
  ticket: 7,
  model: "gpt-oss:120b",
  outcome: "ok",
  queuedAt: NOW - 3_000,
  startedAt: NOW - 2_000,
  finishedAt: NOW - 1_000,
  waitMs: 1_000,
  runMs: 1_000,
};
const counts: AppCounts = { app: "just-a-bot", total: 1, ok: 1, failed: 0, cancelled: 0 };

let app: FastifyInstance;
afterEach(async () => {
  await app.close();
});

/** The feature alone, on a bare Fastify with the zod compilers and the error handler, its records a stand-in. */
async function recordsApp(records: RecordsRoutesOptions["records"]): Promise<FastifyInstance> {
  const bare = Fastify();
  bare.setValidatorCompiler(validatorCompiler);
  bare.setSerializerCompiler(serializerCompiler);
  await bare.register(errors);
  await bare.register(recordRoutes, { records, now: () => NOW });
  return bare;
}

describe("GET /v1/records", () => {
  it("sends only the contract's fields: a column the schema doesn't name never leaves the server", async () => {
    // Rows as a store with an extra column would return them.
    const leakyRow = { ...row, prompt: "PROMPT-a-column-added-later" };
    const leakyCounts = { ...counts, prompt: "PROMPT-in-the-counts" };
    const limits: number[] = [];
    app = await recordsApp({
      recent: (limit) => {
        limits.push(limit);
        return [leakyRow];
      },
      countsSince: () => [leakyCounts],
    });
    const res = await app.inject({ url: "/v1/records" });
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toContain("PROMPT-");
    expect(res.json()).toEqual({ records: [row], counts: { day: [counts], week: [counts] } });
    expect(limits).toEqual([50]);
  });

  it("refuses a limit past 200 with the contract's 400, naming the field", async () => {
    app = await recordsApp({ recent: () => [], countsSince: () => [] });
    const res = await app.inject({ url: "/v1/records?limit=900" });
    expect(res.statusCode).toBe(400);
    expect(res.json<ErrorBody>()).toEqual({
      code: "invalid_request",
      message: "limit: Too big: expected number to be <=200",
    });
  });
});
