// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";

/** A promise the test settles by hand, to hold the dialog's action in flight. */
function hold() {
  let release = () => {};
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

function setup(run: () => Promise<void>) {
  render(
    <ConfirmDialog
      label="Clear queue"
      title="Clear the queue?"
      description={<p>Waiting tickets are dropped.</p>}
      confirmLabel="Drop them"
      danger
      run={run}
    />,
  );
}

const openDialog = () => userEvent.click(screen.getByRole("button", { name: "Clear queue" }));
const dialog = () => screen.queryByRole("alertdialog");

describe("ConfirmDialog", () => {
  afterEach(cleanup);

  it("opens with Cancel focused", async () => {
    setup(() => Promise.resolve());
    await openDialog();
    await screen.findByRole("alertdialog", { name: "Clear the queue?" });
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" })));
  });

  it("closes on Cancel and on Esc while idle", async () => {
    setup(() => Promise.resolve());
    await openDialog();
    await userEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(dialog()).toBeNull());

    await openDialog();
    await screen.findByRole("alertdialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(dialog()).toBeNull());
  });

  it("stays open on Esc, an outside press and Cancel while the action runs, then closes when it settles", async () => {
    const action = hold();
    let calls = 0;
    setup(() => {
      calls += 1;
      return action.promise;
    });
    await openDialog();
    await userEvent.click(await screen.findByRole("button", { name: "Drop them" }));
    await screen.findByRole("button", { name: "Working…" });

    await userEvent.keyboard("{Escape}");
    await userEvent.click(document.body);
    const cancel = screen.getByRole<HTMLButtonElement>("button", { name: "Cancel" });
    expect(cancel.disabled).toBe(true);
    await userEvent.click(cancel);
    await userEvent.click(screen.getByRole("button", { name: "Working…" }));

    expect(dialog()).not.toBeNull();
    expect(calls).toBe(1);

    action.release();
    await waitFor(() => expect(dialog()).toBeNull());
  });
});
