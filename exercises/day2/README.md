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

## Cost

A few Opus calls per question (search + follow-ups). Typically **under $0.10** per run. Use `claude-haiku-4-5` while iterating.
