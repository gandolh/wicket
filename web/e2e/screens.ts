import type { Page } from "@playwright/test";
import type { QueueState, SessionState } from "./fixtures";

/** Every screen the specs walk: its address, the stubbed state behind it, and the click that opens it. */
export interface Screen {
  name: string;
  path: string;
  queue?: QueueState;
  session?: SessionState;
  act?: (page: Page) => Promise<void>;
}

export const SCREENS: Screen[] = [
  { name: "queue", path: "/wicket/" },
  { name: "queue-idle", path: "/wicket/", queue: "idle" },
  { name: "queue-12-waiting", path: "/wicket/", queue: "twelve" },
  { name: "queue-api-down", path: "/wicket/", queue: "down" },
  {
    name: "force-close-dialog",
    path: "/wicket/",
    act: async (page) => {
      await page.getByRole("button", { name: "Force close" }).click();
    },
  },
  {
    name: "clear-queue-dialog",
    path: "/wicket/",
    act: async (page) => {
      await page.getByRole("button", { name: "Clear queue" }).click();
    },
  },
  { name: "account", path: "/wicket/account" },
  { name: "login", path: "/wicket/login", session: "signed-out" },
  { name: "login-ended", path: "/wicket/login", session: "ended" },
  {
    name: "login-errors",
    path: "/wicket/login",
    session: "signed-out",
    act: async (page) => {
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
    },
  },
  { name: "gate-unreachable", path: "/wicket/", session: "unreachable" },
];
