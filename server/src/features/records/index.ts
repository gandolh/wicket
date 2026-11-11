// The feature's public surface: the records table and its route. app.ts opens the table and
// registers the route from here; the queue and the metrics take a record's type from here.
export { recordRoutes } from "./routes.js";
export { Records, type JobRecord, type Outcome } from "./store.js";
