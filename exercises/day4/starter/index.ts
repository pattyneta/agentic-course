// Day 4 starter — your first Managed Agent.
// Fill in the TODOs. Run: npx tsx day4/starter/index.ts
import "dotenv/config";
import { createReadStream } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";

const here = dirname(fileURLToPath(import.meta.url));
const csvPath = join(here, "..", "..", "sample-data", "bookings.csv");

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a data analyst for a cruise travel company.
Use Python (pandas, matplotlib) in your sandbox. Write all deliverables (charts as
PNG, a summary.md) to /mnt/session/outputs/ so they can be downloaded.`;

async function main() {
  // TODO 1: create a cloud environment.
  //   const environment = await client.beta.environments.create({
  //     name: `course-day4-${Date.now()}`,
  //     config: { type: "cloud", networking: { type: "unrestricted" } },
  //   });

  // TODO 2: create the agent (model, system: SYSTEM_PROMPT, tools: agent_toolset_20260401).
  //   const agent = await client.beta.agents.create({ ... });

  // TODO 3: upload the CSV and create a session with it mounted.
  //   const file = await client.beta.files.upload({ file: createReadStream(csvPath) });
  //   const session = await client.beta.sessions.create({
  //     agent: { type: "agent", id: agent.id, version: agent.version },
  //     environment_id: environment.id,
  //     resources: [{ type: "file", file_id: file.id, mount_path: "/workspace/bookings.csv" }],
  //   });
  //   console.log(`Trace: https://platform.claude.com/workspaces/default/sessions/${session.id}`);

  // TODO 4: STREAM FIRST, then send the analysis request.
  //   const stream = await client.beta.sessions.events.stream(session.id);
  //   await client.beta.sessions.events.send(session.id, {
  //     events: [{ type: "user.message", content: [{ type: "text", text: "Analyse /workspace/bookings.csv ..." }] }],
  //   });

  // TODO 5: loop the stream. Print agent.message text; on session.status_idle,
  //   break ONLY if event.stop_reason?.type !== "requires_action"; also break on terminated.

  // TODO 6: after idle, list files with { scope_id: session.id, betas: ["managed-agents-2026-04-01"] }
  //   and download each. Then delete the session.
  //   GOTCHA: the list also includes the input CSV you mounted, which is NOT
  //   downloadable. Skip it with `if (f.downloadable === false) continue;`
  //   (downloading a non-downloadable file 400s).

  console.log("TODO: implement the Managed Agents flow");
  void createReadStream; void csvPath; void SYSTEM_PROMPT; void client;
}

main();
