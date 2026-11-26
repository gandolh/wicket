// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeSwitch } from "../components/ThemeSwitch";
import { getTheme, setTheme } from "./theme";

const setItem = Storage.prototype.setItem;

const root = document.documentElement;

describe("the theme", () => {
  beforeEach(() => {
    localStorage.clear();
    delete root.dataset.theme;
    setTheme("light");
    localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("sets data-theme on <html> and keeps the choice on this device, for each of the three", () => {
    for (const theme of ["dark", "system", "light"] as const) {
      setTheme(theme);
      expect(root.dataset.theme).toBe(theme);
      expect(localStorage.getItem("wicket.theme")).toBe(theme);
      expect(getTheme()).toBe(theme);
    }
  });

  it("picking a theme leaves the bare key alone", () => {
    localStorage.setItem("theme", "light");
    setTheme("dark");
    expect(localStorage.getItem("theme")).toBe("light");
    expect(localStorage.getItem("wicket.theme")).toBe("dark");
  });

  it("still applies the choice when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    setTheme("dark");
    expect(root.dataset.theme).toBe("dark");
    expect(getTheme()).toBe("dark");
  });

  it("is a radio group of Light, Dark and System, with the chosen one checked", async () => {
    render(<ThemeSwitch />);
    const group = screen.getByRole("radiogroup", { name: "Theme" });
    expect(group).toBeTruthy();
    expect(screen.getAllByRole("radio").map((radio) => radio.getAttribute("aria-checked"))).toEqual([
      "true",
      "false",
      "false",
    ]);
    await userEvent.click(screen.getByRole("radio", { name: "Dark" }));
    expect(root.dataset.theme).toBe("dark");
    expect(screen.getByRole("radio", { name: "Dark" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("radio", { name: "Light" }).getAttribute("aria-checked")).toBe("false");
  });

  describe("at start", () => {
    /** Loads the module afresh, as a page load does, with the given stored values. */
    async function start(stored: Record<string, string>) {
      localStorage.clear();
      for (const [key, value] of Object.entries(stored)) localStorage.setItem(key, value);
      const writes: string[] = [];
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
        writes.push(key);
        setItem.call(this, key, value);
      });
      vi.resetModules();
      const fresh = await import("./theme");
      return { theme: fresh.getTheme(), writes };
    }

    it("takes wicket.theme over the bare theme", async () => {
      const { theme } = await start({ "wicket.theme": "light", theme: "dark" });
      expect(theme).toBe("light");
    });

    it("carries a bare dark over once, into wicket.theme, and never writes the bare key", async () => {
      const { theme, writes } = await start({ theme: "dark" });
      expect(theme).toBe("dark");
      expect(localStorage.getItem("wicket.theme")).toBe("dark");
      expect(localStorage.getItem("theme")).toBe("dark");
      expect(writes).toEqual(["wicket.theme"]);
    });

    it("reads an unknown value in either key as light", async () => {
      expect((await start({ "wicket.theme": "purple", theme: "dark" })).theme).toBe("dark");
      expect((await start({ "wicket.theme": "purple", theme: "purple" })).theme).toBe("light");
      expect((await start({ theme: "purple" })).theme).toBe("light");
      expect(localStorage.getItem("wicket.theme")).toBeNull();
    });
  });
});
