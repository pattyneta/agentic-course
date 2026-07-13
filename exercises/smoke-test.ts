// Setup check: verifies your API key works before Day 1.
// Run with: npm run smoke-test
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const response = await client.messages.create({
  model: "claude-haiku-4-5",
  max_tokens: 64,
  messages: [
    {
      role: "user",
      content: "Reply with one short sentence confirming you can hear me.",
    },
  ],
});

for (const block of response.content) {
  if (block.type === "text") {
    console.log(`✅ Claude says: ${block.text}`);
  }
}
console.log(
  `   (model: ${response.model}, tokens: ${response.usage.input_tokens} in / ${response.usage.output_tokens} out)`,
);
