// Day 6 solution — the MCP client + a Claude tool loop that runs THROUGH MCP.
//
// Flow:
//   1. Connect to the MCP server (server.ts) over stdio.
//   2. Discover what it offers: listResources() + listTools().
//   3. Resource design in action — read the catalogue RESOURCE and seed it as
//      context (the app decides to include it; the model didn't have to ask).
//   4. Bridge the MCP TOOLS into Claude tools and run a tool loop, dispatching
//      every tool call back through mcp.callTool().
//
// Run: npx tsx day6/solution/index.ts "your question"
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

  // 1. Connect. The transport SPAWNS the server as a child process.
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["tsx", join(here, "server.ts")],
  });
  const mcp = new Client({ name: "cruise-client", version: "1.0.0" });
  await mcp.connect(transport);

  // 2. Discovery — never hardcode; ask the server what it has.
  const { resources } = await mcp.listResources();
  const { tools: mcpTools } = await mcp.listTools();
  console.log(`Resources: ${resources.map((r) => r.uri).join(", ") || "(none listed)"}`);
  console.log(`Tools:     ${mcpTools.map((t) => t.name).join(", ")}`);

  // 3. Read the catalogue RESOURCE and inject it as context. This is the
  //    resource/tool distinction made concrete: we (the app) chose to include
  //    the catalogue, rather than making the model call a "list everything" tool.
  const cat = await mcp.readResource({ uri: "catalogue://cruises" });
  const catalogueText = cat.contents
    .map((c) => ("text" in c ? c.text : ""))
    .join("\n");

  // 4. Bridge MCP tools → Claude tools. The MCP inputSchema IS a JSON Schema,
  //    which is exactly what Claude's tools API wants.
  const claudeTools: Anthropic.Tool[] = mcpTools.map((t) => ({
    name: t.name,
    description: t.description ?? "",
    input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
  }));

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Here is the current cruise catalogue as context:\n\n${catalogueText}\n\nQuestion: ${question}`,
    },
  ];

  // 5. Tool loop — same shape as Day 2, but every tool call is dispatched
  //    through MCP instead of a local switch statement.
  while (true) {
    const res = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      tools: claudeTools,
      messages,
    });

    if (res.stop_reason === "end_turn") {
      for (const b of res.content) if (b.type === "text") console.log(`\n${b.text}`);
      break;
    }

    messages.push({ role: "assistant", content: res.content });
    const toolUses = res.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );

    const results: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUses.map(async (u) => {
        console.log(`  ↳ mcp.callTool ${u.name}(${JSON.stringify(u.input)})`);
        const out = await mcp.callTool({
          name: u.name,
          arguments: u.input as Record<string, unknown>,
        });
        const text = (out.content as Array<{ type: string; text?: string }>)
          .filter((c) => c.type === "text")
          .map((c) => c.text)
          .join("\n");
        return {
          type: "tool_result" as const,
          tool_use_id: u.id,
          content: text,
          is_error: Boolean(out.isError),
        };
      }),
    );

    messages.push({ role: "user", content: results });
  }

  await mcp.close();
}

main();
