// Day 2 starter — manual tool-use loop over the mock booking API.
// Fill in the TODOs. Run: npx tsx day2/starter/index.ts "your question"
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

// TODO 1: Define three tools wrapping searchCruises / getItinerary / getPricing.
//   Each is an Anthropic.Tool: { name, description, input_schema }.
//   Make the descriptions say WHEN to call the tool.
//   - search_cruises: optional region/minNights/maxNights/maxLeadPriceGbp/departurePort
//   - get_itinerary:  required cruiseId
//   - get_pricing:    required cruiseId
const tools: Anthropic.Tool[] = [
  // { name: "search_cruises", description: "...", input_schema: { type: "object", properties: { ... }, required: [] } },
];

// TODO 2: Dispatch a tool call to the matching API function.
//   Catch BookingApiError and return { result, isError: true } instead of throwing.
async function runTool(
  name: string,
  input: unknown,
): Promise<{ result: unknown; isError: boolean }> {
  // switch (name) { case "search_cruises": return { result: await searchCruises(input as SearchCriteria), isError: false }; ... }
  return { result: `TODO: implement ${name}`, isError: true };
}

async function main() {
  const question =
    process.argv.slice(2).join(" ") ||
    "What Mediterranean cruises under £1500 are there, and what's the itinerary of the cheapest?";

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: question }];

  // TODO 3: Implement the loop.
  //   1. client.messages.create({ model, max_tokens, tools, messages })
  //   2. if response.stop_reason === "end_turn": print text blocks and break
  //   3. push { role: "assistant", content: response.content }
  //   4. for each tool_use block: run it, collect a tool_result
  //      { type: "tool_result", tool_use_id: block.id, content: JSON.stringify(result), is_error }
  //   5. push { role: "user", content: toolResults } and loop

  console.log("TODO: implement the tool loop");
  // Suppress "unused import" noise while you scaffold — delete once you use them.
  void searchCruises; void getItinerary; void getPricing; void BookingApiError;
  void tools; void runTool; void messages;
  void (null as unknown as SearchCriteria);
}

main();
