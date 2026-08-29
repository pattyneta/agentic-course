// Day 6 starter — the MCP server. Fill in the TODOs.
// Spawned by index.ts over stdio; you don't run this file directly.
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

// TODO 1: Register a STATIC resource at URI "catalogue://cruises".
//   Ask yourself: why is the catalogue a resource, not a tool? (It's stable,
//   read-only reference context the client may want to seed into the prompt.)
//   server.registerResource("catalogue", "catalogue://cruises",
//     { title, description, mimeType: "application/json" },
//     async (uri) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(catalogue) }] }));

// TODO 2: Register a resource TEMPLATE at "catalogue://cruises/{cruiseId}".
//   Return that cruise merged with its getItinerary(cruiseId) result.
//   Use: new ResourceTemplate("catalogue://cruises/{cruiseId}", { list: undefined })
//   Handler signature: async (uri, { cruiseId }) => ({ contents: [...] })

// TODO 3: Register a TOOL "search_cruises".
//   Why a tool, not a resource? (It takes arguments and computes a filtered result.)
//   inputSchema is a RAW zod shape (an object of zod fields), e.g.
//     { region: z.string().optional(), maxLeadPriceGbp: z.number().optional(), ... }
//   Handler returns { content: [{ type: "text", text: JSON.stringify(await searchCruises(args)) }] }.

// TODO 4: Register a TOOL "get_pricing" (inputSchema { cruiseId: z.string() }).
//   Catch BookingApiError and return { content: [...], isError: true }.

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[cruise-catalogue MCP server] connected — but no tools/resources registered yet!");

// Suppress unused-import noise while scaffolding — delete as you implement.
void searchCruises; void getItinerary; void getPricing; void BookingApiError;
void ResourceTemplate; void z; void catalogue;
