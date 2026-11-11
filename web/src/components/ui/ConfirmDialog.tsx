import { AlertDialog } from "@base-ui/react/alert-dialog";
import { useRef, useState, type ReactNode } from "react";

/**
 * A button that asks first: a Base UI `AlertDialog` saying what happens to
 * the callers, with Cancel focused (`initialFocus`, so it holds if the markup
 * changes) and the action on the right. The action
 * runs once, the dialog closes when it settles, and the page reports the
 * outcome (`onDone`).
 */
export function ConfirmDialog({
  label,
  title,
  description,
  confirmLabel,
  danger = false,
  run,
}: {
  label: string;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  run: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const confirm = () => {
    if (pending) return;
    setPending(true);
    void run().finally(() => {
      setPending(false);
      setOpen(false);
    });
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <AlertDialog.Trigger className={`button${danger ? " button-danger" : ""}`}>{label}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="dialog-backdrop" />
        <AlertDialog.Popup className="dialog" initialFocus={cancelRef}>
          <AlertDialog.Title className="dialog-title">{title}</AlertDialog.Title>
          <AlertDialog.Description className="dialog-text" render={<div />}>
            {description}
          </AlertDialog.Description>
          <div className="dialog-actions">
            <AlertDialog.Close ref={cancelRef} className="button" disabled={pending}>
              Cancel
            </AlertDialog.Close>
            <button
              type="button"
              className={`button ${danger ? "button-danger-solid" : "button-primary"}`}
              disabled={pending}
              onClick={confirm}
            >
              {pending ? "Working…" : confirmLabel}
            </button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
