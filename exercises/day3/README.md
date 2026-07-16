# Day 3 Exercise — Tool Runner + Web Search

Rebuild yesterday's agent with the Tool Runner (and watch the loop code disappear), then give it live web access so it can write destination guides that combine your catalogue with current public information.

## Part A — rebuild on the Tool Runner

Reimplement the Day 2 assistant using `client.beta.messages.toolRunner`:

```sh
cd exercises
npx tsx day3/solution/index.ts "Compare the Norwegian Fjords and Baltic Capitals cruises"
npx tsx day3/starter/index.ts "..."
```

The three booking tools become `betaZodTool(...)` definitions with a `run` function, and the entire Day 2 loop collapses to `await runner`. Compare the line counts — the runner is doing everything you hand-wrote yesterday.

## Part B — add web search

Add the server-side web search tool so Claude can answer questions like:

> "What's the Greek Isles Explorer itinerary, and what's the current UK travel advice for those countries?"

Web search is a **declaration**, not a function — you add `{ type: "web_search_20260209", name: "web_search", max_uses: 5 }` to the `tools` array. No `run`. Claude now blends your private catalogue data with live public data in one loop.

## Your task (starter)

Open `day3/starter/index.ts`:

1. Define the three booking tools with `betaZodTool` (schema + `run`).
2. Add the web search tool declaration.
3. Create the runner and `await` it; print the final text.
4. (Optional) iterate the runner (`for await (const message of runner)`) to log each tool call as it happens.

Remember `import { z } from "zod/v4"`.

## Stretch goal — a human-approval hook

Add a client-side `save_guide` tool (writes the guide to a file). Instead of a manual loop, put the confirmation **inside the tool's `run` function**: prompt on the terminal, and return `"User declined to save."` if they say no. This is the same gate as Day 2, but now it lives naturally inside the runner — no loop surgery required.

Notice how the Tool Runner didn't take away your control; the approval gate just moved into the tool.

## Cost

Web search adds a little cost per query. A run or two stays **well under $0.50**. Cap it with `max_uses` on the web search tool.
