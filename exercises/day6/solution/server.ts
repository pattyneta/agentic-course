// Day 6 solution — the MCP server.
// Wraps the same mock booking API from Days 2–3, but exposes it over the
// Model Context Protocol: some things as TOOLS (model-invoked actions) and
// some as RESOURCES (app-chosen context, addressed by a URI).
//
// This file is spawned by index.ts over stdio — you don't run it directly.
//
// ⚠️  MCP RULE: a stdio server must NEVER write to stdout — stdout IS the
//     protocol channel. Use console.error for any debugging.
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  searchCruises,
  getItinerary,
  getPricing,
  BookingApiError,
  type Cruise,
} from "../../sample-data/travel-api/bookingApi.js";

const here = dirname(fileURLToPath(import.meta.url));
const catalogue: Cruise[] = JSON.parse(
  readFileSync(join(here, "..", "..", "sample-data", "travel-api", "cruises.json"), "utf-8"),
);

const server = new McpServer({ name: "cruise-catalogue", version: "1.0.0" });

// ── RESOURCES ────────────────────────────────────────────────────────────
// A resource is CONTEXT the application chooses to include. It's addressed by
// a URI, it's read-only, and reading it must have no side effects. Use a
// resource (not a tool) when the data is stable reference material the client
// might want to seed into the prompt — here, the catalogue itself.

// Static resource: one fixed URI.
server.registerResource(
  "catalogue",
  "catalogue://cruises",
  {
    title: "Cruise catalogue",
    description: "The full list of cruises (id, name, region, nights, lead price).",
    mimeType: "application/json",
  },
  async (uri) => ({
    contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(catalogue) }],
  }),
);

// Resource TEMPLATE: a family of URIs parameterised by cruiseId. This is
// resource design — one addressable resource per cruise, itinerary included.
server.registerResource(
  "cruise",
  new ResourceTemplate("catalogue://cruises/{cruiseId}", { list: undefined }),
  {
    title: "Single cruise",
    description: "One cruise plus its day-by-day itinerary, addressed by id.",
    mimeType: "application/json",
  },
  async (uri, { cruiseId }) => {
    const cruise = catalogue.find((c) => c.cruiseId === cruiseId);
    if (!cruise) throw new Error(`No cruise with id ${cruiseId}`);
    const itinerary = await getItinerary(String(cruiseId));
    return {
      contents: [
        { uri: uri.href, mimeType: "application/json", text: JSON.stringify({ ...cruise, itinerary }) },
      ],
    };
  },
);

// ── TOOLS ────────────────────────────────────────────────────────────────
// A tool is an ACTION the model decides to invoke. Use a tool (not a resource)
// when the operation takes arguments and computes/filters — here, search and
// pricing lookups.
server.registerTool(
  "search_cruises",
  {
    title: "Search cruises",
    description: "Filter the catalogue by region, nights, price, or departure port.",
    inputSchema: {
      region: z.string().optional(),
      minNights: z.number().optional(),
      maxNights: z.number().optional(),
      maxLeadPriceGbp: z.number().optional(),
      departurePort: z.string().optional(),
    },
  },
  async (args) => ({
    content: [{ type: "text", text: JSON.stringify(await searchCruises(args)) }],
  }),
);

server.registerTool(
  "get_pricing",
  {
    title: "Get pricing",
    description: "Per-cabin-grade pricing and availability for a cruise id.",
    inputSchema: { cruiseId: z.string() },
  },
  async ({ cruiseId }) => {
    try {
      return { content: [{ type: "text", text: JSON.stringify(await getPricing(cruiseId)) }] };
    } catch (e) {
      const msg = e instanceof BookingApiError ? `${e.code}: ${e.message}` : String(e);
      return { content: [{ type: "text", text: msg }], isError: true };
    }
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[cruise-catalogue MCP server] connected over stdio");
