import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";

// One Vitest project at the root. `forks` because better-sqlite3 is a native
// addon, and process isolation keeps tests from sharing one instance.
export default defineConfig({
  // The page's stylesheet test imports `index.css?inline`, which only the Tailwind plugin turns into CSS.
  plugins: [tailwindcss()],
  test: {
    css: { include: [/\.css\?inline$/] },
    include: ["*/src/**/*.test.{ts,tsx}"],
    pool: "forks",
  },
});
