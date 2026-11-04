// A stand-in for Ollama Cloud, for taking the README's screenshots. It is not
// a model: it answers Ollama's POST /api/chat on loopback with a fixed reply,
// slowly when the last message says "slow" (so a call stays running and
// others wait behind it), and with a 429 when it says "quota" (a spent quota).
//
//   node docs/images/stand-in-cloud.mjs            listens on 127.0.0.1:11999
//
// Point Wicket at it with WICKET_CLOUD_URL=http://127.0.0.1:11999 and any
// OLLAMA_API_KEY value; shots.md has the whole recipe.
import { createServer } from "node:http";
import process from "node:process";
import { setTimeout } from "node:timers";

const PORT = Number(process.env.PORT ?? 11999);
const SLOW_MS = 90_000;

createServer((req, res) => {
  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", () => {
    const body = JSON.parse(raw || "{}");
    const last = String(body.messages?.at(-1)?.content ?? "");
    const send = (status, payload) => {
      if (res.writableEnded || res.destroyed) return;
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(payload));
    };
    if (last.includes("quota")) return send(429, { error: "you have reached your usage limit" });
    const reply = { model: body.model, message: { role: "assistant", content: "A stand-in answer." }, done: true };
    setTimeout(() => send(200, reply), last.includes("slow") ? SLOW_MS : 1_500);
  });
}).listen(PORT, "127.0.0.1", () => process.stdout.write(`stand-in cloud on http://127.0.0.1:${PORT}\n`));
