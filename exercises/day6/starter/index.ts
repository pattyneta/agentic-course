// Day 6 starter — the MCP client + Claude tool loop. Fill in the TODOs.
// Run: npx tsx day6/starter/index.ts "your question"
import "dotenv/config";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const here = dirname(fileURLToPath(import.meta.url));
const anthropic = new Anthropic();

async function main() {
  const question =
    process.argv.slice(2).join(" ") ||
    "Using the catalogue, which Mediterranean cruise is cheapest, and what are its cabin prices?";

  // TODO 1: Connect to the MCP server over stdio.
  //   const transport = new StdioClientTransport({ command: "npx", args: ["tsx", join(here, "server.ts")] });
  //   const mcp = new Client({ name: "cruise-client", version: "1.0.0" });
  //   await mcp.connect(transport);

  // TODO 2: Discover what the server offers.
  //   const { resources } = await mcp.listResources();
  //   const { tools: mcpTools } = await mcp.listTools();
  //   Log both so you can see the server's surface.

  // TODO 3: Read the "catalogue://cruises" RESOURCE and turn its contents into
  //   a string you can inject as context.
  //   const cat = await mcp.readResource({ uri: "catalogue://cruises" });
  //   const catalogueText = cat.contents.map((c) => c.text ?? "").join("\n");

  // TODO 4: Bridge MCP tools -> Anthropic.Tool[] (name, description, input_schema).
  //   The MCP inputSchema already IS a JSON Schema.

  // TODO 5: Run the tool loop (same shape as Day 2), but dispatch each tool_use
  //   through mcp.callTool({ name, arguments }) instead of a local switch.
  //   Read out.content text blocks for the tool_result content.

  console.log("TODO: implement the MCP client + loop");
  void anthropic; void Anthropic; void Client; void StdioClientTransport; void join; void question;
}

main();
