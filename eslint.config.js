import { houseStyle } from "./vendor/house-style/eslint.config.js";

/**
 * The house config from the vendored house-style copy, given Wicket's folders. Thin on purpose: the
 * compiler is the first gate, and the house adds only what it cannot see. The rules and the reason
 * for each are in the copy.
 */
export default [
  ...houseStyle({
    root: import.meta.dirname,
    web: "web/src",
    server: "server/src",
    // Allowed to print: the server entry logs before its logger exists, the seed CLI talks to the
    // person running it, and the docs capture helper is a script run by hand.
    console: ["server/src/index.ts", "server/src/seed.ts", "docs/images/*.mjs"],
    // docs-site is its own package with its own typecheck; data/ is the local database.
    ignores: ["data/**", "docs-site/**"],
  }),
  {
    // A warning for now (2026-11-11): these files still read the environment themselves. Brief 13
    // moves the server's reads into config.ts and turns the rule back into an error here.
    name: "wicket/process-env-warns",
    files: ["server/src/index.ts", "server/src/seed.ts", "docs/images/*.mjs"],
    rules: { "n/no-process-env": "warn" },
  },
];
