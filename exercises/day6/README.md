# Day 6 (Bonus) — MCP & Resource Design

Take the same cruise booking API you wrapped by hand on Days 2–3 and expose it properly, over the **Model Context Protocol (MCP)** — as a reusable server any MCP client (Claude Code, the Console, your own app) can connect to. The point of the exercise is the design decision at the heart of MCP: **what should be a _tool_ vs a _resource_?**

## Tool vs resource — the one idea to take away

| | **Resource** | **Tool** |
|---|---|---|
| Who invokes it | The **application** (you choose to include it) | The **model** (it decides to call) |
| Addressed by | A **URI** (`catalogue://cruises`) | A name + arguments |
| Side effects | None — read-only context | May compute, filter, or act |
| Good fit here | The **catalogue** (stable reference data) | **search** / **pricing** (parameterised lookups) |

Resources are context you *hand in*; tools are actions the model *reaches for*. Getting this split right is most of "resource design."

## What you're building

Two files:

- **`server.ts`** — an MCP server (`@modelcontextprotocol/sdk`) that exposes:
  - a **static resource** `catalogue://cruises` (the whole catalogue),
  - a **resource template** `catalogue://cruises/{cruiseId}` (one cruise + its itinerary),
  - two **tools** `search_cruises` and `get_pricing`.
- **`index.ts`** — an MCP client that connects to the server, **discovers** its resources and tools, **reads** the catalogue resource as context, **bridges** the MCP tools into Claude tools, and runs a tool loop where every call is dispatched through MCP.

## Setup

This day needs the MCP SDK (already added to `package.json`):

```sh
cd exercises
npm install            # pulls in @modelcontextprotocol/sdk
```

## Run it

```sh
npx tsx day6/solution/index.ts "Which Mediterranean cruise is cheapest, and what are its cabin prices?"
npx tsx day6/starter/index.ts "..."
```

`index.ts` spawns `server.ts` for you over stdio — you never launch the server by hand.

## Your task (starter)

1. **`starter/server.ts`** — register the two resources (static + template) and the two tools. Note in the code *why* each is a resource vs a tool.
2. **`starter/index.ts`** — connect, `listResources()` + `listTools()`, `readResource()` the catalogue and inject it as context, bridge tools, run the loop dispatching through `mcp.callTool(...)`.

## ⚠️ The #1 MCP gotcha

A stdio MCP server **must never write to `stdout`** — stdout *is* the protocol channel, and a stray `console.log` corrupts the JSON-RPC stream. Use `console.error` for any server-side logging. (The client, `index.ts`, is a normal program — log there however you like.)

## Stretch goals

- **Read a templated resource.** Call `mcp.readResource({ uri: "catalogue://cruises/CR-1001" })` and print the cruise + itinerary. Notice you got structured context *without* the model calling a tool.
- **Add a prompt.** MCP servers can expose **prompts** too (`server.registerPrompt`). Add a `destination_guide` prompt that takes a `region` and returns a ready-made message. Prompts are user-invoked templates — a third primitive alongside tools and resources.
- **Point Claude Code at it.** Add this server to Claude Code (`claude mcp add cruise-catalogue -- npx tsx day6/solution/server.ts`) and ask it about the catalogue — the same server, a different client.

## Cost

A couple of Opus calls per question — **well under $0.10**. The MCP layer itself is free; it's just transport. Use `claude-haiku-4-5` while iterating.
