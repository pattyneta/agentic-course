# Day 5 Capstone — A Production Code-Review Agent

Bring the week together. Build a Managed Agent that audits a real integration codebase, reports findings through **your own** custom tool, and works against an **outcome rubric** until the review is thorough enough to pass.

The review target is `sample-data/integration-service/` — a slice of a supplier→CMS sync service seeded with genuine reliability, security, and correctness bugs (unbounded retry recursion, a hardcoded API key, an unverified webhook, a swallowed error, more). The agent's job is to find them.

> **Beta access required** (same as Day 4). No access → use the Console fallback from `day4/README.md`, driving an outcome from the session UI.

## What you're building

```sh
cd exercises
npx tsx day5/solution/index.ts
```

The script:

1. Creates an environment and a **code-review agent** with:
   - the built-in toolset (to read the code), and
   - a **custom `post_review_summary` tool** (its only way to deliver the report).
2. Uploads and mounts every file of `integration-service/` into a session.
3. Sends a **`user.define_outcome`** with a review rubric (the list of issue classes a good review must catch).
4. Streams the run, printing outcome-evaluation progress.
5. Handles `agent.custom_tool_use` → prints the summary to your terminal → sends `user.custom_tool_result`.
6. Cleans up.

## Your task (starter)

Open `day5/starter/index.ts`. The TODOs walk through:

1. Declare the custom `post_review_summary` tool (schema: `{ markdown: string }`) alongside the agent toolset.
2. Mount the service files (a helper is provided that uploads a directory).
3. Send a `user.define_outcome` with the rubric — **don't** also send a `user.message`.
4. In the stream loop, handle three things:
   - `agent.custom_tool_use` (name `post_review_summary`) → print `input.markdown`, then send `user.custom_tool_result`.
   - `span.outcome_evaluation_end` → log `result` + `iteration`.
   - `session.status_idle` with the correct terminal gate; `session.status_terminated`.

## Stretch goals

- **Real GitHub repo.** Replace the file mounts with a `github_repository` resource (`url`, `authorization_token` from a fine-grained PAT in your `.env`, `checkout` branch). Point it at any repo you own.
- **Permission gate.** Give `bash` an `always_ask` permission policy and handle the `user.tool_confirmation` round-trip.
- **Scheduled deployment.** Sketch a `client.beta.deployments.create(...)` that runs this review every Monday — you don't have to run it, just wire the config.

## What "good" looks like

The agent should find and report most of these planted issues:

- `supplierClient.ts` — unbounded recursive retry on failure (stack overflow / hammering the supplier); API key passed as a URL query param (logged, leaked).
- `config.ts` — a hardcoded `sk_live_...` fallback key.
- `webhookHandler.ts` — no signature verification on an endpoint that creates bookings (anyone can forge one).
- `sync.ts` — only ever syncs page 1 (pagination bug); errors silently swallowed; `failed` count computed but never surfaced.

The rubric in the solution asks for exactly these, so the grader can tell a thorough review from a shallow one.

## Cost

The most expensive exercise: a multi-file review with outcome iteration runs the model many times. Budget **a few dollars**. Lower `max_iterations` to cap it.
