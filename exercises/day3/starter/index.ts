// Day 3 starter — rebuild the Day 2 agent on the Tool Runner, add web search.
// Fill in the TODOs. Run: npx tsx day3/starter/index.ts "your question"
import "dotenv/config";
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

// TODO 1: Define the three booking tools with betaZodTool.
//   Each has { name, description, inputSchema, run }.
//   run is the implementation — call the API function and return JSON.stringify(result).
//   Catch BookingApiError in get_itinerary / get_pricing and return an error string.
const searchTool = betaZodTool({
  name: "search_cruises",
  description: "TODO: say when to call this",
  inputSchema: z.object({
    region: z.string().optional(),
    // ...add the rest
  }),
  run: async (criteria) => JSON.stringify(await searchCruises(criteria)),
});

// const itineraryTool = betaZodTool({ ... getItinerary ... });
// const pricingTool = betaZodTool({ ... getPricing ... });

async function main() {
  const question =
    process.argv.slice(2).join(" ") ||
    "Compare the Norwegian Fjords and Baltic Capitals cruises";

  // TODO 2: Create the runner with your tools PLUS the web search declaration:
  //   { type: "web_search_20260209", name: "web_search", max_uses: 5 }
  //
  // const runner = client.beta.messages.toolRunner({
  //   model: "claude-opus-4-8",
  //   max_tokens: 4096,
  //   tools: [searchTool, itineraryTool, pricingTool, { type: "web_search_20260209", name: "web_search", max_uses: 5 }],
  //   messages: [{ role: "user", content: question }],
  // });

  // TODO 3: await the runner and print the final text.
  //   const finalMessage = await runner;
  //   for (const block of finalMessage.content) if (block.type === "text") console.log(block.text);

  // TODO 4 (optional): iterate `for await (const message of runner)` to log each turn.

  console.log("TODO: build and run the tool runner");
  void searchTool; void getItinerary; void getPricing; void BookingApiError; void question;
}

main();
