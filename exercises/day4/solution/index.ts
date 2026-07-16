// Day 4 solution — your first Managed Agent.
// Creates an environment + a data-analyst agent, mounts the bookings CSV into a
// session, streams the analysis, and downloads the generated artifacts.
//
// Run: npx tsx day4/solution/index.ts
import "dotenv/config";
import { createReadStream } from "fs";
import { writeFile, mkdir } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";

const here = dirname(fileURLToPath(import.meta.url));
const csvPath = join(here, "..", "..", "sample-data", "bookings.csv");
const outDir = join(here, "outputs");

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a data analyst for a cruise travel company.
You work in a sandboxed container. Use Python (pandas, matplotlib) for analysis.
Always write your deliverables — charts as PNG, a written summary as summary.md —
to /mnt/session/outputs/ so they can be downloaded. Be concise in chat; put the
detail in the files.`;

async function main() {
  // --- SETUP (in real life: run once, store the ids) -----------------------
  const environment = await client.beta.environments.create({
    name: `course-day4-${Date.now()}`,
    config: { type: "cloud", networking: { type: "unrestricted" } },
  });
  console.log(`Environment: ${environment.id}`);

  const agent = await client.beta.agents.create({
    name: "Cruise Bookings Analyst",
    model: "claude-opus-4-8",
    system: SYSTEM_PROMPT,
    tools: [{ type: "agent_toolset_20260401" }], // bash, read, write, code execution, ...
  });
  console.log(`Agent: ${agent.id} (v${agent.version})`);

  // --- RUNTIME (per task) --------------------------------------------------
  const file = await client.beta.files.upload({ file: createReadStream(csvPath) });

  const session = await client.beta.sessions.create({
    agent: { type: "agent", id: agent.id, version: agent.version },
    environment_id: environment.id,
    title: "Bookings analysis",
    resources: [{ type: "file", file_id: file.id, mount_path: "/workspace/bookings.csv" }],
  });
  console.log(`Session: ${session.id}`);
  console.log(
    `Trace:   https://platform.claude.com/workspaces/default/sessions/${session.id}\n`,
  );

  // Stream FIRST, then send — the stream only delivers events after it opens.
  const stream = await client.beta.sessions.events.stream(session.id);
  await client.beta.sessions.events.send(session.id, {
    events: [
      {
        type: "user.message",
        content: [
          {
            type: "text",
            text:
              "Analyse /workspace/bookings.csv. I want: total revenue by region, " +
              "the booking channel mix (web/phone/agent), average party size, and the " +
              "cancellation rate. Produce at least two charts and a summary.md. Write " +
              "everything to /mnt/session/outputs/.",
          },
        ],
      },
    ],
  });

  for await (const event of stream) {
    switch (event.type) {
      case "agent.message":
        for (const block of event.content) {
          if (block.type === "text") process.stdout.write(block.text);
        }
        break;
      case "agent.tool_use":
        console.log(`\n  [tool: ${event.name}]`);
        break;
      case "session.status_idle":
        // Correct gate: only stop on a TERMINAL idle.
        if (event.stop_reason?.type !== "requires_action") {
          console.log("\n\n--- agent idle (done) ---");
          await downloadOutputs(session.id);
          await client.beta.sessions.delete(session.id);
          return;
        }
        break;
      case "session.status_terminated":
        console.log("\n\n--- session terminated ---");
        return;
      case "session.error":
        console.error(`\n[session error] ${JSON.stringify(event.error)}`);
        break;
    }
  }
}

async function downloadOutputs(sessionId: string) {
  await mkdir(outDir, { recursive: true });
  // Brief indexing lag between idle and outputs appearing — retry once.
  for (let attempt = 0; attempt < 3; attempt++) {
    const files = await client.beta.files.list({
      scope_id: sessionId,
      betas: ["managed-agents-2026-04-01"], // this call needs both beta headers
    });
    let count = 0;
    for await (const f of files) {
      // The list is scoped to the session, so it also includes the input file
      // we mounted — which is NOT downloadable. Only agent-generated outputs are.
      if (f.downloadable === false) continue;
      const resp = await client.beta.files.download(f.id);
      const bytes = Buffer.from(await resp.arrayBuffer());
      await writeFile(join(outDir, f.filename), bytes);
      console.log(`  saved outputs/${f.filename} (${bytes.length} bytes)`);
      count++;
    }
    if (count > 0) return;
    await new Promise((r) => setTimeout(r, 1500));
  }
  console.log("  (no output files found)");
}

main();
