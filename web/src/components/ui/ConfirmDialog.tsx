import { AlertDialog } from "@base-ui/react/alert-dialog";
import { useRef, useState, type ReactNode } from "react";
import { buttonClass, type ButtonVariant } from "./buttonClass";

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
  triggerVariant,
  triggerClassName,
  run,
}: {
  label: string;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  /** The trigger's look, where it differs from the dialog's (a tinted Force close). */
  triggerVariant?: ButtonVariant;
  triggerClassName?: string;
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
      <AlertDialog.Trigger className={buttonClass(triggerVariant ?? (danger ? "danger" : "default"), triggerClassName)}>
        {label}
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-backdrop bg-scrim" />
        <AlertDialog.Popup
          className="fixed top-1/2 left-1/2 z-dialog w-[min(var(--container-dialog),calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-card bg-surface px-6 py-5 text-ink shadow-dialog"
          initialFocus={cancelRef}
        >
          <AlertDialog.Title className="mb-2 text-title font-bold">{title}</AlertDialog.Title>
          <AlertDialog.Description render={<div />}>{description}</AlertDialog.Description>
          <div className="mt-4 flex justify-end gap-2">
            <AlertDialog.Close ref={cancelRef} className={buttonClass()} disabled={pending}>
              Cancel
            </AlertDialog.Close>
            <button
              type="button"
              className={buttonClass(danger ? "danger-solid" : "primary")}
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
