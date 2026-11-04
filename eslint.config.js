import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

/**
 * Thin on purpose: the compiler (`strict`, `noUnusedLocals`,
 * `noUncheckedIndexedAccess`) is the main gate, and this adds what it cannot
 * see. The React hooks rules apply to the page only.
 */
export default tseslint.config(
  // docs-site is its own package with its own typecheck (`npm run typecheck
  // --prefix docs-site`); its generated .docusaurus/ and reference are not ours.
  { ignores: ["**/dist/**", "**/node_modules/**", "data/**", "**/vendor/**", "docs-site/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["web/src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
);
