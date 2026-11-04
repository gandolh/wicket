import js from "@eslint/js";
import tseslint from "typescript-eslint";

/**
 * Thin on purpose: the compiler (`strict`, `noUnusedLocals`,
 * `noUncheckedIndexedAccess`) is the main gate, and this adds what it cannot
 * see.
 */
export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "data/**", "**/vendor/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
);
