import n from "eslint-plugin-n";
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
    console: ["server/src/index.ts", "server/src/seed.ts"],
    // docs-site is its own package with its own typecheck; data/ is the local database.
    ignores: ["data/**", "docs-site/**"],
  }),
  {
    // A warning for now (2026-11-11): these two files still read the environment themselves. When
    // the server takes its settings from config.ts, this block goes and the rule is an error again.
    name: "wicket/process-env-warns",
    files: ["server/src/index.ts", "server/src/seed.ts"],
    rules: { "n/no-process-env": "warn" },
  },
  {
    // The dependency-cruiser config is CommonJS. The house gives JavaScript files the globals of an
    // ES module, where `module` is undefined, so .cjs files get Node's CommonJS ones.
    name: "wicket/commonjs",
    files: ["**/*.cjs"],
    languageOptions: n.configs["flat/recommended-script"].languageOptions,
  },
];
