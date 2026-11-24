import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

/**
 * Test helpers: a stub Ollama server on loopback, for the runner's tests and
 * anything else that calls `POST /api/chat`. No real model is ever asked. Not
 * imported by the server; call `closeStubs()` after each test.
 */

export interface Seen {
  headers: IncomingMessage["headers"];
  body: Record<string, unknown>;
}

export type Handler = (req: IncomingMessage, res: ServerResponse, body: Record<string, unknown>) => void;

export interface Stub {
  url: string;
  seen: Seen[];
  /** Resolves when a request's connection closes before an answer was sent. */
  hungUp: Promise<void>;
  /** Resolves on the first request. */
  reached: Promise<void>;
  handle(handler: Handler): void;
}

const servers: Server[] = [];

/** A stub that answers "stub answer" until `handle` gives it another handler. */
export async function stub(): Promise<Stub> {
  let handler: Handler = (_req, res) => answer(res, "stub answer");
  const seen: Seen[] = [];
  let hungUp!: () => void;
  let reached!: () => void;
  const hungUpPromise = new Promise<void>((resolve) => (hungUp = resolve));
  const reachedPromise = new Promise<void>((resolve) => (reached = resolve));
  const server = createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk: Buffer) => (raw += chunk.toString()));
    req.on("end", () => {
      const body = JSON.parse(raw) as Record<string, unknown>;
      seen.push({ headers: req.headers, body });
      res.on("close", () => {
        if (!res.writableEnded) hungUp();
      });
      reached();
      handler(req, res, body);
    });
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    seen,
    hungUp: hungUpPromise,
    reached: reachedPromise,
    handle: (h) => (handler = h),
  };
}

/** Closes every stub opened so far. */
export async function closeStubs(): Promise<void> {
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

/** Ollama's reply with `content` as the answer. */
export function answer(res: ServerResponse, content: string, status = 200): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify({ model: "x", message: { role: "assistant", content }, done: true }));
}

/** An error body, as Ollama sends one. */
export function refuse(res: ServerResponse, status: number, error: string): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify({ error }));
}

/** A port nothing listens on: a server that was opened and closed. */
export async function deadUrl(): Promise<string> {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  await new Promise((resolve) => server.close(resolve));
  return `http://127.0.0.1:${port}`;
}
