// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeSwitch } from "../components/ThemeSwitch";
import { getTheme, setTheme } from "./theme";

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
      expect(localStorage.getItem("theme")).toBe(theme);
      expect(getTheme()).toBe(theme);
    }
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
});
