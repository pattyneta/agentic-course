// Day 8 starter — context management & reliability. Fill in the TODOs.
// Run: npx tsx day8/starter/index.ts
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
const TOKEN_BUDGET = 6000; // small on purpose so compaction triggers

// TODO 1 (RELIABILITY): implement withRetry — call fn(), and on a transient
//   error (status 429, 529, or 5xx) wait with exponential backoff and retry,
//   up to `max` attempts. Re-throw anything non-retriable or once out of tries.
async function withRetry<T>(label: string, fn: () => Promise<T>, max = 4): Promise<T> {
  void label; void max;
  return fn(); // TODO: wrap with backoff
}

const SYSTEM = "You are a concise cruise-booking assistant. Use tools before answering. Keep answers short.";
// TODO 2 (CACHING): make this a cache-friendly system block:
//   [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }]
const system: Anthropic.TextBlockParam[] = [{ type: "text", text: SYSTEM }];

const tools: Anthropic.Tool[] = [
  { name: "search_cruises", description: "Search the catalogue.", input_schema: { type: "object", properties: { region: { type: "string" }, maxLeadPriceGbp: { type: "number" } }, required: [] } },
  { name: "get_itinerary", description: "Itinerary for a cruiseId.", input_schema: { type: "object", properties: { cruiseId: { type: "string" } }, required: ["cruiseId"] } },
  { name: "get_pricing", description: "Pricing for a cruiseId.", input_schema: { type: "object", properties: { cruiseId: { type: "string" } }, required: ["cruiseId"] } },
];

async function runTool(name: string, input: unknown): Promise<{ result: unknown; isError: boolean }> {
  try {
    switch (name) {
      case "search_cruises": return { result: await searchCruises(input as SearchCriteria), isError: false };
      case "get_itinerary": return { result: await getItinerary((input as { cruiseId: string }).cruiseId), isError: false };
      case "get_pricing": return { result: await getPricing((input as { cruiseId: string }).cruiseId), isError: false };
      default: return { result: `Unknown tool: ${name}`, isError: true };
    }
  } catch (e) {
    if (e instanceof BookingApiError) return { result: `${e.code}: ${e.message}`, isError: true };
    throw e;
  }
}

// TODO 3 (MEASURE): count the tokens of the current context.
//   Use client.messages.countTokens({ model, system, tools, messages }) and
//   return input_tokens. Wrap it in withRetry.
async function countContext(messages: Anthropic.MessageParam[]): Promise<number> {
  void messages; void client;
  return 0; // TODO
}

// TODO 4 (COMPACT): summarise the whole history into a durable note, then
//   return a fresh 2-message list: a user "Notes from earlier..." message and a
//   short assistant acknowledgement. Compact only at a clean boundary (between
//   questions) so you never split a tool_use from its tool_result.
async function compact(messages: Anthropic.MessageParam[]): Promise<Anthropic.MessageParam[]> {
  return messages; // TODO
}

async function askOneQuestion(messages: Anthropic.MessageParam[], question: string) {
  messages.push({ role: "user", content: question });
  console.log(`\n👤 ${question}`);
  // Standard tool loop (from Day 2). Wrap the create() call in withRetry.
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
    const uses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    const results: Anthropic.ToolResultBlockParam[] = await Promise.all(
      uses.map(async (u) => {
        console.log(`  ↳ ${u.name}(${JSON.stringify(u.input)})`);
        const { result, isError } = await runTool(u.name, u.input);
        return { type: "tool_result" as const, tool_use_id: u.id, content: JSON.stringify(result), is_error: isError };
      }),
    );
    messages.push({ role: "user", content: results });
  }
}

async function main() {
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
    // TODO 5: measure, and if over TOKEN_BUDGET, compact. Log the before/after.
    const tokens = await countContext(messages);
    console.log(`   [context: ${tokens} tok]`);
    if (tokens > TOKEN_BUDGET) messages = await compact(messages);
  }
}

main();
