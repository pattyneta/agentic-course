# Day 1 Exercise — CMS Content Assistant

Turn raw, messy supplier product copy into a clean, schema-validated CMS entry — the kind of task you'd otherwise do by hand a hundred times.

## What you're building

A script that:

1. Reads raw supplier copy from `sample-data/cms/supplier-description.txt`.
2. Sends it to Claude with a **Zod schema** describing a CMS entry.
3. Gets back a **validated, typed object** (title, summary, body, tags, price, what's-not-included).
4. Prints it as JSON you could push straight to the CMS.

## Run it

```sh
cd exercises
npx tsx day1/solution/index.ts     # reference solution
npx tsx day1/starter/index.ts      # your version (has TODOs)
```

## Your task (starter)

Open `day1/starter/index.ts`. The TODOs walk you through:

1. Define a `CmsEntry` Zod schema (title, summary, body, tags array, `leadPriceGbp`, `notIncluded` array).
2. Read the supplier file.
3. Call `client.messages.parse(...)` with `zodOutputFormat(CmsEntry)`.
4. Guard `parsed_output` (it can be `null`) and print the result.

Remember: `import { z } from "zod/v4"` when using the SDK's Zod helper.

## Stretch goal — prove a cache hit

The style guide in `sample-data/cms/style-guide.md` is large and identical on every call — a perfect caching candidate.

1. Load the style guide and pass it as a `system` block with `cache_control: { type: "ephemeral" }`.
2. Process **two** supplier descriptions in a row (or the same one twice).
3. Log `response.usage.cache_creation_input_tokens` and `cache_read_input_tokens` for each call.
4. Confirm the second call reports `cache_read_input_tokens > 0`.

The `solution/index.ts` implements the stretch goal too — read it after you've tried.

> ⚠️ The style guide must be **at least ~1024 tokens** to cache. Ours is sized to qualify. If you see `cache_read_input_tokens: 0` on the second call, check nothing before the cache marker changes between calls.

## Cost

Two Opus calls with a cached style guide: well under **$0.10**. Switch the model to `claude-haiku-4-5` to make it near-free while iterating.
