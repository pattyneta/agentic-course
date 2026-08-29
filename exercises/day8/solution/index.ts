// Day 8 solution — context management & reliability.
//
// A multi-turn assistant works through a sequence of related questions over the
// booking API. Tool results (big JSON blobs) pile up, so the conversation grows.
// This exercise shows how to keep it in budget and keep it robust:
//
//   • MEASURE  — client.messages.countTokens() after each question.
//   • COMPACT  — when over budget, summarise the history into a durable note
//                and continue from the note (context compaction).
//   • RETRY    — wrap every API call in exponential backoff on transient errors.
//   • CACHE    — mark the stable system prompt cache-friendly (cheaper + steadier).
//
// Run: npx tsx day8/solution/index.ts
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import {
  searchCruises,
  getItinerary,
  getPricing,
  BookingApiError,
  type SearchCriteria,
} from "../../sample-data/travel-api/bookingApi.js";

const client = new Anthropic();
const MODEL = "claude-opus-4-8";
const TOKEN_BUDGET = 6000; // deliberately small so compaction actually triggers

// ── RELIABILITY: retry transient failures with exponential backoff. ─────────
// 429 (rate limit), 529 (overloaded), and 5xx are worth retrying; 4xx are not.
async function withRetry<T>(label: string, fn: () => Promise<T>, max = 4): Promise<T> {
  let delay = 500;
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const status = (e as { status?: number })?.status ?? 0;
      const retriable = status === 429 || status === 529 || (status >= 500 && status < 600);
      if (!retriable || attempt >= max) throw e;
      console.log(`   ⟳ ${label} failed (${status}); retry ${attempt}/${max - 1} in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2;
    }
  }
}

const SYSTEM =
  "You are a concise cruise-booking assistant. Use the tools to look up real " +
  "catalogue data before answering. Keep answers short.";
// Cache the stable system block: identical every call → served from cache.
const system: Anthropic.TextBlockParam[] = [
  { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
];

const tools: Anthropic.Tool[] = [
  {
    name: "search_cruises",
    description: "Search the catalogue by region/nights/price/departure port.",
    input_schema: {
      type: "object",
      properties: {
        region: { type: "string" },
        minNights: { type: "number" },
        maxNights: { type: "number" },
        maxLeadPriceGbp: { type: "number" },
        departurePort: { type: "string" },
      },
      required: [],
    },
  },
  {
    name: "get_itinerary",
    description: "Day-by-day itinerary for a cruiseId.",
    input_schema: { type: "object", properties: { cruiseId: { type: "string" } }, required: ["cruiseId"] },
  },
  {
    name: "get_pricing",
    description: "Cabin pricing + availability for a cruiseId.",
    input_schema: { type: "object", properties: { cruiseId: { type: "string" } }, required: ["cruiseId"] },
  },
];

async function runTool(name: string, input: unknown): Promise<{ result: unknown; isError: boolean }> {
  try {
    switch (name) {
      case "search_cruises":
        return { result: await searchCruises(input as SearchCriteria), isError: false };
      case "get_itinerary":
        return { result: await getItinerary((input as { cruiseId: string }).cruiseId), isError: false };
      case "get_pricing":
        return { result: await getPricing((input as { cruiseId: string }).cruiseId), isError: false };
      default:
        return { result: `Unknown tool: ${name}`, isError: true };
    }
  } catch (e) {
    if (e instanceof BookingApiError) return { result: `${e.code}: ${e.message}`, isError: true };
    throw e;
  }
}

// ── CONTEXT MANAGEMENT: measure, then compact when over budget. ─────────────
async function countContext(messages: Anthropic.MessageParam[]): Promise<number> {
  const { input_tokens } = await withRetry("countTokens", () =>
    client.messages.countTokens({ model: MODEL, system, tools, messages }),
  );
  return input_tokens;
}

// Compaction is done at a CLEAN boundary — between questions, when the last
// message is a finished assistant turn. That matters: you must never split a
// tool_use block from its tool_result, or the next call will 400. Here we
// summarise the ENTIRE prior history into one note and start fresh from it.
async function compact(messages: Anthropic.MessageParam[]): Promise<Anthropic.MessageParam[]> {
  const summary = await withRetry("compact", () =>
    client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system:
        "Summarise this cruise-assistant conversation into durable notes to carry " +
        "forward: what the user asked, the cruise ids and concrete facts discovered " +
        "(prices, nights, ports), and any conclusions. Be compact. Drop raw tool JSON.",
      messages: [
        ...messages,
        { role: "user", content: "Summarise everything so far as notes I can continue from." },
      ],
    }),
  );
  const note = summary.content.filter((b) => b.type === "text").map((b) => (b as Anthropic.TextBlock).text).join("\n");
  // Rebuild the history as a single note + acknowledgement — always a valid,
  // pair-complete message list.
  return [
    { role: "user", content: `Notes from earlier in this session:\n${note}` },
    { role: "assistant", content: "Understood — I'll continue with those notes in mind." },
  ];
}

async function askOneQuestion(messages: Anthropic.MessageParam[], question: string) {
  messages.push({ role: "user", content: question });
  console.log(`\n👤 ${question}`);

  while (true) {
    const res = await withRetry("assistant-turn", () =>
      client.messages.create({ model: MODEL, max_tokens: 1024, system, tools, messages }),
    );

    if (res.stop_reason === "end_turn") {
      messages.push({ role: "assistant", content: res.content });
      for (const b of res.content) if (b.type === "text") console.log(`🤖 ${b.text}`);
      return;
    }

    messages.push({ role: "assistant", content: res.content });
    const toolUses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    const results: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUses.map(async (u) => {
        console.log(`  ↳ ${u.name}(${JSON.stringify(u.input)})`);
        const { result, isError } = await runTool(u.name, u.input);
        return {
          type: "tool_result" as const,
          tool_use_id: u.id,
          content: JSON.stringify(result),
          is_error: isError,
        };
      }),
    );
    messages.push({ role: "user", content: results });
  }
}

async function main() {
  // A chain of related questions — each builds on the last, so the naïve
  // history grows fast (each tool result is a chunky JSON blob).
  const questions = [
    "What Mediterranean cruises under £1500 are there?",
    "For the cheapest of those, what's the full day-by-day itinerary?",
    "And what are its cabin prices?",
    "Now compare that cruise with the Norwegian Fjords one on price and length.",
    "Given all that, which would you recommend for a first-time cruiser and why?",
  ];

  let messages: Anthropic.MessageParam[] = [];

  for (const q of questions) {
    await askOneQuestion(messages, q);

    // Context checkpoint — measure, and compact if we've blown the budget.
    const tokens = await countContext(messages);
    if (tokens > TOKEN_BUDGET) {
      console.log(`   [context: ${tokens} tok > budget ${TOKEN_BUDGET} → compacting]`);
      messages = await compact(messages);
      console.log(`   [context after compaction: ${await countContext(messages)} tok]`);
    } else {
      console.log(`   [context: ${tokens} tok — under budget]`);
    }
  }
}

main();
