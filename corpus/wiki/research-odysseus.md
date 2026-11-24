---
summary: Research of 2026-11-23 into odysseus (github.com/odysseus-dev/odysseus, a self-hosted AI workspace in Python, AGPL-3.0, read at dev 17ff9ea) and what the estate can take from it. What it is and how it is built; why most of it has no target here (one model, one call at a time, no stored text, small apps); the idea table with a verdict per repo (borrow, already have, not for us); the gpt-oss facts worth keeping (reasoning levels low, medium, high, default medium, never off); guidance for a caller that sends other people's text; what was not verified. Led to brief 16 (a reasoning level setting) and three todos (a thinking-only answer named in Wicket, the listing page fenced as data in ro-housing, a lint for pages older than their code in my-personal-skills).
updated: 2026-11-23
---

# Research: odysseus

The owner asked on 2026-11-23 whether the estate can learn from
[odysseus](https://github.com/odysseus-dev/odysseus) or enrich an app with
what it knows. It was read as a shallow clone of its default branch `dev` at
commit `17ff9ea`. Upstream files are cited as `path@17ff9ea`.

**Licence.** AGPL-3.0-or-later. Ideas and patterns only. No code, prompt or
text from it goes into any estate repo, and each brief and todo that came out
of this page says so.

## What it is

A one-box AI workspace for a person or a small team, started with
`docker compose up` on port 7011 (`README.md@17ff9ea`). In one app:

- chat with local or hosted models, and an agent with tools, MCP servers, a
  shell, skills and memory;
- deep research (multi-round web reading into a report) and a blind
  side-by-side model compare;
- a documents editor with AI edits, a gallery and image editor;
- an IMAP/SMTP mail client with AI triage, tags, summaries and reply drafts;
- notes, todos, reminders, scheduled agent tasks and a CalDAV calendar;
- "Cookbook", which picks, downloads and serves local models sized to the
  machine's GPU and memory.

## How it is built

- **One FastAPI process.** `app.py@17ff9ea` composes some 70 route modules,
  the auth and timeout middleware, the static files and the lifespan hooks
  (`specs/runtime.md@17ff9ea`). There are about 280,000 lines of Python
  outside the tests. The agent loop is one 38,000-line file,
  `src/agent_loop.py@17ff9ea`, frozen while a rewrite ("Harness V2") is built
  (`ROADMAP.md@17ff9ea`).
- **No front-end build.** The browser loads native ES modules as they are
  in `static/`, revalidated on every load (`specs/runtime.md@17ff9ea`).
- **SQLite plus JSON files.** SQLAlchemy models with start-up migrations in
  `core/database.py@17ff9ea` and many JSON stores beside them
  (`specs/persistence.md@17ff9ea`), with ChromaDB for vectors and SearXNG for
  web search as optional services (`ROADMAP.md@17ff9ea`).
- **36 model providers**, one page each under
  `specs/model-providers/@17ff9ea`. A capability layer reads what a model can do from
  the provider's own answer (Ollama's `/api/show`), never from the model's
  name (`specs/model-providers/ollama.md@17ff9ea`), and a quirks table
  records each model's oddity with its evidence (`specs/model-quirks.md@17ff9ea`).
- **Security by layers.** Everything from outside (web pages, mail, files,
  memories, tool output) reaches the model as marked, fenced data
  (`src/prompt_security.py@17ff9ea`, `specs/context-building.md@17ff9ea`).
  A tool approval is bound to the exact action it approved
  (`docs/AGENT_TURN_CONTRACT.md@17ff9ea`). API tokens carry scopes and are
  stored as a hash and a prefix, shown once (`specs/integrations.md@17ff9ea`).
  The threat model is `THREAT_MODEL.md@17ff9ea`.
- **Docs for coding agents.** `specs/` is a map of how the code stands now.
  Each page names the `dev` commit it was checked against, and a list of
  triggers says which pages a given kind of change must update
  (`specs/_readme.md@17ff9ea`).

## Why most of it has no target here

