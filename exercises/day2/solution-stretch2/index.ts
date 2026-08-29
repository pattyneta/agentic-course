// Day 2 solution — stretch goal 2: clarifying questions + a full multi-turn
// conversation loop + a terminal "thinking" spinner.
//
// Builds on the core exercise and the save_summary stretch goal by adding:
//   1. An `ask_user` tool so Claude can ask a clarifying question instead of
//      guessing when a request is ambiguous or missing details.
//   2. A REPL-style conversation loop that keeps the message history across
//      turns until you type "quit" or "exit".
//   3. A terminal spinner shown while waiting on each Claude API call
//      (no-op when stdout isn't a TTY, so piped/scripted runs stay clean).
//
// Run: npx tsx day2/solution-stretch2/index.ts "your question"
import "dotenv/config";
import { writeFile } from "fs/promises";
import { createInterface } from "readline/promises";
import { clearLine, cursorTo } from "readline";
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
      "Search the cruise catalogue by region, night count, max lead price, and/or departure port. " +
      "Call this first to find cruises matching the user's criteria. All fields are optional and combined with AND.",
    input_schema: {
      type: "object",
      properties: {
        region: { type: "string", description: "e.g. 'Mediterranean', 'Caribbean'" },
        minNights: { type: "number" },
        maxNights: { type: "number" },
        maxLeadPriceGbp: { type: "number", description: "Maximum lead-in price per person in GBP" },
        departurePort: { type: "string", description: "e.g. 'Barcelona', 'Southampton'" },
      },
      required: [],
    },
  },
  {
    name: "get_itinerary",
    description:
      "Get the day-by-day port itinerary for a specific cruise. Call this once you know the cruiseId " +
      "(e.g. from search_cruises) and the user wants to know where the ship stops or when.",
    input_schema: {
      type: "object",
      properties: {
        cruiseId: { type: "string", description: "The cruise ID, e.g. from search_cruises results" },
      },
      required: ["cruiseId"],
    },
  },
  {
    name: "get_pricing",
    description:
      "Get per-cabin-grade pricing and availability for a specific cruise. Call this once you know the " +
      "cruiseId and the user wants cabin prices or availability beyond the lead-in price.",
    input_schema: {
      type: "object",
      properties: {
        cruiseId: { type: "string", description: "The cruise ID, e.g. from search_cruises results" },
      },
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
  {
    name: "ask_user",
    description:
      "Ask the user a clarifying question when their request is ambiguous or missing details you " +
      "need to proceed — e.g. no region/budget given, or multiple cruises match and you need them " +
      "to pick one. Ask ONE specific, focused question. Do not guess when this tool is available.",
    input_schema: {
      type: "object",
      properties: {
        question: { type: "string", description: "The clarifying question to ask the user" },
      },
      required: ["question"],
    },
  },
];

const rl = createInterface({ input: process.stdin, output: process.stdout });

// A small terminal spinner shown while waiting on a Claude API call.
// No-op when stdout isn't a TTY (piped/redirected output) so it never
// garbles logs or scripted runs.
function startSpinner(label = "Thinking"): () => void {
  if (!process.stdout.isTTY) return () => {};

  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;
  process.stdout.write(`${frames[0]} ${label}...`);
  const timer = setInterval(() => {
    i = (i + 1) % frames.length;
    clearLine(process.stdout, 0);
    cursorTo(process.stdout, 0);
    process.stdout.write(`${frames[i]} ${label}...`);
  }, 80);

  return () => {
    clearInterval(timer);
    clearLine(process.stdout, 0);
    cursorTo(process.stdout, 0);
  };
}

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
      case "ask_user": {
        // Human-in-the-loop gate: pause the loop and ask the user directly,
        // then feed their answer back in as a normal (non-error) tool_result.
        const { question } = input as { question: string };
        const answer = await rl.question(`\n🤔 Claude needs clarification: ${question}\n> `);
        return { result: answer.trim(), isError: false };
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

const EXIT_WORDS = new Set(["quit", "exit"]);

// 3. Run the tool loop for one user turn: keep calling Claude and executing
//    tool_use blocks until it stops asking for tools, then return the final
//    response (having appended every intermediate turn to `messages`).
async function runTurn(messages: Anthropic.MessageParam[]): Promise<Anthropic.Message> {
  while (true) {
    const stopSpinner = startSpinner();
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      tools,
      messages,
    });
    stopSpinner();

    // Append the assistant turn BEFORE building results — the tool_result
    // blocks reference tool_use blocks that live in this message.
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason !== "tool_use") {
      return response;
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      console.log(`  ↳ ${block.name}(${JSON.stringify(block.input)})`);
      const { result, isError } = await runTool(block.name, block.input);
      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify(result),
        is_error: isError,
      });
    }

    messages.push({ role: "user", content: toolResults });
  }
}

// 4. The REPL: keep the conversation going across turns until the user quits.
async function main() {
  const initialQuestion =
    process.argv.slice(2).join(" ") ||
    "What Mediterranean cruises under £1500 are there, and what's the itinerary of the cheapest?";

  const messages: Anthropic.MessageParam[] = [];
  let userInput = initialQuestion;
  console.log(`You: ${userInput}`);

  while (true) {
    messages.push({ role: "user", content: userInput });

    const response = await runTurn(messages);

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");
    console.log(`\nClaude: ${text}\n`);

    const next = (await rl.question("You: ")).trim();
    if (EXIT_WORDS.has(next.toLowerCase())) {
      console.log("Goodbye!");
      break;
    }
    userInput = next;
  }

  rl.close();
}

main();
