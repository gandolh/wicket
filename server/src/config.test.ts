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
