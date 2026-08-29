// Day 7 starter — multi-agent orchestration. Fill in the TODOs.
// Run: npx tsx day7/starter/index.ts "Create a marketing pack for our Mediterranean cruises"
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod/v4";
import {
  searchCruises,
  getPricing,
  BookingApiError,
} from "../../sample-data/travel-api/bookingApi.js";

const client = new Anthropic();
const MODEL = "claude-opus-4-8";

// Each worker is a FULL sub-agent: its own system prompt, its own tools, its
// own message history. It returns only a compact summary to the orchestrator.

// TODO 1: researchAgent(topic) — a toolRunner with search_cruises + web_search.
//   System prompt: "cruise research specialist, produce a tight factual brief".
//   Drain the runner (for await) and return the final text.
async function researchAgent(topic: string): Promise<string> {
  void topic; void betaZodTool; void searchCruises;
  return "TODO: research brief";
}

// TODO 2: pricingAgent(region) — a toolRunner with search_cruises + get_pricing.
//   System prompt: "pricing analyst, compact markdown table of lead + cabin prices".
//   Catch BookingApiError inside get_pricing's run. Return the final text.
async function pricingAgent(region: string): Promise<string> {
  void region; void getPricing; void BookingApiError;
  return "TODO: pricing summary";
}

// TODO 3: writerAgent(brief, pricing) — client.messages.parse with a Zod
//   MarketingPack schema (headline, intro, highlights[], priceLine, cta) via
//   zodOutputFormat. Return parsed_output.
async function writerAgent(brief: string, pricing: string) {
  void brief; void pricing; void zodOutputFormat; void z;
  return { todo: "marketing pack" };
}

// TODO 4: orchestrate(goal) — expose the three workers as tools (research,
//   analyze_pricing, write_pack) on a toolRunner. System prompt: delegate each
//   step to a specialist, don't do their work yourself, present the final pack.
//   Each tool's `run` just calls the matching worker function above.
async function orchestrate(goal: string): Promise<string> {
  void goal; void researchAgent; void pricingAgent; void writerAgent; void client; void MODEL;
  return "TODO: orchestrated pack";
}

async function main() {
  const goal =
    process.argv.slice(2).join(" ") ||
    "Create a marketing pack for our Mediterranean cruises.";
  console.log(`🎯 Goal: ${goal}\n`);
  console.log(await orchestrate(goal));
}

main();
