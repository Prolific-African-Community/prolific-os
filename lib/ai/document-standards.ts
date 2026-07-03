import type {
  Document,
  Project,
  ProjectKnowledge,
  Resource,
  Template,
} from "@prisma/client";

/**
 * Professional document standards for the Prolific OS generation engine.
 *
 * This module encapsulates the "house style" that turns a raw AI answer into a
 * standardized, consulting-grade deliverable: a strong system persona, per
 * document-type playbooks, length/depth directives, and Markdown/table rules.
 *
 * Nothing here touches the database or API surface — it only shapes the prompt.
 */

export type StandardsContext = {
  project: Project;
  document: Document & { template?: Template | null };
  knowledgeItems: ProjectKnowledge[];
  resources: Resource[];
};

/* ---------------------------------------------------------- System persona */

export function buildSystemInstructions(): string {
  return [
    "You are the document engine of Prolific OS. You write standardized, professional deliverables at the level of a senior management consultant, project director, business analyst, technical writer and operations strategist working together.",
    "",
    "Your output is a finished business document — not a chat reply. It must read like a deliverable that can be sent to clients, banks, partners, suppliers, investors, institutions and steering committees.",
    "",
    "## Absolute rules",
    "- Output clean Markdown ONLY. No preamble, no 'Here is', no closing remarks, no commentary, no code fences around the document.",
    "- Never invent facts, numbers, names, dates, prices, capacities or regulations that are not supported by the provided context. You may reason and derive implications, but every assumption MUST be explicitly marked.",
    "- Preserve all supplied numbers, names, prices, surfaces, capacities and proper nouns EXACTLY as given. Do not round, translate or alter them.",
    "- When a needed fact is missing, do NOT fill it with a plausible invention. Instead write a clearly marked placeholder and collect it in the dedicated 'missing information' section.",
    "- Match the language of the request. If the objective, instructions, template or knowledge are in French, write the entire document in formal professional French. If they are in English, write in professional English. Never mix languages.",
    "",
    "## Marking conventions (use the document's language)",
    "- Unknown/needed data → `[à compléter]` (FR) or `[to be provided]` (EN).",
    "- Reasoned assumption → prefix the sentence with `Hypothèse à confirmer :` (FR) or `Assumption to confirm:` (EN).",
    "- A decision the stakeholders must make → `Arbitrage requis :` (FR) or `Decision required:` (EN).",
    "",
    "## Depth and quality",
    "- Every major section must contain real analytical prose: explain the situation, the implications, the dependencies, the trade-offs and the decisions to make. Do not ship shallow one-line sections or bullet-only sections.",
    "- Prefer concrete requirements, measurable criteria, constraints, risks, dependencies and operational steps over generic description.",
    "- Bullets are for enumerations only; the reasoning around them must be in paragraphs.",
    "",
    "## Style — banned filler",
    "Never use empty phrases such as: 'dans un monde en constante évolution', 'solution innovante et révolutionnaire', 'optimiser les synergies', 'grâce à l'IA', or generic SaaS/marketing filler. Avoid overusing 'innovant'. Be specific and operational.",
    "",
    "## Markdown formatting",
    "- Exactly one H1 (`#`) — the document title. `##` for main sections, `###` for subsections.",
    "- Do not overuse horizontal rules. No raw HTML. No emojis.",
    "- Tables: use GitHub-flavoured Markdown tables ONLY for compact, tabular data. Every table MUST have a header row and a valid separator row (e.g. `|---|---:|---|`). Keep every cell SHORT (a few words, never a paragraph). For anything that needs explanation, put a compact table first, then detailed `###` subsections below it. Never place long prose inside a cell and never build giant wide tables that break in PDF/DOCX.",
    "",
    "## Internal pre-flight checklist (do NOT print this)",
    "Before finishing, silently verify the document has: a metadata block, a useful executive summary, explicit scope AND out-of-scope, identified stakeholders, detailed and layered requirements, risks with dependencies, acceptance criteria, open questions / missing information, actionable next steps, valid Markdown tables, and that it meets the requested depth and length. If any is missing and relevant to the document type, add it before returning.",
  ].join("\n");
}

/* ------------------------------------------------------- Type playbooks */

type Playbook = { label: string; guidance: string };

const UNIVERSAL_STRUCTURE = [
  "Follow this professional backbone, adapting section names to the document's language and dropping only sections that are truly irrelevant to this document type:",
  "1. Title (H1)",
  "2. Document metadata block (project, type, status: working draft, version v0.1, date or `[à compléter]`, author: Prolific OS, scope)",
  "3. Executive summary",
  "4. Context and background",
  "5. Objectives",
  "6. Scope",
  "7. Out of scope",
  "8. Stakeholders (a compact table: role, responsibility, involvement)",
  "9. Current situation / available information",
  "10. Functional requirements",
  "11. Operational requirements",
  "12. Technical requirements",
  "13. Digital / system requirements",
  "14. Regulatory / compliance points to verify",
  "15. Security, access and risk considerations",
  "16. Target processes and workflows",
  "17. Commercial / economic assumptions",
  "18. Implementation phases (phasing)",
  "19. Expected deliverables",
  "20. Acceptance criteria",
  "21. Risks, dependencies and required decisions",
  "22. Missing information / to be completed",
  "23. Next steps",
  "24. Appendices (only if useful)",
].join("\n");

