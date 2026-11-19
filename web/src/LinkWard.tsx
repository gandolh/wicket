import { useRef, useState, type FormEvent } from "react";
import type { useWardLink } from "../vendor/ward/ward-auth-react.js";
import { buttonClass } from "./components/ui/buttonClass";
import { accountMessage } from "./messages";

const INPUT =
  "min-h-11 rounded-control border border-line-control bg-surface px-3 text-body font-normal text-ink aria-invalid:border-danger max-[560px]:text-heading";

/**
 * "Link Ward": the account's password, typed again, and the button that
 * sends the browser to Ward with it. A refusal (a wrong password, too many
 * tries) stays here, beside the field, and the field keeps focus.
 */
export function LinkWard({ link }: { link: ReturnType<typeof useWardLink> }) {
  const [password, setPassword] = useState("");
  const [missing, setMissing] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password === "") {
      setMissing(true);
      input.current?.focus();
      return;
    }
    const started = await link.link(password);
    if (!started) input.current?.focus();
  }

  return (
    <form className="mt-4 flex max-w-96 flex-col gap-3" onSubmit={(event) => void submit(event)} noValidate>
      <label className="flex flex-col gap-1 font-medium text-ink-muted">
        <span>Current password</span>
        <input
          ref={input}
          className={INPUT}
          name="current-password"
          type="password"
          autoComplete="current-password"
          value={password}
          aria-invalid={missing || link.error !== null || undefined}
          onChange={(event) => {
            setPassword(event.target.value);
            setMissing(false);
          }}
        />
      </label>
      {missing && <span className="font-normal text-danger">Enter your password to link Ward.</span>}
      {link.error !== null && (
        <p className="text-danger" role="alert">
          {accountMessage(link.error)}
        </p>
      )}
      <div>
        <button type="submit" className={buttonClass()} disabled={link.pending}>
          {link.pending ? "Opening Ward…" : "Link Ward"}
        </button>
      </div>
    </form>
  );
}
