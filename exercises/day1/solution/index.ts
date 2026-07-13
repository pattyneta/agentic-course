// Day 1 solution — CMS content assistant.
// Turns raw supplier copy into a validated CMS entry, and (stretch) proves a
// prompt-cache hit on a repeated style guide.
//
// Run: npx tsx day1/solution/index.ts
import "dotenv/config";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod/v4";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "..", "..", "sample-data", "cms");

const client = new Anthropic();

// 1. The shape we want back — this IS the contract with the CMS.
const CmsEntry = z.object({
  title: z.string().describe("Max 60 chars, no ship name, no price"),
  summary: z.string().describe("One paragraph, 40-70 words"),
  body: z.string().describe("2-4 short paragraphs, British English"),
  seoMetaDescription: z.string().describe("Max 155 chars, ends with a soft CTA"),
  tags: z.array(z.string()).describe("3-6 lowercase kebab-case tags from the allowed set"),
  leadPriceGbp: z.number().describe("The 'from' price per person in GBP"),
  notIncluded: z.array(z.string()).describe("Things the supplier copy says are NOT included"),
});

const styleGuide = readFileSync(join(dataDir, "style-guide.md"), "utf-8");
const supplierCopy = readFileSync(join(dataDir, "supplier-description.txt"), "utf-8");

async function generateEntry(rawCopy: string) {
  const message = await client.messages.parse({
    model: "claude-opus-4-8",
    max_tokens: 2048,
    // The style guide is stable across every call → cache it.
    system: [
      {
        type: "text",
        text: `You convert raw travel-supplier product copy into clean CMS entries. Follow this style guide exactly:\n\n${styleGuide}`,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Convert this supplier copy into a CMS entry:\n\n${rawCopy}`,
      },
    ],
    output_config: { format: zodOutputFormat(CmsEntry) },
  });

  return message;
}

// First call: writes the style guide to cache.
const first = await generateEntry(supplierCopy);
console.log("=== Generated CMS entry ===");
console.log(JSON.stringify(first.parsed_output, null, 2));
console.log("\n=== Call 1 usage ===");
console.log(`cache_creation: ${first.usage.cache_creation_input_tokens}`);
console.log(`cache_read:     ${first.usage.cache_read_input_tokens}`);

// Second call with the same style guide: should read from cache.
const second = await generateEntry(supplierCopy);
console.log("\n=== Call 2 usage (stretch: expect cache_read > 0) ===");
console.log(`cache_creation: ${second.usage.cache_creation_input_tokens}`);
console.log(`cache_read:     ${second.usage.cache_read_input_tokens}`);

if ((second.usage.cache_read_input_tokens ?? 0) > 0) {
  console.log("\n✅ Cache hit on the second call — the style guide was served from cache.");
} else {
  console.log(
    "\nℹ️  No cache read. The style guide may be under the ~1024-token minimum, or something before the cache marker changed.",
  );
}
