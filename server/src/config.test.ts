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
