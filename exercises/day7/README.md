# Day 7 (Bonus) — Multi-Agent Orchestration

One agent doing everything gets confused, bloated, and hard to steer. This exercise splits the work across an **orchestrator** and three focused **worker agents**, each with its own job, its own tools, and its own context — the pattern behind almost every serious agent system.

You give the orchestrator one goal — *"Create a marketing pack for our Mediterranean cruises"* — and it delegates:

```
orchestrator ──▶ research   (catalogue + web search)  → brief
             ──▶ pricing    (booking API pricing)      → price summary
             ──▶ writer     (structured CMS output)    → marketing pack
```

## The pattern: agents as tools

Each worker is exposed to the orchestrator as a **single tool**. When the orchestrator calls `research(...)`, that tool runs a *complete sub-agent loop* inside — its own `toolRunner`, its own system prompt, its own tool calls — and returns only a **compact summary**.

Two ideas make this work:

1. **Context isolation.** The research agent's messy tool-call transcript never enters the orchestrator's context — only its final brief does. Each agent stays focused and cheap. (This is the same lesson as Day 8: keep context small on purpose.)
2. **Specialisation.** A tight system prompt + a small toolset beats one agent with ten tools and a paragraph of instructions.

## What you're building

`day7/solution/index.ts` has four pieces:

- `researchAgent(topic)` — `toolRunner` with `search_cruises` + `web_search`.
- `pricingAgent(region)` — `toolRunner` with `search_cruises` + `get_pricing`.
- `writerAgent(brief, pricing)` — `messages.parse` with a Zod `MarketingPack` schema (structured output, straight from Day 1).
- `orchestrate(goal)` — a `toolRunner` whose tools ARE the three workers.

## Run it

```sh
cd exercises
npx tsx day7/solution/index.ts "Create a marketing pack for our Mediterranean cruises"
npx tsx day7/starter/index.ts "..."
```

Watch the `→ research(...)`, `→ analyze_pricing(...)`, `→ write_pack(...)` lines: that's the orchestrator delegating in real time.

## Your task (starter)

Open `day7/starter/index.ts` and implement the four TODOs — the three workers, then the orchestrator that delegates to them. Each worker returns a compact string/object; the orchestrator never does a specialist's work itself.

## Stretch goals

- **Parallel fan-out.** Research and pricing are independent — run them with `Promise.all([...])` instead of sequentially, then feed both into the writer. Note the wall-clock drop. (Do this in a hand-written orchestrator function rather than the model-driven runner, so *you* control the concurrency.)
- **Add a critic agent.** After `write_pack`, add a `review_pack` worker that scores the pack against a rubric (on-brand? price accurate? British English?) and returns `pass` / specific fixes. Loop: if it fails, re-run the writer with the feedback. This is the evaluator–optimiser pattern.
- **Return structured hand-offs.** Give each worker a Zod output schema so hand-offs between agents are typed, not free text — easier to validate and debug.

## Cost

Several Opus calls fan out across the workers (plus a little web search). Budget **around $0.30–0.60** per full run. Use `claude-haiku-4-5` for the workers while iterating and keep `web_search` `max_uses` low.
