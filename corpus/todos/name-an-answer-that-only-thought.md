---
title: Name an answer that only thought
created: 2026-11-23
status: promoted (brief 19, [19-name-an-answer-that-only-thought](../briefs/done/19-name-an-answer-that-only-thought.md))
tags: [server]
---

# Name an answer that only thought

Promoted 2026-11-25 to [brief 19](../briefs/done/19-name-an-answer-that-only-thought.md), built 2026-11-24.

From the odysseus research of 2026-11-23 ([research-odysseus.md](../wiki/research-odysseus.md)). Odysseus is
AGPL-3.0: the idea only, nothing copied.

gpt-oss returns its reasoning in `message.thinking` and its answer in `message.content`. Wicket's runner
(`chat()` in `server/src/features/queue/runner.ts`) reads only `message.content` and fails a blank one as
`empty`, "sent an empty answer". That is right: reasoning must never stand in for the answer. But a model that
spent its whole turn reasoning and wrote no answer, which a long `format` job could do, reads the same as a
blank reply. The caller and the owner can't tell the two apart.

Odysseus treats this as a known case and handles it two ways (`src/llm_core.py@17ff9ea`). Its native Ollama
parser reads only the answer, so a reasoning-only reply comes back blank. Its OpenAI-style path lets the
reasoning stand in for a blank answer unless thinking was switched off, and its own comment names the case: a
model that spent its whole budget on reasoning. Wicket should take the naming and not the fallback: reasoning
never becomes the answer here.

The change: when `content` is blank and `thinking` is not, fail with its own kind (say `thinking-only`) and
error ("answered with reasoning and no answer"). Only the kind and a fixed message: the thinking text must reach
neither the log nor the caller's error, by the "no prompt or answer text at rest" rule.

Nobody has seen this failure yet. Make it a brief when an `empty` failure shows up in the log, or fold it into
the next brief that touches the runner (brief 16 sets the reasoning level and touches the same function).
