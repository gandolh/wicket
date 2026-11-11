import { createHash, timingSafeEqual } from "node:crypto";

/**
 * The apps' bearer tokens. `WICKET_APP_TOKENS` is `app=token,app=token`: the
 * name before the first `=`, the token after it (so a base64 token's padding
 * is fine), entries separated by commas. Each app has its own token, and the
 * token is how Wicket knows which app a call came from.
 *
 * Only SHA-256 digests are kept, and a check compares the presented token's
 * digest with every app's in constant time, without stopping at a match, so
 * the time taken says nothing about which app (or whether any) matched.
 */

/** The shortest token accepted: `openssl rand -hex 32` makes 64 characters. */
const MIN_TOKEN_LENGTH = 32;

/** An app name: lowercase words joined by dashes, like `just-a-bot`. */
const APP_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** `WICKET_APP_TOKENS` cannot be used. The message never repeats a token. */
export class TokenConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TokenConfigError";
  }
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export class AppTokens {
  private readonly digests: ReadonlyMap<string, Buffer>;

  private constructor(digests: ReadonlyMap<string, Buffer>) {
    this.digests = digests;
  }

  /** The configured app names, in the order given. */
  get apps(): string[] {
    return [...this.digests.keys()];
  }

  /**
   * Parse `WICKET_APP_TOKENS`. Empty or unset means no app gets in. Every
   * problem is reported at once, naming the entry by its app name or its
   * place in the list, never by its token.
   */
  static parse(value: string | undefined): AppTokens {
    const digests = new Map<string, Buffer>();
    const seen = new Set<string>();
    const problems: string[] = [];
    const entries = (value ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry !== "");
    entries.forEach((entry, index) => {
      const at = entry.indexOf("=");
      const name = at === -1 ? "" : entry.slice(0, at).trim();
      const token = at === -1 ? "" : entry.slice(at + 1).trim();
      const label = name !== "" ? `"${name}"` : `entry ${index + 1}`;
      if (at === -1) {
        problems.push(`WICKET_APP_TOKENS: ${label} is not app=token.`);
        return;
      }
      if (!APP_NAME.test(name)) {
        problems.push(
          `WICKET_APP_TOKENS: ${label} is not an app name (lowercase letters, digits and dashes, like just-a-bot).`,
        );
        return;
      }
      if (digests.has(name)) {
        problems.push(`WICKET_APP_TOKENS: "${name}" is listed twice.`);
        return;
      }
      if (token.length < MIN_TOKEN_LENGTH || /\s/.test(token)) {
        problems.push(
          `WICKET_APP_TOKENS: the token for "${name}" is shorter than ${MIN_TOKEN_LENGTH} characters or has spaces. Make one with \`openssl rand -hex 32\`.`,
        );
        return;
      }
      if (seen.has(token)) {
        problems.push(`WICKET_APP_TOKENS: "${name}" has the same token as another app. Give each app its own.`);
        return;
      }
      seen.add(token);
      digests.set(name, digest(token));
    });
    if (problems.length > 0) throw new TokenConfigError(problems.join("\n"));
    return new AppTokens(digests);
  }

  /** The app an `Authorization: Bearer <token>` header names, or undefined. */
  appFor(header: string | undefined): string | undefined {
    const token = /^Bearer\s+(\S+)\s*$/i.exec(header ?? "")?.[1];
    if (token === undefined) return undefined;
    const presented = digest(token);
    let found: string | undefined;
    for (const [name, expected] of this.digests) {
      // No early exit: every app's digest is compared on every call.
      if (timingSafeEqual(presented, expected) && found === undefined) found = name;
    }
    return found;
  }
}
