// Day 3 solution — the Day 2 agent, rebuilt on the Tool Runner, plus web search
// and a confirmation-gated save_guide tool (stretch).
//
// Run: npx tsx day3/solution/index.ts "your question"
import "dotenv/config";
import { writeFile } from "fs/promises";
import { createInterface } from "readline/promises";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod/v4";
import {
  searchCruises,
  getItinerary,
  getPricing,
  BookingApiError,
} from "../../sample-data/travel-api/bookingApi.js";

const client = new Anthropic();
const rl = createInterface({ input: process.stdin, output: process.stdout });

// Client-side tools: schema + the implementation, in one place.
// The whole Day 2 loop is gone — the runner does it.
const searchTool = betaZodTool({
  name: "search_cruises",
  description:
    "Search the cruise catalogue. Call this when the user asks what cruises are available " +
    "or wants to filter by region, length, price, or departure port.",
  inputSchema: z.object({
    region: z.string().optional(),
    minNights: z.number().optional(),
    maxNights: z.number().optional(),
    maxLeadPriceGbp: z.number().optional(),
    departurePort: z.string().optional(),
  }),
  run: async (criteria) => {
    console.log(`  ↳ search_cruises(${JSON.stringify(criteria)})`);
    return JSON.stringify(await searchCruises(criteria));
  },
});

const itineraryTool = betaZodTool({
  name: "get_itinerary",
  description:
    "Get the day-by-day port itinerary for a cruise. Call this after a search when the " +
    "user asks where a cruise goes. Needs a cruiseId from search_cruises.",
  inputSchema: z.object({ cruiseId: z.string() }),
  run: async ({ cruiseId }) => {
    console.log(`  ↳ get_itinerary(${cruiseId})`);
    try {
      return JSON.stringify(await getItinerary(cruiseId));
    } catch (e) {
      if (e instanceof BookingApiError) return `Error: ${e.code} — ${e.message}`;
      throw e;
    }
  },
});

const pricingTool = betaZodTool({
  name: "get_pricing",
  description:
    "Get per-cabin-grade pricing and availability for a cruise. Call this when the user " +
    "asks about cabin prices or availability. Needs a cruiseId from search_cruises.",
  inputSchema: z.object({ cruiseId: z.string() }),
  run: async ({ cruiseId }) => {
    console.log(`  ↳ get_pricing(${cruiseId})`);
    try {
      return JSON.stringify(await getPricing(cruiseId));
    } catch (e) {
      if (e instanceof BookingApiError) return `Error: ${e.code} — ${e.message}`;
      throw e;
    }
  },
});

// Stretch: the approval gate lives INSIDE the tool — no manual loop needed.
const saveGuideTool = betaZodTool({
  name: "save_guide",
  description:
    "Save the finished destination guide to a text file. Only call this if the user asks to save or export.",
  inputSchema: z.object({ filename: z.string(), content: z.string() }),
  run: async ({ filename, content }) => {
    const answer = await rl.question(`\n⚠️  Claude wants to write "${filename}". Allow? (y/N) `);
    if (answer.trim().toLowerCase() !== "y") return "User declined to save the file.";
    await writeFile(filename, content, "utf-8");
    return `Saved ${filename}.`;
  },
});

async function main() {
  const question =
    process.argv.slice(2).join(" ") ||
    "Compare the Norwegian Fjords and Baltic Capitals cruises, and add any current public travel notes for the regions.";

  const runner = client.beta.messages.toolRunner({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    tools: [
      searchTool,
      itineraryTool,
      pricingTool,
      saveGuideTool,
      // Server-side tool: declared, not implemented. Claude runs it on Anthropic's side.
      { type: "web_search_20260209", name: "web_search", max_uses: 5 },
    ],
    messages: [{ role: "user", content: question }],
  });

  // Iterate to watch each turn; the final message is the last one.
  let finalText = "";
  for await (const message of runner) {
    for (const block of message.content) {
      if (block.type === "text") finalText = block.text;
      if (block.type === "server_tool_use" && block.name === "web_search") {
        console.log(`  ↳ web_search(${JSON.stringify(block.input)})`);
      }
    }
  }

  console.log(`\n${finalText}`);
  rl.close();
}

main();
