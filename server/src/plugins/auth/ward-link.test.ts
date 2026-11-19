import { generateKeyPairSync } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../app.js";
import { loadConfig, SESSION_COOKIE } from "../../config.js";
import { openDatabase, type Db } from "../../db/open.js";
import { AppTokens } from "../app-tokens/tokens.js";
import { settle, stubRunner } from "../../testing/stub-runner.js";
import { openAccounts, seedUser } from "./accounts.js";

const ISSUER = "https://ward.example.com/ward-api/oidc";
const ORIGIN = "http://localhost:5179";
const PREFIX = "/wicket-api/auth";
const PASSWORD = "p".repeat(12);

/** A client key Ward would have issued: an Ed25519 private JWK, base64url. */
function clientKey(): string {
  const jwk = { ...generateKeyPairSync("ed25519").privateKey.export({ format: "jwk" }), kid: "test-key" };
  return Buffer.from(JSON.stringify(jwk)).toString("base64url");
}

/** Ward's discovery document, the only thing a link start asks of Ward. */
const fakeWard: typeof fetch = (input) => {
  const url = String(input instanceof Request ? input.url : input);
  if (!url.endsWith("/.well-known/openid-configuration")) return Promise.resolve(new Response("{}", { status: 404 }));
  return Promise.resolve(
    Response.json({
      issuer: ISSUER,
      authorization_endpoint: `${ISSUER}/auth`,
      token_endpoint: `${ISSUER}/token`,
      jwks_uri: `${ISSUER}/jwks`,
      id_token_signing_alg_values_supported: ["EdDSA"],
    }),
  );
};

let app: FastifyInstance;
let db: Db;
let cookie: string;

beforeEach(async () => {
  db = openDatabase(":memory:");
  const accounts = openAccounts(db);
  await seedUser(accounts, { username: "owner", password: PASSWORD });
  app = await buildApp(
    {
      ...loadConfig({}),
      dbPath: ":memory:",
      appTokens: AppTokens.parse(`just-a-bot=${"b".repeat(64)}`),
      publicOrigin: ORIGIN,
      ward: {
        issuer: ISSUER,
        clientId: "wicket",
        clientKey: clientKey(),
        redirectUri: `${ORIGIN}${PREFIX}/ward/callback`,
        fetch: fakeWard,
      },
    },
    { run: stubRunner().run, now: () => Date.UTC(2026, 10, 19, 12), accounts },
  );
  const login = await app.inject({
    method: "POST",
    url: `${PREFIX}/login`,
    payload: { username: "owner", password: PASSWORD },
  });
  expect(login.statusCode).toBe(200);
  const header = login.headers["set-cookie"];
  const lines = header === undefined ? [] : Array.isArray(header) ? header : [header];
  cookie = (lines.find((l) => l.startsWith(`${SESSION_COOKIE}=`)) ?? "").split(";")[0] ?? "";
  expect(cookie).not.toBe("");
});
afterEach(async () => {
  await settle();
  await app.close();
  db.close();
});

function link(headers: { cookie?: string }, payload?: unknown) {
  return app.inject({ method: "POST", url: `${PREFIX}/ward/link`, headers, payload: payload ?? {} });
}

describe("linking Ward", () => {
  it("asks for the password again", async () => {
    const res = await link({ cookie });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: "invalid_request" });
  });

  it("refuses a wrong password", async () => {
    const res = await link({ cookie }, { currentPassword: "not-the-password" });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toMatchObject({ error: "invalid_credentials" });
  });

  it("slows down a run of wrong passwords", async () => {
    for (let i = 0; i < 5; i++) await link({ cookie }, { currentPassword: "not-the-password" });
    const res = await link({ cookie }, { currentPassword: "not-the-password" });
    expect(res.statusCode).toBe(429);
    expect(res.json()).toMatchObject({ error: "too_many_attempts" });
  });

  it("sends the browser to Ward with the right password", async () => {
    const res = await link({ cookie }, { currentPassword: PASSWORD });
    expect(res.statusCode).toBe(200);
    expect(JSON.stringify(res.json())).toContain(`${ISSUER}/auth`);
  });

  it("answers a signed-out request with 401", async () => {
    const res = await link({}, { currentPassword: PASSWORD });
    expect(res.statusCode).toBe(401);
  });
});