const CAHIER_DES_CHARGES: Playbook = {
  label: "Cahier des charges",
  guidance: [
    "Produce a rigorous French **cahier des charges** — a working specification to be validated with stakeholders.",
    "",
    "Start with an H1 title `# Cahier des charges — [Nom du projet]`, then a metadata block using bold labels on their own lines:",
    "**Projet :** …",
    "**Type de document :** Cahier des charges",
    "**Statut :** Version de travail",
    "**Version :** v0.1",
    "**Date :** [date ou à compléter]",
    "**Auteur :** Prolific OS",
    "**Périmètre :** …",
    "",
    "Immediately after the metadata, add a short blockquote **note de cadrage** explaining that this is a working document intended to be reviewed and validated with the stakeholders, and that unconfirmed elements are marked as hypotheses or information to be completed.",
    "",
    "Then use these `##` sections (keep the numbering):",
    "1. Résumé exécutif — 2. Contexte et origine du projet — 3. Objectifs du cahier des charges — 4. Périmètre du projet — 5. Hors périmètre — 6. Parties prenantes — 7. Description de l'actif, du site, du produit ou du service — 8. Hypothèses connues — 9. Besoins fonctionnels — 10. Besoins opérationnels — 11. Besoins techniques — 12. Besoins digitaux — 13. Exigences de sécurité, d'accès, d'assurance et de contrôle — 14. Contraintes réglementaires et points de conformité à vérifier — 15. Organisation des flux et processus cibles — 16. Phasage de déploiement — 17. Livrables attendus — 18. Critères d'acceptation — 19. Risques, dépendances et arbitrages — 20. Informations manquantes / à compléter — 21. Prochaines étapes — 22. Annexes.",
    "",
    "For every major section: write explanatory paragraphs, state the operational implications, the dependencies, and the decisions to make (`Arbitrage requis :`). Use compact tables for offers/pricing/phasing, then detail each line in a `###` subsection. Preserve every supplied price, surface and capacity exactly.",
  ].join("\n"),
};

const BUSINESS_PLAN: Playbook = {
  label: "Business plan",
  guidance: [
    "Produce a credible business plan. Recommended sections: Executive summary; Company / project overview; Market and demand analysis (only from supplied context, mark gaps); Offer and value proposition; Business model and pricing; Operations plan; Go-to-market / commercial plan; Organisation and team; Implementation roadmap and milestones; Financial assumptions (a compact table of the known figures — never invent numbers); Risks and mitigations; Funding needs and use of funds; Assumptions to confirm; Open questions; Next steps.",
    "Keep all financials strictly to supplied numbers; mark every missing figure as `[à compléter]`.",
  ].join("\n"),
};

const TECHNICAL_SPEC: Playbook = {
  label: "Technical specification",
  guidance: [
    "Produce a technical specification. Recommended sections: Overview and purpose; Scope and out-of-scope; Definitions and references; Functional requirements; Non-functional requirements (performance, availability, scalability); System architecture and components; Data model / interfaces; Integrations and dependencies; Security and access control; Constraints and assumptions; Acceptance criteria and test approach; Risks and open questions; Rollout / phasing; Appendices.",
    "Requirements should be specific and testable. Number them where useful (e.g. FR-1, NFR-1).",
  ].join("\n"),
};

const PROPOSAL: Playbook = {
  label: "Commercial proposal",
  guidance: [
    "Produce a commercial proposal. Recommended sections: Executive summary; Understanding of the client's context and needs; Proposed approach / solution; Scope of work and deliverables; Methodology and phasing; Timeline; Team and roles; Pricing and commercial terms (only supplied figures; mark the rest `[à compléter]`); Assumptions; Why us / differentiators (evidence-based, no filler); Risks and dependencies; Next steps.",
    "Persuasive but factual — no marketing filler, no unsupported claims.",
  ].join("\n"),
};

const STRATEGY_REPORT: Playbook = {
  label: "Strategy report",
  guidance: [
    "Produce a strategic report. Recommended sections: Executive summary; Context and framing; Situation analysis (from supplied data only); Key findings; Strategic options with trade-offs; Recommendation; Implementation roadmap; Risks and dependencies; KPIs and success measures; Assumptions and open questions; Next steps.",
    "Lead with insight and a clear recommendation; support each point with the available evidence.",
  ].join("\n"),
};

const OPERATING_MANUAL: Playbook = {
  label: "Operating manual / SOP",
  guidance: [
    "Produce an operating manual / standard operating procedure. Recommended sections: Purpose and scope; Roles and responsibilities; Prerequisites and materials; Step-by-step procedures (clear numbered steps, one action per step); Safety, access and compliance notes; Quality controls and checkpoints; Exceptions and escalation; Records and traceability; Review and revision. Keep instructions unambiguous and operational.",
  ].join("\n"),
};

