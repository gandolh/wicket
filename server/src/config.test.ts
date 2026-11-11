import { isAbsolute } from "node:path";
import { MAX_WAIT_SECONDS } from "@wicket/shared";
import { describe, expect, it } from "vitest";
import {
  CONNECTION_TIMEOUT_MS,
  ConfigError,
  loadConfig,
  loadSeedConfig,
  REQUEST_TIMEOUT_MS,
  resolveDbPath,
} from "./config.js";

describe("config", () => {
  it("has defaults for local development", () => {
    const config = loadConfig({});
    expect(config).toMatchObject({ host: "127.0.0.1", port: 8808, dbPath: undefined });
    expect(config.appTokens.apps).toEqual([]);
  });

  it("treats empty values as unset", () => {
    expect(loadConfig({ HOST: "", PORT: "", WICKET_DB: "", WICKET_APP_TOKENS: "" }).port).toBe(8808);
  });

  it("names every variable at fault", () => {
    let message = "";
    try {
      loadConfig({ PORT: "99999", WICKET_APP_TOKENS: "app=short" });
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      message = (error as Error).message;
    }
    expect(message).toContain("PORT");
    expect(message).toContain("WICKET_APP_TOKENS");
  });
});

describe("cloud settings", () => {
  it("has no cloud without a key, so every job fails saying so", () => {
    expect(loadConfig({}).cloud).toBeUndefined();
    expect(loadConfig({ OLLAMA_API_KEY: "  " }).cloud).toBeUndefined();
  });

  it("asks the cloud with a key, gpt-oss:120b by default", () => {
    const config = loadConfig({ OLLAMA_API_KEY: "a-key", WICKET_CLOUD_URL: "https://ollama.example.com/" });
    expect(config.cloud).toEqual({
      url: "https://ollama.example.com",
      model: "gpt-oss:120b",
      apiKey: "a-key",
      timeoutMs: 120_000,
    });
  });

  it("takes another cloud model and timeout", () => {
    const config = loadConfig({
      OLLAMA_API_KEY: "a-key",
      WICKET_CLOUD_MODEL: "qwen3:32b",
      WICKET_CLOUD_TIMEOUT_SECONDS: "60",
    });
    expect(config.cloud).toMatchObject({ url: "https://ollama.com", model: "qwen3:32b", timeoutMs: 60_000 });
  });

  it("names a bad URL or timeout, never the key", () => {
    let message = "";
    try {
      loadConfig({ OLLAMA_API_KEY: "the-secret-key", WICKET_CLOUD_URL: "ftp://x", WICKET_CLOUD_TIMEOUT_SECONDS: "0" });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("WICKET_CLOUD_URL");
    expect(message).toContain("WICKET_CLOUD_TIMEOUT_SECONDS");
    expect(message).not.toContain("the-secret-key");
  });
});

describe("sign-in settings", () => {
  it("defaults to the Vite dev server, the sub-paths and local accounts only", () => {
    const config = loadConfig({});
    expect(config).toMatchObject({
      publicOrigin: "http://localhost:5179",
      apiPrefix: "/wicket-api",
      webBase: "/wicket/",
      ward: undefined,
      trustedProxies: [],
    });
  });

  it("refuses an origin with a path, and a half-set Ward", () => {
    expect(() => loadConfig({ PUBLIC_ORIGIN: "https://example.com/wicket" })).toThrow(/PUBLIC_ORIGIN/);
    expect(() => loadConfig({ WARD_OIDC_ISSUER: "https://ward.example.com" })).toThrow(/WARD_OIDC_ISSUER empty/);
  });

  it("wants Ward's callback under the API prefix", () => {
    const ward = {
      WARD_OIDC_ISSUER: "https://ward.example.com",
      WARD_OIDC_CLIENT_ID: "wicket",
      // Not a usable key; config only checks it is set, the client imports it at start.
      WARD_OIDC_CLIENT_KEY: "not-checked-here",
      WARD_OIDC_POST_LOGOUT_REDIRECT_URI: "https://example.com/wicket/",
    };
    expect(() => loadConfig({ ...ward, WARD_OIDC_REDIRECT_URI: "https://example.com/auth/ward/callback" })).toThrow(
      /\/wicket-api\/auth\/ward\/callback/,
    );
    expect(
      loadConfig({ ...ward, WARD_OIDC_REDIRECT_URI: "https://example.com/wicket-api/auth/ward/callback" }).ward,
    ).toBeDefined();
  });
});

describe("the database path", () => {
  it("is the repo's data/wicket.sqlite unless WICKET_DB says otherwise, for the server and the seed alike", () => {
    expect(resolveDbPath(undefined)).toMatch(/\/data\/wicket\.sqlite$/);
    expect(isAbsolute(resolveDbPath(undefined))).toBe(true);
    expect(resolveDbPath("  ")).toBe(resolveDbPath(undefined));
    expect(resolveDbPath(" /srv/wicket/w.sqlite ")).toBe("/srv/wicket/w.sqlite");
    expect(resolveDbPath(":memory:")).toBe(":memory:");
    expect(loadSeedConfig({ WICKET_DB: "/srv/wicket/w.sqlite" }).dbPath).toBe("/srv/wicket/w.sqlite");
    expect(loadSeedConfig({}).dbPath).toBe(resolveDbPath(loadConfig({}).dbPath));
  });

  it("gives the seed a trimmed name, the password as typed, and nothing for an empty value", () => {
    expect(loadSeedConfig({ SEED_USERNAME: " demo ", SEED_PASSWORD: " a pass " })).toMatchObject({
      username: "demo",
      password: " a pass ",
    });
    expect(loadSeedConfig({ SEED_USERNAME: " ", SEED_PASSWORD: "" })).toMatchObject({
      username: undefined,
      password: undefined,
    });
  });
});

describe("the timeouts", () => {
  it("never cut a long poll: a socket may stay silent longer than the longest wait", () => {
    expect(CONNECTION_TIMEOUT_MS).toBeGreaterThan(MAX_WAIT_SECONDS * 1000);
    expect(REQUEST_TIMEOUT_MS).toBeGreaterThan(0);
  });
});
