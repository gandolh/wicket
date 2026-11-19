// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthError, useWardLink } from "../vendor/ward/ward-auth-react.js";
import { LinkWard } from "./LinkWard";

afterEach(cleanup);

type Link = ReturnType<typeof useWardLink>;

function hook(over: Partial<Link> & { link: Link["link"] }): Link {
  return { pending: false, error: null, linked: false, reset: () => undefined, ...over };
}

describe("Link Ward", () => {
  it("sends the typed password with the link", async () => {
    const link = vi.fn(() => Promise.resolve(true));
    render(<LinkWard link={hook({ link })} />);
    const field = screen.getByLabelText("Current password");
    expect(field.getAttribute("type")).toBe("password");
    expect(field.getAttribute("autocomplete")).toBe("current-password");
    await userEvent.type(field, "hunter2-hunter2");
    await userEvent.click(screen.getByRole("button", { name: "Link Ward" }));
    expect(link).toHaveBeenCalledExactlyOnceWith("hunter2-hunter2");
  });

  it("asks for the password before calling Ward", async () => {
    const link = vi.fn(() => Promise.resolve(true));
    render(<LinkWard link={hook({ link })} />);
    await userEvent.click(screen.getByRole("button", { name: "Link Ward" }));
    expect(link).not.toHaveBeenCalled();
    expect(screen.getByText("Enter your password to link Ward.")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText("Current password"));
  });

  it("shows a wrong password beside the field and keeps focus there", async () => {
    const error: AuthError = { code: "invalid_credentials" };
    const link = vi.fn(() => Promise.resolve(false));
    render(<LinkWard link={hook({ link, error })} />);
    const field = screen.getByLabelText("Current password");
    await userEvent.type(field, "wrong-wrong-wrong");
    await userEvent.click(screen.getByRole("button", { name: "Link Ward" }));
    expect(screen.getByRole("alert").textContent).toContain("Wrong password");
    expect(document.activeElement).toBe(field);
    expect(field.getAttribute("aria-invalid")).toBe("true");
  });

  it("says how long to wait after too many tries", () => {
    const error = { code: "too_many_attempts", retryAfterSeconds: 45 } as AuthError;
    render(<LinkWard link={hook({ link: () => Promise.resolve(false), error })} />);
    expect(screen.getByRole("alert").textContent).toContain("Wait 45 seconds");
  });
});
