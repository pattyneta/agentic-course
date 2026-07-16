# Day 4 Exercise — Your First Managed Agent

Create a hosted data-analyst agent, hand it the bookings CSV, and let it analyse the data and generate charts — all in Anthropic's sandbox. You send a message and receive an event stream; the pandas and matplotlib run on their side.

> **Beta access required.** This uses the Managed Agents beta. If `client.beta.agents` calls fail with a permission error, jump to the **Console fallback** at the bottom — you'll do the same thing by clicking instead of coding.

## What you're building

A script that:

1. Creates a cloud **environment** (once).
2. Creates a **data-analyst agent** with the built-in toolset (once).
3. Uploads `sample-data/bookings.csv` and mounts it into a **session**.
4. Sends a message: "analyse these bookings — revenue by region, booking channel mix, and a chart or two."
5. Streams the agent's progress (tool calls + messages) to your terminal.
6. Downloads whatever the agent wrote to `/mnt/session/outputs/` (charts, a summary).
7. Cleans up the session.

```sh
cd exercises
npx tsx day4/solution/index.ts
```

The solution prints a **Console trace URL** right after creating the session — open it to watch the agent work live.

## Your task (starter)

Open `day4/starter/index.ts`. The TODOs walk through:

1. `client.beta.environments.create(...)` — cloud, unrestricted networking.
2. `client.beta.agents.create(...)` — model, a system prompt telling it to write outputs to `/mnt/session/outputs/`, and `tools: [{ type: "agent_toolset_20260401" }]`.
3. Upload the CSV, create the session with the file mounted.
4. **Stream first**, then send the analysis request.
5. Loop the stream with the **correct idle-break gate** (`stop_reason.type !== "requires_action"`).
6. List + download session output files (remember `betas: ["managed-agents-2026-04-01"]` on that call).

## Stretch goal — versioning

1. After the run, update the agent (`client.beta.agents.update(...)`) with a tweaked system prompt (e.g. "also include month-over-month growth").
2. Note the new `version` in the response.
3. Start one session pinned to the **old** version and one on the **new** version; observe the difference.

This is why agents are versioned: you iterate without breaking anything already running.

## Cost

A data-analysis session runs the model several times plus code execution in the container. Expect a **few dollars** for a thorough run — more than days 1–3, but this is the real thing. Keep the prompt scoped to control it.

---

## Console fallback (no beta API access)

1. Go to the [Anthropic Console](https://platform.claude.com/) → **Managed Agents**.
2. Create an **environment** (cloud, unrestricted).
3. Create an **agent**: model Opus 4.8, the system prompt from the solution, enable the agent toolset.
4. Start a **session**, upload `sample-data/bookings.csv` as a resource.
5. Send the analysis message and watch the trace. Download the output files from the session view.

You'll have done everything the script does — the SDK version just automates the clicks.