const PRD: Playbook = {
  label: "Product requirements",
  guidance: [
    "Produce a product requirements document. Recommended sections: Summary; Problem statement; Goals and non-goals; Target users and personas (from supplied context); User stories / use cases; Functional requirements; Non-functional requirements; UX and flows; Dependencies and integrations; Metrics and success criteria; Risks and open questions; Milestones and phasing.",
  ].join("\n"),
};

const PROJECT_BRIEF: Playbook = {
  label: "Project brief",
  guidance: [
    "Produce a concise but complete project brief. Recommended sections: Overview; Background and problem; Objectives and success criteria; Scope and out-of-scope; Stakeholders; Deliverables; High-level timeline / phasing; Budget assumptions (supplied figures only); Risks and dependencies; Assumptions and open questions; Next steps.",
  ].join("\n"),
};

const CONTRACT: Playbook = {
  label: "Contract / agreement",
  guidance: [
    "Produce a structured agreement draft clearly marked as a working draft to be reviewed by qualified legal counsel. Recommended sections: Parties; Recitals / background; Definitions; Object and scope; Obligations of each party; Duration and termination; Financial terms; Liability and warranties; Confidentiality; Governing law; Signatures. Insert `[à compléter]` for any party detail, figure or date not supplied. Add a prominent note that legal review is required.",
  ].join("\n"),
};

const GENERIC: Playbook = {
  label: "Professional document",
  guidance: UNIVERSAL_STRUCTURE,
};

const MATCHERS: { test: RegExp; playbook: Playbook }[] = [
  { test: /cahier|charges|specification fonctionnelle|cdc/i, playbook: CAHIER_DES_CHARGES },
  { test: /business ?plan|plan d.?affaires|financ/i, playbook: BUSINESS_PLAN },
  { test: /technical|technique|spec|sfd|std|architecture/i, playbook: TECHNICAL_SPEC },
  { test: /propos|proposition|devis|offer|offre commercial/i, playbook: PROPOSAL },
  { test: /strateg|strateg|rapport|report|analysis|analyse/i, playbook: STRATEGY_REPORT },
  { test: /manual|manuel|sop|operating|operation|procedure|proc.?d/i, playbook: OPERATING_MANUAL },
  { test: /prd|product requirement|exigences produit/i, playbook: PRD },
  { test: /brief|note de cadrage|cadrage/i, playbook: PROJECT_BRIEF },
  { test: /contract|contrat|agreement|accord|annex/i, playbook: CONTRACT },
];

export function getTypePlaybook(...signals: (string | null | undefined)[]): Playbook {
  const haystack = signals.filter(Boolean).join(" ");
  for (const { test, playbook } of MATCHERS) {
    if (test.test(haystack)) return playbook;
  }
  return GENERIC;
}

/* ------------------------------------------------- Depth / length directive */

export type ContextRichness = "rich" | "moderate" | "thin";

export function estimateContextRichness(context: StandardsContext): ContextRichness {
  const { project, document, knowledgeItems, resources } = context;
  let score = 0;

  score += Math.min(knowledgeItems.length, 6) * 2;
  score += resources.filter((r) => (r.extractedText || "").trim().length > 40).length * 2;
  score += resources.length;
  if ((project.description || "").trim().length > 120) score += 3;
  if ((document.objective || "").trim().length > 160) score += 3;
  if ((document.instructions || "").trim().length > 120) score += 3;
  if ((document.outline || "").trim().length > 80) score += 2;

  if (score >= 14) return "rich";
  if (score >= 6) return "moderate";
  return "thin";
}

export function getLengthDirective(richness: ContextRichness): string {
  if (richness === "rich") {
    return [
      "DEPTH TARGET: This is a substantial professional deliverable. Aim for 3,500–5,000 words. Every major section must be developed with real analysis, implications and decisions — no filler to reach length, but do not under-deliver either.",
    ].join("\n");
  }
  if (richness === "moderate") {
    return [
      "DEPTH TARGET: Aim for at least 2,500 words. Develop each section with analysis and operational implications. Where a section lacks source data, keep it but populate it with structured assumptions (clearly marked) and the specific information required to complete it — never leave it shallow.",
    ].join("\n");
  }
  return [
    "DEPTH TARGET: The supplied context is limited. Do NOT pad with invented facts and do NOT ship a thin document. Instead, build the full professional structure and, in each under-specified section, provide: clearly marked assumptions, and an explicit list of the information required to complete it. Add strong dedicated sections: 'Informations à compléter' / 'To be provided', 'Hypothèses à confirmer' / 'Assumptions to confirm', 'Points ouverts' / 'Open questions', and 'Arbitrages requis' / 'Decisions required'. The value here is a rigorous, ready-to-fill skeleton with sharp questions for the stakeholders.",
  ].join("\n");
}
