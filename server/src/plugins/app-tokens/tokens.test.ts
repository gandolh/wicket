import { describe, expect, it } from "vitest";
import { AppTokens, TokenConfigError } from "./tokens.js";

const BOT = "b".repeat(64);
const HOUSING = "h".repeat(43) + "=";

describe("app tokens", () => {
  it("names the app a token belongs to", () => {
    const tokens = AppTokens.parse(`just-a-bot=${BOT}, ro-housing=${HOUSING}`);
    expect(tokens.apps).toEqual(["just-a-bot", "ro-housing"]);
    expect(tokens.appFor(`Bearer ${BOT}`)).toBe("just-a-bot");
    expect(tokens.appFor(`bearer ${HOUSING}`)).toBe("ro-housing");
  });

  it("refuses a missing, malformed or unknown token", () => {
    const tokens = AppTokens.parse(`just-a-bot=${BOT}`);
    expect(tokens.appFor(undefined)).toBeUndefined();
    expect(tokens.appFor(BOT)).toBeUndefined();
    expect(tokens.appFor(`Basic ${BOT}`)).toBeUndefined();
    expect(tokens.appFor(`Bearer ${"x".repeat(64)}`)).toBeUndefined();
    expect(tokens.appFor(`Bearer ${BOT} extra`)).toBeUndefined();
  });

  it("lets nobody in when unset", () => {
    const tokens = AppTokens.parse(undefined);
    expect(tokens.apps).toEqual([]);
    expect(tokens.appFor(`Bearer ${BOT}`)).toBeUndefined();
  });

  it("names every bad entry, and never a token", () => {
    const secret = "s".repeat(10);
    let message = "";
    try {
      AppTokens.parse(`just-a-bot=${secret},Bad Name=${BOT},no-equals,ro-housing=${BOT},other-app=${BOT}`);
    } catch (error) {
      expect(error).toBeInstanceOf(TokenConfigError);
      message = (error as Error).message;
    }
    expect(message).toContain('"just-a-bot" is shorter than');
    expect(message).toContain("is not an app name");
    expect(message).toContain("entry 3 is not app=token");
    expect(message).toContain('"other-app" has the same token as another app');
    expect(message).not.toContain(secret);
    expect(message).not.toContain(BOT);
  });

  it("refuses an app listed twice", () => {
    expect(() => AppTokens.parse(`app=${BOT},app=${HOUSING}`)).toThrow(/listed twice/);
  });
});
