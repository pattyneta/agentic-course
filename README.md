# Building Agents with Claude — Exercises

Hands-on exercises for the 5-day *Building Agents with Claude* course. Over five days you'll go from your first Claude API call to running a hosted, production-shaped agent on Anthropic's **Managed Agents** platform.

All exercises are themed around the work you already do: **CMS content workflows** and **third-party travel API integrations** (Traveltek-style booking APIs).

## Exercises

| Day | Exercise |
|---|---|
| 1 | CMS content assistant — supplier description in, structured CMS entry out |
| 2 | Manual agentic loop over a mock booking API |
| 3 | Tool Runner rebuild + web search destination guides |
| 4 | Data-analyst agent over a bookings CSV, with chart artifacts |
| 5 | Capstone: code-review agent for an API-integration codebase |

Each `dayN/` folder has its own `README.md` with instructions, a `starter/` folder with TODOs for you to complete, and a `solution/` folder with the reference implementation.

## Setup (do this before Day 1)

1. **Node.js 20+** installed (`node --version`).
2. Go to the "exercises" directory.
3. Install dependencies:
   ```sh
   npm install
   ```
4. **API key**: create one in the [Anthropic Console](https://platform.claude.com/), then:
   ```sh
   cp .env.example .env
   # edit .env and set ANTHROPIC_API_KEY=sk-ant-...
   ```
5. Smoke test:
   ```sh
   npm run smoke-test
   ```
   You should see a one-line greeting from Claude.

### Cost expectations

Exercises are designed to be cheap: expect roughly **$1–2 per day** for days 1–3 and a few dollars for the Managed Agents sessions on days 4–5. Every exercise README includes a cost note.

### Days 4–5: beta access

Days 4–5 use Anthropic's **Managed Agents**, which is currently in beta — your organization's API key either has access or it doesn't. You don't need to do anything special in your code (the SDK handles the beta plumbing), but if the day 4 script fails with a permission error, your key doesn't have access yet. In that case use the **Console fallback** section at the bottom of `day4/README.md`: you'll do the same exercise by clicking through the Anthropic Console instead of running the script.

## Running exercise code

Everything runs with `tsx` from the repo root:

```sh
npx tsx day1/starter/index.ts        # your work-in-progress
npx tsx day1/solution/index.ts       # the reference solution
```

## Repository layout

```
.
├── README.md                           ← you are here
├── exercises/package.json              ← one shared workspace for all days
├── exercises/.env.example
├── exercises/smoke-test.ts
├── exercises/day1/ … day5/             ← README + starter/ + solution/ per day
└── exercises/sample-data/              ← mock booking API fixtures, bookings CSV,
                                          sample integration codebase (day 5)
```
