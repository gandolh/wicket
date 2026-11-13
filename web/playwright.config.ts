import { defineConfig } from "@playwright/test";

// The specs run against the Vite dev server with the API mocked in each spec, so no backend runs. Port 5189 is
// not the dev port (5179), so a `npm run dev` beside it doesn't clash. `CHROME` points at an installed Chrome when
// Playwright's own browser isn't downloaded.
export default defineConfig({
  testDir: "e2e",
  workers: 1,
  use: {
    locale: "en-US",
    timezoneId: "UTC",
    baseURL: "http://127.0.0.1:5189",
    launchOptions: { executablePath: process.env["CHROME"] },
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5189 --strictPort",
    url: "http://127.0.0.1:5189/wicket/",
    reuseExistingServer: false,
  },
});
