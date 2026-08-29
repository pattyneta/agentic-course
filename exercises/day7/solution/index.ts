// Day 7 solution — multi-agent orchestration (orchestrator + workers).
//
// One goal in ("Create a marketing pack for our Mediterranean cruises"), a
// finished pack out — produced by an ORCHESTRATOR that delegates to three
// SPECIALIST worker agents, each with its own system prompt, its own tools,
// and its own isolated message history.
//
//   orchestrator ──▶ research   (catalogue + web search)  → brief
//                ──▶ pricing    (booking API pricing)      → price summary
//                ──▶ writer     (structured CMS output)    → marketing pack
//
// Pattern: "agents as tools". Each worker is exposed to the orchestrator as a
// single tool; the worker runs a full sub-agent loop inside and returns only a
// compact summary. That summary — not the worker's raw tool chatter — is what
// enters the orchestrator's context, which keeps orchestration cheap.
//
// Run: npx tsx day7/solution/index.ts "Create a marketing pack for our Mediterranean cruises"
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

// ── Worker 1: research specialist ─────────────────────────────────────────
// Its own toolset (catalogue search + web search) and its own context.
async function researchAgent(topic: string): Promise<string> {
  const searchTool = betaZodTool({
    name: "search_cruises",
    description: "Search the cruise catalogue by region/price.",
    inputSchema: z.object({
      region: z.string().optional(),
      maxLeadPriceGbp: z.number().optional(),
    }),
    run: async (c) => JSON.stringify(await searchCruises(c)),
  });

  const runner = client.beta.messages.toolRunner({
    model: MODEL,
    max_tokens: 2048,
    system:
      "You are a cruise research specialist. Produce a tight, factual brief — " +
      "relevant cruises from our catalogue plus any notable current public facts " +
      "about the destinations. Bullet points, no marketing fluff.",
    tools: [searchTool, { type: "web_search_20260209", name: "web_search", max_uses: 3 }],
    messages: [{ role: "user", content: `Research brief for: ${topic}` }],
  });

  let text = "";
  for await (const m of runner) for (const b of m.content) if (b.type === "text") text = b.text;
  return text;
}

// ── Worker 2: pricing analyst ─────────────────────────────────────────────
async function pricingAgent(region: string): Promise<string> {
  const tools = [
    betaZodTool({
      name: "search_cruises",
      description: "Find cruises in a region (to get their ids).",
      inputSchema: z.object({ region: z.string().optional() }),
      run: async (c) => JSON.stringify(await searchCruises(c)),
    }),
    betaZodTool({
      name: "get_pricing",
      description: "Cabin pricing + availability for a cruiseId.",
      inputSchema: z.object({ cruiseId: z.string() }),
      run: async ({ cruiseId }) => {
        try {
          return JSON.stringify(await getPricing(cruiseId));
        } catch (e) {
          return e instanceof BookingApiError ? `${e.code}: ${e.message}` : String(e);
        }
      },
    }),
  ];

  const runner = client.beta.messages.toolRunner({
    model: MODEL,
    max_tokens: 2048,
    system:
      "You are a pricing analyst. For each cruise in the region, report the lead " +
      "price and the cabin-grade range as a compact markdown table. Numbers only, no prose.",
    tools,
    messages: [{ role: "user", content: `Summarise pricing for cruises in region: ${region}.` }],
  });

  let text = "";
  for await (const m of runner) for (const b of m.content) if (b.type === "text") text = b.text;
  return text;
}

// ── Worker 3: CMS copywriter (structured output) ──────────────────────────
const MarketingPack = z.object({
  headline: z.string().describe("Punchy, max ~70 chars"),
  intro: z.string().describe("One inviting paragraph, British English"),
  highlights: z.array(z.string()).describe("3–5 bullet selling points"),
  priceLine: z.string().describe("A single 'from £X pp' line"),
  cta: z.string().describe("One-line call to action"),
});

async function writerAgent(brief: string, pricing: string) {
  const msg = await client.messages.parse({
    model: MODEL,
    max_tokens: 2048,
    system: "You write British-English CMS marketing copy from a research brief and pricing data.",
    messages: [
      {
        role: "user",
        content: `Research brief:\n${brief}\n\nPricing:\n${pricing}\n\nWrite the marketing pack.`,
      },
    ],
    output_config: { format: zodOutputFormat(MarketingPack) },
  });
  return msg.parsed_output;
}

// ── The orchestrator ──────────────────────────────────────────────────────
// The workers are exposed to it as tools. It plans, delegates, and synthesises.
// It is told NOT to do the specialists' work itself — that separation is the
// whole point: each agent stays focused and its context stays small.
async function orchestrate(goal: string) {
  const tools = [
    betaZodTool({
      name: "research",
      description: "Delegate destination/catalogue research to the research specialist. Returns a brief.",
      inputSchema: z.object({ topic: z.string() }),
      run: async ({ topic }) => {
        console.log(`  → research(${topic})`);
        return researchAgent(topic);
      },
    }),
    betaZodTool({
      name: "analyze_pricing",
      description: "Delegate pricing analysis for a region to the pricing analyst. Returns a price summary.",
      inputSchema: z.object({ region: z.string() }),
      run: async ({ region }) => {
        console.log(`  → analyze_pricing(${region})`);
        return pricingAgent(region);
      },
    }),
    betaZodTool({
      name: "write_pack",
      description:
        "Delegate the final copywriting to the CMS writer. Provide the research brief and pricing summary text. Returns the finished pack as JSON.",
      inputSchema: z.object({ brief: z.string(), pricing: z.string() }),
      run: async ({ brief, pricing }) => {
        console.log("  → write_pack(...)");
        return JSON.stringify(await writerAgent(brief, pricing), null, 2);
      },
    }),
  ];

  const runner = client.beta.messages.toolRunner({
    model: MODEL,
    max_tokens: 4096,
    system:
      "You are an orchestrator. Break the user's goal into steps and delegate each " +
      "to a specialist tool: research first, then analyze_pricing, then write_pack " +
      "with both results. Do NOT do the specialists' work yourself. End by presenting " +
      "the finished marketing pack to the user.",
    tools,
    messages: [{ role: "user", content: goal }],
  });

  let text = "";
  for await (const m of runner) for (const b of m.content) if (b.type === "text") text = b.text;
  return text;
}

async function main() {
  const goal =
    process.argv.slice(2).join(" ") ||
    "Create a marketing pack for our Mediterranean cruises.";
  console.log(`🎯 Goal: ${goal}\n`);
  const pack = await orchestrate(goal);
  console.log(`\n=== Orchestrator output ===\n${pack}`);
}

main();