Odysseus is the opposite of the estate's shape. It puts every AI feature
into one app, with many models, tools and memory, on a machine that may hold
a GPU. The estate has small apps, one LLM door, one cloud model, one call at
a time, no prompt or answer text kept anywhere, and a box that gets no
upgrade ([decisions.md](decisions.md)). So its product features mostly
bounce off our decisions. What carries over is what it learned about running
models: how gpt-oss reasons, how to fence outside text, what fails.

## The ideas, by repo

| Idea from odysseus | Repo | Verdict |
|---|---|---|
| A reasoning level for calls that don't need deep thought; send a level only to a model known to take it (`src/utility_effort.py@17ff9ea`, `specs/model-providers/ollama.md@17ff9ea`) | wicket | **Borrow**: [brief 16](../briefs/done/16-the-reasoning-level-as-a-setting.md). One level for every call, a Wicket setting like the model, unset by default. With one call at a time, a shorter run shortens every waiting caller's wait. |
| Treat "reasoned but wrote no answer" as its own case. Odysseus is split on it: its native Ollama parser reads only the answer, while its OpenAI-style path lets the reasoning stand in for a blank answer unless thinking was switched off (`src/llm_core.py@17ff9ea`) | wicket | **Todo**: [name an answer that only thought](../todos/name-an-answer-that-only-thought.md). Wicket already reads only `message.content` and fails a blank one as "empty", but can't say the model spent its turn reasoning. Keep Wicket's rule that reasoning never becomes the answer. Nobody has seen the case yet. |
| Retry 429, 502, 503 and 504 up to three times, 0.5 s apart, and cool a dead host for 20 s (`src/llm_core.py@17ff9ea`) | wicket | **Not without a revisit.** "A cloud failure fails the job" is a locked call and contract text that callers quote ([api.md](api.md)). On Ollama Cloud a 429 is a spent quota, so retrying it only holds the slot. A retry on a 5xx doubles how long one job can hold the only slot. Count the `the cloud failed (50x)` log lines on the box before raising it. |
| Fence outside text as data in a user message, say so in a fixed policy, escape any fence marker inside the text (`src/prompt_security.py@17ff9ea`) | ro-housing | **Todo** in ro-housing: fence the listing page as data in the fill prompt. Low stakes: the JSON schema, `mergeFill()` and the owner's own review before Save already bound what a hostile page can do. The prompt was scored in ro-housing's research, so a change wants a re-score. |
| Set `num_ctx` when the window is known, since Ollama's own default is small (`src/llm_core.py@17ff9ea`); keep the input to 85% of the window (`src/context_budget.py@17ff9ea`) | wicket, ro-housing | **Already have**, where it matters. ro-housing cuts the page text (6,000 characters per JSON script, 12,000 of visible text) after its research saw a local Ollama cut a 10,064-token prompt to 4,096. Wicket sends no `options`, so the cloud's default window applies; its size was not verified. |
| Provider catalog, capability probing, fallback chains, a model per task | wicket | **Not for us.** Wicket picks one model and callers never name one ([decisions.md](decisions.md)). |
| Blind side-by-side model compare with votes (`specs/compare.md@17ff9ea`) | wicket | **Not for us.** One model, and comparing answers means keeping their text. |
| Streaming, multi-turn context compaction, generation budgets | wicket, just-a-bot | **Not for us.** No streaming (decided 2026-11-04), and `/ask` is one question with no history. |
| Memory, skills a model writes for itself, scheduled assistant runs, deep research as a background job (`specs/memory-skills.md@17ff9ea`, `specs/research.md@17ff9ea`, `docs/BACKGROUND_TOOL_JOBS.md@17ff9ea`) | just-a-bot, newspapper | **Not for us.** just-a-bot's `/ask` asks one model and keeps nothing; newspapper's "No LLM in the product" stands. |
| Tool approvals bound to the exact action approved (`docs/AGENT_TURN_CONTRACT.md@17ff9ea`) | none | **Not for us.** No estate app gives a model tools. Our coding agents run under Claude Code's permissions and the builder hooks. |
| Scoped API tokens, stored as hash and prefix, shown once (`specs/integrations.md@17ff9ea`) | wicket, brief-board | **Not now.** Wicket keeps its app tokens in one secret, with "Revisit when there are more than a handful of apps" ([decisions.md](decisions.md)). That is the trigger, and this is the shape to build then. |
| Specs stamped with the commit they were checked against, plus update triggers (`specs/_readme.md@17ff9ea`) | my-personal-skills (corpus-flow) | **Todo**, adapted: a lint warning for a wiki page whose linked code changed after its `updated:` date. No third frontmatter key, since every corpus keeps exactly two. |
| Skill states (built-in, approved, draft), an audit queue, use counts (`docs/skills-lifecycle.md@17ff9ea`) | my-personal-skills | **Already have** the parts we need: evals, the stocktake, and "Prune skills the transcripts show are unused". The draft and audit states exist to vet skills a model writes; the owner writes ours. |
| Mail triage, summaries, reply drafts (`src/email_task_intent.py@17ff9ea`) | postern | **Not for us.** Postern has no backend of its own, a Wicket token can't sit in a browser, and a summary per message doesn't fit one call at a time. |
| Calendar invites from mail, revisions ordered by sequence then stamp, a cancel never creates (`src/email_calendar_import.py@17ff9ea`) | postern, almanac | **Not for us now.** Almanac refuses import; Postern shows invite cards. The ordering rule matters only if Postern ever tracks an invite's updates. |
| CalDAV sync | almanac | **Not for us.** Refused; Almanac sends a read-only .ics feed out instead. |
| Settings export and import as JSON with merge rules (`routes/backup_routes.py@17ff9ea`) | shelfmark and the other apps | **Not for us.** The SQLite file is the backup (Shelfmark's call), which is simpler than merge rules. |
| TOTP and backup codes in the app | wzd_auth (Ward) | **Not here.** Every app signs in with Ward, so a second factor belongs in Ward if anywhere. |
| An editor driven by named operations, one undo step each, with a natural-language planner on top (`docs/EDITOR_AGENT_API.md@17ff9ea`) | imbatranim-apps | **Not now.** No AI in the apps. The one-undo-per-operation shape is worth remembering if a script or macro ever drives an editor. |
| Cookbook (local model downloads and serving), speech to text and back | none | **Not for us.** No model on the box, and the box gets no upgrade. |

## gpt-oss facts worth keeping

Wicket runs `gpt-oss:120b`. From Ollama's thinking docs
(docs.ollama.com/capabilities/thinking, read 2026-11-23) and
`specs/model-providers/ollama.md@17ff9ea` with `specs/model-quirks.md@17ff9ea`:

- `/api/chat` takes `think`. gpt-oss takes the levels `low`, `medium` and
  `high`; `medium` is the default when `think` is left out.
- gpt-oss can't turn reasoning off. A model that can't takes `false` as its
  lowest level.
- The reasoning comes back in `message.thinking`, the answer in
  `message.content`. Wicket reads only the second, which is right.
- Ollama's OpenAI-style `/v1` endpoint names these controls differently.
  Wicket uses the native endpoint.
- A model's name is not evidence of what it can do. If the model setting
  ever changes, ask `/api/show` which `think` values the new one takes.

## For a caller that sends other people's text

Any Wicket caller that passes a web page, a mail or another member's message
should, in its own words:

1. keep that text in its own user message, never in the system message;
2. say in the system message that the text is material to read, and that
   orders inside it are not orders;
3. fence it with a marker of the caller's own and remove that marker from the
   text before sending, so the text can't close the fence;
4. keep a schema and a validator on the answer, as ro-housing does, so a
   hostile text can at worst produce a wrong value that the validator or a
   person catches.

## What was not verified

- That Ollama Cloud honours `think` levels exactly as Ollama's API docs say.
  Brief 16's owner step checks it with live calls.
- Ollama Cloud's context window for `gpt-oss:120b`.
- How often Wicket's cloud call fails with a 5xx (the box's logs were not
  read).
- Odysseus was read through its specs, docs and the named files, not its
  38,000-line agent loop. Its specs say the code wins where they disagree.
