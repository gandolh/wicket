import { describe, expect, it } from "vitest";
import { ConfigError, loadConfig } from "./config.js";

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

describe("provider settings", () => {
  it("sends every job to the backup without a key, with the settled defaults", () => {
    const config = loadConfig({});
    expect(config.cloud).toBeUndefined();
    expect(config.backup).toEqual({ url: "http://127.0.0.1:11434", model: "gemma3:1b", keepAlive: "1m", timeoutMs: 300_000 });
  });

  it("asks the cloud with a key, gpt-oss:120b by default", () => {
    const config = loadConfig({ OLLAMA_API_KEY: "a-key", WICKET_CLOUD_URL: "https://ollama.example.com/" });
    expect(config.cloud).toEqual({ url: "https://ollama.example.com", model: "gpt-oss:120b", apiKey: "a-key", timeoutMs: 120_000 });
  });

  it("reads keep-alive as seconds or a duration", () => {
    expect(loadConfig({ WICKET_BACKUP_KEEP_ALIVE: "0" }).backup.keepAlive).toBe(0);
    expect(loadConfig({ WICKET_BACKUP_KEEP_ALIVE: "30s" }).backup.keepAlive).toBe("30s");
    expect(() => loadConfig({ WICKET_BACKUP_KEEP_ALIVE: "soon" })).toThrow(/WICKET_BACKUP_KEEP_ALIVE/);
  });

  it("names a bad URL or timeout, never the key", () => {
    let message = "";
    try {
      loadConfig({ OLLAMA_API_KEY: "the-secret-key", WICKET_BACKUP_URL: "ftp://x", WICKET_CLOUD_TIMEOUT_SECONDS: "0" });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain("WICKET_BACKUP_URL");
    expect(message).toContain("WICKET_CLOUD_TIMEOUT_SECONDS");
    expect(message).not.toContain("the-secret-key");
  });
});

describe("sign-in settings", () => {
  it("defaults to the Vite dev server, the sub-paths and local accounts only", () => {
    const config = loadConfig({});
    expect(config).toMatchObject({ publicOrigin: "http://localhost:5179", apiPrefix: "/wicket-api", webBase: "/wicket/", ward: undefined, trustedProxies: [] });
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
    expect(loadConfig({ ...ward, WARD_OIDC_REDIRECT_URI: "https://example.com/wicket-api/auth/ward/callback" }).ward).toBeDefined();
  });
});
