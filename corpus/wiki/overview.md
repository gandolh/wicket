---
summary: What Wicket is (a small service on the VPS that every app in the estate uses for LLM calls, holding the Ollama key and running one call at a time), where the name comes from, who calls it today, and what it deliberately leaves out.
updated: 2026-11-04
---

# Overview

Wicket is the estate's one door to an LLM. An app sends it chat messages; Wicket
puts the call in a single first-come-first-served queue, runs one call at a
time on Ollama Cloud, falls back to a small model on the VPS when the cloud
fails, and hands the answer back. It holds the Ollama key, so no other app
needs one.

A wicket is the small door in a big gate that lets people through one at a
time. It joins the estate's other gates: Ward (sign-in) and Postern (webmail).

## Who calls it

- **just-a-bot**, the Discord bot, for `/ask`.
- **ro-housing**, the house-hunting app, for its "fill the gaps" job, which
  reads one listing page per call.

Each has its own app token. More apps get a token when they need one.

## What the owner sees

A page at `/wicket`, behind sign-in: now serving, the running call, the
waiting tickets, and recent records and counts. Two buttons: force close the
running call, and clear the queue.

## What it leaves out

- No prompt or answer text is stored, anywhere.
- No model choice for callers, no priorities, no parallel calls.
- No queue that survives a restart.
- No streaming: a caller gets the whole answer once the job is done.

The reasons are in [decisions.md](decisions.md); the words in
[glossary.md](glossary.md); the contract in [api.md](api.md).
