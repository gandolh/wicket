---
summary: Wicket's vocabulary. Job, app and app token, queue, ticket, now serving, position, the cloud model (the only model since 2026-11-04), force close, clear queue, a job's status vs a record's outcome, and record, each with the words they replace.
updated: 2026-11-04
---

# Glossary

## The queue

**Job**:
One call to an LLM that an app asked Wicket to make: its messages, its format,
and what happened to it. Lives in memory only.
_Avoid_: request (that is the HTTP request), task, prompt (that is the text)

**App**:
A caller of the API, known by the name its token carries (`just-a-bot`,
`ro-housing`).
_Avoid_: client (that is Ward's word for a sign-in client), consumer, user

**App token**:
The bearer secret one app sends with every call. Each app has its own.
_Avoid_: API key (that is Ollama's), shared token

**Queue**:
The one first-come-first-served line every job joins. One job runs at a time;
the rest wait.
_Avoid_: backlog, pool

**Ticket**:
The number a job gets when it joins the queue, counting up and never reused.
_Avoid_: queue number, job number, id (that is the job's opaque `id`)

**Now serving**:
The ticket running now, or the last ticket that ran when the queue is idle.
_Avoid_: current ticket, active job

**Position**:
A waiting job's place in line: 1 runs next. 0 once it runs or has finished.
_Avoid_: rank, index, queue length

## Models

**Cloud model**:
The model Wicket asks, on Ollama Cloud, for every job. A setting,
`gpt-oss:120b` by default. There is no other model.
_Avoid_: main model, primary, provider

## Actions

**Force close**:
Aborting the running job's request from the queue page. Its caller sees
`cancelled`, and the next ticket runs.
_Avoid_: kill, stop, abort (fine in code, not in the UI)

**Clear queue**:
Dropping every waiting ticket from the queue page. The running job is left
alone. Their callers see `cancelled`.
_Avoid_: flush, purge, reset

## Outcomes

**Status**:
Where a live job stands: `queued`, `running`, `done`, `failed` or
`cancelled`. What a caller reads.
_Avoid_: state, phase

**Record**:
The row Wicket keeps once a job ends: app, ticket, model, wait time, run time,
outcome. Never any text.
_Avoid_: log, history, audit entry

**Outcome**:
How a record's job ended: `ok`, `failed` or `cancelled`. `ok` is a job whose
status was `done`.
_Avoid_: result (that is the answer a caller gets), status (that is the live job's)
