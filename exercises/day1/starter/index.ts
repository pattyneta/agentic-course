// Day 1 starter — CMS content assistant.
// Fill in the TODOs. Run: npx tsx day1/starter/index.ts
import "dotenv/config";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
// TODO 0: import Zod from the version the SDK helper expects.
//         Hint: import { z } from "zod/v4";
import { z } from "zod/v4";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "..", "..", "sample-data", "cms");

const client = new Anthropic();

// TODO 1: Define the CMS entry schema.
//         Fields: title (string), summary (string), body (string),
//         tags (array of strings), leadPriceGbp (number),
//         notIncluded (array of strings).
//         Use .describe("...") on each field to guide the model.
const CmsEntry = z.object({
  // title: z.string().describe("Max 60 chars, no ship name, no price"),
  // ...fill in the rest
});

// 2. Read the raw supplier copy (done for you).
const supplierCopy = readFileSync(join(dataDir, "supplier-description.txt"), "utf-8");

async function main() {
  // TODO 3: Call client.messages.parse with:
  //   - model "claude-opus-4-8", max_tokens 2048
  //   - a user message containing the supplierCopy
  //   - output_config: { format: zodOutputFormat(CmsEntry) }
  //
  // const message = await client.messages.parse({ ... });

  // TODO 4: message.parsed_output can be null — guard it, then print
  //   JSON.stringify(message.parsed_output, null, 2).

  // STRETCH: add a `system` block containing sample-data/cms/style-guide.md
  //   with cache_control: { type: "ephemeral" }, run twice, and log
  //   message.usage.cache_read_input_tokens on the second call.

  console.log("TODO: implement me");
}

main();
