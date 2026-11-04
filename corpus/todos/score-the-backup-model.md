---
title: Score gemma3:1b on Romanian listings
created: 2026-11-04
status: open
tags: [backup, quiet-machine]
---

# Score gemma3:1b on Romanian listings

The backup model was chosen for its size, not measured. Before relying on it,
run ro-housing's "fill the gaps" prompt over a handful of real Romanian listing
pages with `gemma3:1b` and compare its answers to the cloud model's. Do it on a
quiet machine: it means pulling the model and running it for a while, which the
owner asked not to do while other agents work.

## Context

- The backup runs capped at about 1.3 GB and one CPU core
  ([decisions.md](../wiki/decisions.md)). Time a call there, not only on a
  developer machine.
- Ollama's default context may cut a long listing page from the front. Pick a
  context length that fits the pages and the cap
  ([open-questions.md](../wiki/open-questions.md), "The backup's context length").
- If gemma3:1b is too weak, the candidates are other models around 1B that fit
  the same cap.

## Acceptance

A short write-up in the wiki: the listings used (no personal data), how many
fields each model filled correctly, the time per call under the cap, and a
recommendation for the backup model and its context length.
