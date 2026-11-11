import { useEffect } from "react";
import { useLogout, useSession, useWardLink, useWardResult, useWardSignOut } from "../vendor/ward/ward-auth-react.js";
import { Fact, Facts } from "./components/Facts";
import { buttonClass } from "./components/ui/buttonClass";
import { accountMessage } from "./messages";
import { navigate } from "./route";

/**
 * The account page: who is signed in and how, "Link Ward" when the server
 * has Ward and this account has none, and sign-out. Nothing here changes the
 * queue. A Ward link comes back here as `?ward=linked` or `?ward_error=…`,
 * which `useWardResult` reads.
 */
export function AccountPage() {
  const session = useSession();
  const link = useWardLink();
  const result = useWardResult();
  const logout = useLogout();
  const wardSignOut = useWardSignOut();

  useEffect(() => {
    document.title = "Account · Wicket";
  }, []);

  if (session.status !== "signed_in") return null;
  const { user, ward } = session;
  const viaWard = session.session.origin === "ward";
  const failure = link.error ?? result.error ?? logout.error ?? wardSignOut.error;

  return (
    <main className="mx-auto max-w-account p-6">
      <p className="my-3.5">
        <a
          className="text-accent underline"
          href="."
          onClick={(event) => {
            event.preventDefault();
            navigate("queue");
          }}
        >
          ← Back to the queue
        </a>
      </p>
      <h2 className="my-4.5 text-page-title font-bold">Account</h2>
      <Facts>
        <Fact term="Signed in as">{user.username}</Fact>
        <Fact term="Signed in with">{viaWard ? "Ward" : "your Wicket password"}</Fact>
        {ward.enabled && (
          <Fact term="Ward">{ward.linked || link.linked || result.result === "linked" ? "Linked" : "Not linked"}</Fact>
        )}
      </Facts>

      {result.result === "linked" && (
        <p className="my-3.5 rounded-control bg-banner-bg px-3 py-2 text-banner-text" role="status">
          Ward is linked. You can sign in with it from now on.
        </p>
      )}
      {failure && (
        <p className="my-3.5 text-danger" role="alert">
          {accountMessage(failure)}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {ward.enabled && !ward.linked && !link.linked && (
          <button type="button" className={buttonClass()} disabled={link.pending} onClick={() => void link.link()}>
            {link.pending ? "Opening Ward…" : "Link Ward"}
          </button>
        )}
        <button type="button" className={buttonClass()} disabled={logout.pending} onClick={() => void logout.logout()}>
          Sign out
        </button>
        {viaWard && (
          <button
            type="button"
            className={buttonClass()}
            disabled={wardSignOut.pending}
            onClick={() => void wardSignOut.signOut()}
          >
            Sign out of Ward too
          </button>
        )}
      </div>
    </main>
  );
}
