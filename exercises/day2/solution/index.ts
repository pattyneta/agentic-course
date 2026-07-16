// Day 2 solution — manual tool-use loop over the mock booking API.
// Includes the stretch goal: a confirmation-gated save_summary tool.
//
// Run: npx tsx day2/solution/index.ts "your question"
import "dotenv/config";
import { writeFile } from "fs/promises";
import { createInterface } from "readline/promises";
import Anthropic from "@anthropic-ai/sdk";
import {
  searchCruises,
  getItinerary,
  getPricing,
  BookingApiError,
  type SearchCriteria,
} from "../../sample-data/travel-api/bookingApi.js";

const client = new Anthropic();

// 1. Tool definitions. Descriptions say WHEN to call, not just what they do.
const tools: Anthropic.Tool[] = [
  {
    name: "search_cruises",
    description:
      "Search the cruise catalogue. Call this whenever the user asks what cruises " +
      "are available or wants to filter by region, length, price, or departure port. " +
      "Returns a list of matching cruises with their ids.",
    input_schema: {
      type: "object",
      properties: {
        region: { type: "string", description: "e.g. 'Mediterranean', 'Caribbean', 'Northern Europe'" },
        minNights: { type: "number", description: "Minimum length in nights" },
        maxNights: { type: "number", description: "Maximum length in nights" },
        maxLeadPriceGbp: { type: "number", description: "Maximum lead price per person in GBP" },
        departurePort: { type: "string", description: "e.g. 'Southampton', 'Miami'" },
      },
      required: [],
    },
  },
  {
    name: "get_itinerary",
    description:
      "Get the day-by-day port itinerary for a specific cruise. Call this after a " +
      "search when the user asks where a cruise goes or wants the route. Needs a cruiseId " +
      "from search_cruises.",
    input_schema: {
      type: "object",
      properties: { cruiseId: { type: "string", description: "e.g. 'CR-1001'" } },
      required: ["cruiseId"],
    },
  },
  {
    name: "get_pricing",
    description:
      "Get per-cabin-grade pricing and availability for a specific cruise. Call this " +
      "when the user asks about cabin prices, availability, or wants to compare grades. " +
      "Needs a cruiseId from search_cruises.",
    input_schema: {
      type: "object",
      properties: { cruiseId: { type: "string", description: "e.g. 'CR-1001'" } },
      required: ["cruiseId"],
    },
  },
  {
    name: "save_summary",
    description:
      "Save your final answer to a text file for the user. Only call this if the user " +
      "explicitly asks to save or export the answer.",
    input_schema: {
      type: "object",
      properties: {
        filename: { type: "string", description: "A short .txt filename" },
        content: { type: "string", description: "The full text to write" },
      },
      required: ["filename", "content"],
    },
  },
];

const rl = createInterface({ input: process.stdin, output: process.stdout });

// 2. Tool dispatcher — this is where YOUR code runs, with YOUR credentials.
async function runTool(name: string, input: unknown): Promise<{ result: unknown; isError: boolean }> {
  try {
    switch (name) {
      case "search_cruises":
        return { result: await searchCruises(input as SearchCriteria), isError: false };
      case "get_itinerary":
        return { result: await getItinerary((input as { cruiseId: string }).cruiseId), isError: false };
      case "get_pricing":
        return { result: await getPricing((input as { cruiseId: string }).cruiseId), isError: false };
      case "save_summary": {
        const { filename, content } = input as { filename: string; content: string };
        // Human-in-the-loop gate: writing a file is a side effect, so confirm first.
        const answer = await rl.question(`\n⚠️  Claude wants to write "${filename}". Allow? (y/N) `);
        if (answer.trim().toLowerCase() !== "y") {
          return { result: "User declined to save the file.", isError: true };
        }
        await writeFile(filename, content, "utf-8");
        return { result: `Saved ${filename}.`, isError: false };
      }
      default:
        return { result: `Unknown tool: ${name}`, isError: true };
    }
  } catch (e) {
    if (e instanceof BookingApiError) {
      return { result: `${e.code}: ${e.message}`, isError: true };
    }
    throw e;
  }
}

async function main() {
  const question = process.argv.slice(2).join(" ") ||
    "What Mediterranean cruises under £1500 are there, and what's the itinerary of the cheapest?";

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: question }];

  // 3. The loop.
  while (true) {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      tools,
      messages,
    });

    if (response.stop_reason === "end_turn") {
      for (const block of response.content) {
        if (block.type === "text") console.log(`\n${block.text}`);
      }
      break;
    }

    // Append the assistant turn BEFORE building results — the tool_result
    // blocks reference tool_use blocks that live in this message.
    messages.push({ role: "assistant", content: response.content });

    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );

    // Run tools concurrently, then return all results in one user message.
    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUses.map(async (block) => {
        console.log(`  ↳ ${block.name}(${JSON.stringify(block.input)})`);
        const { result, isError } = await runTool(block.name, block.input);
        return {
          type: "tool_result" as const,
          tool_use_id: block.id,
          content: JSON.stringify(result),
          is_error: isError,
        };
      }),
    );

    messages.push({ role: "user", content: toolResults });
  }

  rl.close();
}

main();
