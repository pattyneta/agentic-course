// Day 5 capstone starter — a production code-review agent.
// Fill in the TODOs. Run: npx tsx day5/starter/index.ts
import "dotenv/config";
import { createReadStream } from "fs";
import { readdir } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";

const here = dirname(fileURLToPath(import.meta.url));
const serviceDir = join(here, "..", "..", "sample-data", "integration-service");

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a senior code reviewer auditing third-party API
integration code for reliability, security, and correctness bugs. Read every file in
/workspace/service/. Deliver your review by calling post_review_summary exactly once.`;

const REVIEW_RUBRIC = `A thorough review must flag, with a fix for each:
- the unbounded recursive retry in supplierClient.ts
- the API key sent as a URL query parameter
- the hardcoded live API key fallback in config.ts
- the missing webhook signature verification in webhookHandler.ts
- the page-1-only pagination bug in sync.ts
The review passes only if it clearly identifies these with correct explanations.`;

// Helper (provided): upload every .ts/.md file in the service dir and return
// file resource mounts under /workspace/service/.
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
  // TODO 1: create the environment (cloud, unrestricted) — as Day 4.

  // TODO 2: create the review agent with TWO tools:
  //   - { type: "agent_toolset_20260401" }
  //   - a custom "post_review_summary" tool: input_schema { markdown: string }, required ["markdown"].

  // TODO 3: const resources = await mountServiceFiles();
  //   create the session with those resources.
  //   Print the trace URL.

  // TODO 4: stream first, then send a user.define_outcome event:
  //   { type: "user.define_outcome", description: "...", rubric: { type: "text", content: REVIEW_RUBRIC }, max_iterations: 3 }
  //   Do NOT also send a user.message.

  // TODO 5: loop the stream and handle:
  //   - agent.custom_tool_use (post_review_summary): print input.markdown, then send
  //     a user.custom_tool_result with custom_tool_use_id: event.id.
  //   - span.outcome_evaluation_end: log event.result + event.iteration.
  //   - session.status_idle with the terminal gate; session.status_terminated.

  console.log("TODO: build the code-review agent");
  void SYSTEM_PROMPT; void REVIEW_RUBRIC; void mountServiceFiles; void client;
}

main();
