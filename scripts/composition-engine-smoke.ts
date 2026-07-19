import assert from "assert";
import { composeDocument, compositionFlow } from "../lib/composition";

const pixel = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

const composition = composeDocument({
  title: "Growth Programme",
  language: "en",
  documentType: "Executive financing proposal",
  presetStyle: "bank",
  markdown: `# Growth Programme

## Executive summary
The programme creates a controlled path from evidence to investment and gives the board a concise decision record.

> [!DECISION] Approve the programme subject to the review gates.

## Delivery roadmap
1. Discovery and evidence review
2. Design and validation
3. Implementation
4. Operational handover

### Options comparison
| Option | Cost | Time | Risk |
| --- | ---: | ---: | --- |
| A | 100 | 8 weeks | Low |
| B | 80 | 12 weeks | Medium |

## Sources
- Board brief (2026)
- Finance model [1]
`,
  keyFigures: [
    { label: "Programme", value: "12 weeks" },
    { label: "Investment", value: "€1.2m" },
    { label: "Review gates", value: "4" },
  ],
  images: [
    {
      assetId: "hero-1",
      filename: "cover-hero.png",
      role: "cover",
      target: "cover",
      sectionTitle: null,
      size: "full_width",
      caption: null,
      buffer: pixel,
      mime: "image/png",
      width: 1600,
      height: 700,
    },
    {
      assetId: "roadmap-1",
      filename: "roadmap-diagram.png",
      role: "diagram",
      target: "section",
      sectionTitle: "Delivery roadmap",
      position: "after_heading",
      size: "large",
      caption: "Programme delivery sequence",
      buffer: pixel,
      mime: "image/png",
      width: 1200,
      height: 600,
    },
  ],
});

assert.equal(composition.version, "1.0");
assert.equal(composition.archetype, "finance");
assert.equal(composition.chapters.length, 3);
assert.equal(composition.cover.hero?.type, "image");
assert.equal(composition.cover.metrics?.type, "metric_grid");
assert(composition.opportunities.some((item) => item.kind === "timeline"));
assert(composition.opportunities.some((item) => item.kind === "comparison"));
assert(composition.density.wordCount > 20);
assert(composition.density.estimatedReadingMinutes >= 1);
assert(compositionFlow(composition).some((node) => node.type === "image" && node.role === "diagram"));
assert(!compositionFlow(composition).some((node) => node.type === "image" && node.role === "cover"));

console.log(
  JSON.stringify(
    {
      version: composition.version,
      chapters: composition.chapters.length,
      nodes: compositionFlow(composition).length,
      opportunities: composition.opportunities.map((item) => item.kind),
      warnings: composition.warnings.map((item) => item.code),
      density: composition.density,
    },
    null,
    2
  )
);
