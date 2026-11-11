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
    // Scripts run by hand, which print and read the environment directly: the repo's own, and the
    // docs capture helpers.
    scripts: ["scripts", "docs/images"],
    // Allowed to print: the server entry logs before its logger exists, and the seed CLI talks to the
    // person running it.
    console: ["server/src/server.ts", "server/src/seed.ts"],
    // docs-site is its own package with its own typecheck; data/ is the local database.
    ignores: ["data/**", "docs-site/**"],
  }),
];
