import { mkdirSync, writeFileSync } from "fs";
import { markdownToDocxBuffer } from "../lib/export/docx";
import { markdownToPdfBuffer } from "../lib/export/pdf";
import { DocumentRenderMetadata } from "../lib/export/rendering-presets";

const markdown = `# Institutional Research Proposal

## Executive summary

This proposal establishes a rigorous, auditable research programme for a multi-stakeholder institution. It combines a clear governance model with measurable milestones and a disciplined evidence framework so decision makers can assess progress without reading dense, unstructured material.

> [!DECISION] Approve the staged research programme, subject to the governance and evidence gates described below.

### Strategic rationale

- Align academic, financial and operational stakeholders.
- Preserve a complete decision trail.
- Produce institution-ready evidence at every stage.

## Research design

The work is organised into four connected workstreams. Each workstream has a named owner, an evidence standard and an explicit review point. This rhythm reduces ambiguity while keeping the document readable and useful during delivery.

| Workstream | Primary output | Review authority | Timing |
| --- | --- | --- | --- |
| Evidence review | Validated source register and synthesis | Academic steering group | Weeks 1-3 |
| Field research | Interview record and coded findings | Research director | Weeks 3-7 |
| Financial assessment | Scenario model and affordability analysis | Finance committee | Weeks 6-9 |
| Recommendations | Prioritised institutional action plan | Executive board | Weeks 9-12 |

> Risks: delays in stakeholder access may compress the validation window. A two-week evidence reserve is included in the programme.

## Governance and assurance

### Decision rights

The steering group owns scope, the research director owns method, and the executive board owns final acceptance. No workstream may pass its review point without a complete evidence record.

### Quality controls

1. Source integrity review.
2. Independent methods check.
3. Financial scenario challenge.
4. Final editorial and accessibility review.

## Budget and timetable

The proposed envelope is deliberately staged. Release of each tranche depends on acceptance of the preceding evidence package, protecting the institution while maintaining delivery momentum.

## Conclusion

The programme is ready to begin once governance appointments and access permissions are confirmed.
`;

const pixel = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

const metadata: DocumentRenderMetadata = {
  documentTitle: "Institutional Research and Financing Proposal",
  projectName: "Northbridge Institutional Programme",
  documentType: "Research proposal",
  status: "READY_FOR_REVIEW",
  date: new Date("2026-07-19T00:00:00Z"),
  companyName: "Prolific OS",
  confidentiality: "Confidential",
  language: "en",
  keyFigures: [
    { value: "12 weeks", label: "Total delivery programme" },
    { value: "€1.85m", label: "Indicative financing envelope" },
    { value: "4 gates", label: "Independent review milestones" },
    { value: "26", label: "Stakeholder interviews planned" },
    { value: "3 cases", label: "Financial scenarios modelled" },
    { value: "100%", label: "Evidence traceability target" },
  ],
  visuals: [
    {
      buffer: pixel,
      mime: "image/png",
      width: 1600,
      height: 700,
      target: "cover",
      sectionTitle: null,
      size: "full_width",
      caption: null,
    },
  ],
};

async function main() {
  const output = "tmp/export-quality";
  mkdirSync(output, { recursive: true });
  const [docx, pdf] = await Promise.all([
    markdownToDocxBuffer(markdown, { presetId: "bank_financing", metadata }),
    markdownToPdfBuffer(markdown, { presetId: "bank_financing", metadata }),
  ]);
  writeFileSync(`${output}/quality-smoke.docx`, docx);
  writeFileSync(`${output}/quality-smoke.pdf`, pdf);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
