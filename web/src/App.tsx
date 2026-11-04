import { AccountPage } from "./AccountPage";
import { QueuePage } from "./QueuePage";
import { usePage } from "./route";

/** Wicket in the browser, behind the sign-in gate (`AuthGate.tsx`): the queue, or the account page. */
export function App() {
  return usePage() === "account" ? <AccountPage /> : <QueuePage />;
}
