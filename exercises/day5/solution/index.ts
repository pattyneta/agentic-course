// Day 5 capstone solution — a production-shaped code-review agent.
// Audits the sample integration service against an outcome rubric and delivers
// its report through a custom tool the terminal handles.
//
// Run: npx tsx day5/solution/index.ts
import "dotenv/config";
import { createReadStream } from "fs";
import { readdir } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";

const here = dirname(fileURLToPath(import.meta.url));
const serviceDir = join(here, "..", "..", "sample-data", "integration-service");

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a senior code reviewer. You audit third-party API
integration code for reliability, security, and correctness bugs. Read every file
in /workspace/service/ before concluding. Be specific: name the file, the problem,
why it matters, and the fix. When your review is complete, deliver it by calling
the post_review_summary tool exactly once — that is the only way your report reaches
the team.`;

// The rubric is the spec the grader holds the review to. Explicit, checkable items.
const REVIEW_RUBRIC = `A thorough review of this supplier→CMS integration must identify:
1. The unbounded recursive retry in supplierClient.ts request() — it retries forever on
   any non-OK response, risking a stack overflow and hammering the supplier.
2. The API key sent as a URL query parameter in supplierClient.ts — it leaks into logs
   and proxies; it belongs in a header.
3. The hardcoded 'sk_live_...' fallback API key in config.ts — a live secret in source.
4. The missing webhook signature verification in webhookHandler.ts — the endpoint creates
   real bookings from unauthenticated, forgeable requests.
5. The pagination bug in sync.ts — it only ever fetches page 1, so most cruises never sync.
6. The swallowed error and unused 'failed' counter in sync.ts — failures are hidden.

The review passes only if it clearly flags at least items 1–5 with a correct explanation
and a concrete fix for each.`;

async function mountServiceFiles() {
  const names = (await readdir(serviceDir)).filter((n) => /\.(ts|md)$/.test(n));
  const resources = [];
  for (const name of names) {
    const file = await client.beta.files.upload({ file: createReadStream(join(serviceDir, name)) });
    resources.push({ type: "file" as const, file_id: file.id, mount_path: `/workspace/service/${name}` });
  }
  return resources;
}

async function main() {
  const environment = await client.beta.environments.create({
    name: `course-day5-${Date.now()}`,
    config: { type: "cloud", networking: { type: "unrestricted" } },
  });

  const agent = await client.beta.agents.create({
    name: "Integration Code Reviewer",
    model: "claude-opus-4-8",
    system: SYSTEM_PROMPT,
    tools: [
      { type: "agent_toolset_20260401" },
      {
        type: "custom",
        name: "post_review_summary",
        description:
          "Deliver the finished code review. Call this exactly once, at the end, with the " +
          "full review as markdown. This is the only way your report reaches the team.",
        input_schema: {
          type: "object",
          properties: { markdown: { type: "string", description: "The full review in markdown" } },
          required: ["markdown"],
        },
      },
    ],
  });

  const resources = await mountServiceFiles();

  const session = await client.beta.sessions.create({
    agent: { type: "agent", id: agent.id, version: agent.version },
    environment_id: environment.id,
    title: "Integration service review",
    resources,
  });
  console.log(`Session: ${session.id}`);
  console.log(`Trace:   https://platform.claude.com/workspaces/default/sessions/${session.id}\n`);

  // Stream first, then define the outcome. The outcome IS the kickoff — no user.message.
  const stream = await client.beta.sessions.events.stream(session.id);
  await client.beta.sessions.events.send(session.id, {
    events: [
      {
        type: "user.define_outcome",
        description: "Review the integration service in /workspace/service/ for reliability, security, and correctness bugs.",
        rubric: { type: "text", content: REVIEW_RUBRIC },
        max_iterations: 3,
      },
    ],
  });

  for await (const event of stream) {
    switch (event.type) {
      case "agent.custom_tool_use":
        if (event.name === "post_review_summary") {
          // Your orchestrator handles the report — e.g. post to Slack or a PR comment.
          const { markdown } = event.input as { markdown: string };
          console.log("\n=== REVIEW DELIVERED ===\n");
          console.log(markdown);
          await client.beta.sessions.events.send(session.id, {
            events: [
              {
                type: "user.custom_tool_result",
                custom_tool_use_id: event.id,
                content: [{ type: "text", text: "Review received and posted to the team channel." }],
              },
            ],
          });
        }
        break;
      case "agent.tool_use":
        process.stdout.write(`  [${event.name}]`);
        break;
      case "span.outcome_evaluation_end":
        console.log(`\n  ↳ grader: ${event.result} (iteration ${event.iteration})`);
        break;
      case "session.status_idle":
        if (event.stop_reason?.type !== "requires_action") {
          console.log("\n--- done ---");
          await client.beta.sessions.delete(session.id);
          return;
        }
        break;
      case "session.status_terminated":
        console.log("\n--- terminated ---");
        return;
      case "session.error":
        console.error(`\n[session error] ${JSON.stringify(event.error)}`);
        break;
    }
  }
}

main();
