# Day 8 (Bonus) — Context Management & Reliability

An agent that answers one question is easy. An agent that holds a *conversation* — turn after turn, each dragging in another chunky tool result — eventually overflows its context window, gets slower and pricier, and falls over on the first rate-limit blip. This exercise makes a multi-turn cruise assistant **stay in budget** and **stay up**.

Four techniques, all in `day8/solution/index.ts`:

| | Technique | What it does |
|---|---|---|
| **Measure** | `client.messages.countTokens()` | Know your context size *before* you send — no guessing. |
| **Compact** | Summarise old turns → a note | Replace a bloated history with durable notes and continue. |
| **Retry** | Exponential backoff on 429/529/5xx | Survive transient API failures instead of crashing. |
| **Cache** | `cache_control` on the system block | Stable prompt served from cache — cheaper and steadier. |

## What you're building

A script that runs a **chain of five related questions** over the booking API. Each answer builds on the last, so the naïve message history grows fast. After every question the script:

1. **counts** the context tokens, and
2. if it's over a (deliberately small) budget, **compacts** the whole history into a short note and continues from there.

Every API call is wrapped in `withRetry(...)`, and the system prompt is cache-marked.

## Run it

```sh
cd exercises
npx tsx day8/solution/index.ts
```

Watch the `[context: N tok]` lines climb, then a `→ compacting` line, then the count drop. That's context management working live.

## Your task (starter)

Open `day8/starter/index.ts` and implement the five TODOs:

1. `withRetry` — backoff on transient (429/529/5xx) errors only.
2. Make the system block **cache-friendly** (`cache_control: { type: "ephemeral" }`).
3. `countContext` — `countTokens(...)` → `input_tokens`.
4. `compact` — summarise the history into a note; return a fresh, valid 2-message list.
5. In the loop — measure after each question, and compact when over `TOKEN_BUDGET`.

## ⚠️ The compaction trap

You can only compact at a **clean boundary** — between questions, when the last message is a finished assistant turn. **Never** slice a message list in a way that separates a `tool_use` block from its matching `tool_result`, or the next call fails with a 400. The solution sidesteps this by summarising the *entire* prior history into one note and starting fresh — always pair-complete, always valid.

## Stretch goals

- **Keep-recent + summarise-old.** Instead of summarising everything, keep the last question/answer verbatim and summarise only what came before. Careful: preserve tool_use/tool_result pairing in what you keep.
- **Trim tool results.** The real bloat is big JSON tool results. Before compaction kicks in, replace *old* tool_result contents with a one-line stub (`"[pricing for CR-2001 — omitted]"`) while keeping recent ones full. Measure the savings.
- **Prove the cache hit.** Log `usage.cache_read_input_tokens` each turn (as in Day 1) and confirm the cached system block is being reused.
- **Inject a failure.** Temporarily make `withRetry` throw a fake `{ status: 529 }` on the first attempt and watch the backoff recover — then confirm a `{ status: 400 }` is *not* retried.

## Cost

Five questions plus tool calls and a compaction summary — a handful of Opus calls, **around $0.10–0.20**. `countTokens` is free. Use `claude-haiku-4-5` while iterating.
