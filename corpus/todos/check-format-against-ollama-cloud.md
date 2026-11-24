---
title: Check format against Ollama Cloud
created: 2026-11-23
status: promoted
tags: [server, contract]
---

# Check `format` against Ollama Cloud

Promoted 2026-11-25 to [brief 20](../briefs/todo/20-check-format-against-ollama-cloud.md).

Found during the romania-law research of 2026-11-23, while checking what Wicket could do for a law chatbot.

Wicket's contract offers `format` (`"json"` or a JSON schema), and the runner passes it to Ollama Cloud as it is
([providers.md](../wiki/providers.md), [api.md](../wiki/api.md)). ro-housing depends on it: its fill-the-gaps
call sends a schema (`fillSchema(fields)` in ro-housing's `api/src/features/saved/fill-routes.ts`). But Ollama's
cloud page says "Cloud models currently do not support structured outputs" (docs.ollama.com/cloud, fetched
2026-11-23), and providers.md records that the `format` tests ran against a stub: "No real model was asked."

Nobody knows yet what the cloud does with `format`: honour it, ignore it and answer free text, or refuse. The
check is one live job with a small schema, through the opt-in live test, on the owner's word (the hard rules say no
real model without it). Then:

- honoured: note it in providers.md with the date;
- ignored: callers that send `format` must validate the answer themselves; check whether ro-housing does, and
  say so in api.md, since other repos quote it;
- refused: a brief, because ro-housing's fill job fails today.

A future `/lege` command in just-a-bot should not lean on `format` until this is settled.
