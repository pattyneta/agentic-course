# Day 2 Exercise — Manual Tool Loop over a Booking API

Build a small assistant that answers real questions about the cruise catalogue by calling a (mock) third-party booking API — the shape of every Traveltek-style integration you'll ever write with Claude.

## The API you're wrapping

`sample-data/travel-api/bookingApi.ts` exposes three async functions that behave like a real remote supplier (latency, typed errors):

- `searchCruises(criteria)` — filter by region, nights, price, departure port.
- `getItinerary(cruiseId)` — day-by-day ports.
- `getPricing(cruiseId)` — per-cabin pricing and availability.

## What you're building

A CLI that takes a question and runs the tool loop until Claude has an answer:

```sh
cd exercises
npx tsx day2/solution/index.ts "What Mediterranean cruises under £1500 are there, and what's the itinerary of the cheapest?"
npx tsx day2/starter/index.ts "..."
npx tsx day2/solution-stretch2/index.ts "..."   # stretch goal 2: clarifying questions + multi-turn + spinner
```

Claude should search, then follow up (itinerary/pricing) as needed, then answer in prose.

## Your task (starter)

Open `day2/starter/index.ts`. The TODOs walk you through:

1. Define three `Anthropic.Tool` objects wrapping the three API functions. Write descriptions that say **when** to call each.
2. Write a `runTool(name, input)` dispatcher that calls the matching API function and returns its result (catch `BookingApiError` and return an error result).
3. Implement the loop: `create` → check `stop_reason` → execute `tool_use` blocks → push `tool_result`s → repeat until `end_turn`.

Watch the invariants from the lesson: append the assistant turn before the results, match `tool_use_id`, and return all results in one user message.

## Stretch goal — a confirmation-gated write tool

Add a fourth tool, `save_summary`, that writes Claude's answer to a file:

1. Schema: `{ filename: string, content: string }`.
2. In `runTool`, before writing, **print the filename and ask for confirmation** on the terminal (use Node's `readline`). Only write if the user types `y`.
3. If the user declines, return a `tool_result` with `is_error: true` and a message like `"User declined to save the file."` — and watch Claude adapt gracefully.

This is a human-in-the-loop gate built by hand. On Day 5 you'll get the same behaviour declaratively via Managed Agents permission policies.

## Stretch goal 2 — clarifying questions, a full conversation, and a spinner

Reference implementation: `day2/solution-stretch2/index.ts`.

The CLI so far answers one question and exits. Extend it into a proper back-and-forth assistant:

1. **Ask before guessing.** Add a fifth tool, `ask_user`, with a schema of `{ question: string }` and a
   description telling Claude to call it when the request is ambiguous or missing details (no region/budget
   given, or several cruises match and it needs you to pick one) instead of guessing. In `runTool`, prompt with
   the question on the terminal (reuse the `readline` interface from the `save_summary` gate) and return the
   typed answer as a normal — not `is_error` — `tool_result` so the loop just continues with the extra context.
2. **Go multi-turn.** Pull the existing `create` → check `stop_reason` → execute tools → push results loop out
   into a `runTurn(messages)` helper that runs until Claude stops asking for tools. Wrap that in an outer loop in
   `main()`: print Claude's reply, prompt for your next message, and keep going — reusing the same `messages`
   array so history carries across turns. Exit cleanly when the user types `quit` or `exit`.
3. **Show a thinking spinner.** Each `client.messages.create()` call has real latency, especially once a
   question needs multiple tool round-trips. Add a small terminal spinner (Node's `readline.clearLine` /
   `cursorTo` to redraw in place) that runs while a call is in flight, and guard it with
   `process.stdout.isTTY` so it's a no-op for piped/scripted runs.

> ⚠️ `rl.question()` only resolves the very next `'line'` event fired *after* it's called — it does not buffer
> earlier input for a later call. This only matters if you're scripting input (e.g. piping answers in for a
> test); a real interactive terminal, where you type after seeing the prompt, is unaffected.

## Cost

A few Opus calls per question (search + follow-ups). Typically **under $0.10** per run. Use `claude-haiku-4-5` while iterating.
