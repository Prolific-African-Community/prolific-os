import type { DocumentSection } from "@prisma/client";
import { countWords } from "./document-sections";

/**
 * Assemble generated sections into a single clean Markdown document.
 *
 * Rules:
 * - one H1 (the document title), no duplicate H1s from sections
 * - each section keeps its own `##`/`###` heading if present, otherwise we add one
 * - sections are ordered by orderIndex
 * - empty sections are skipped (or shown as a placeholder when includePlaceholders)
 */

export interface AssembleOptions {
  documentTitle: string;
  includePlaceholders?: boolean;
}

const headingFor = (level: number) => (level === 3 ? "###" : "##");

/** Strip a leading H1 line from a section so we don't get duplicate titles. */
function stripLeadingH1(content: string): string {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  while (i < lines.length && !lines[i].trim()) i += 1;
  if (i < lines.length && /^#\s+/.test(lines[i].trim())) {
    lines.splice(i, 1);
  }
  return lines.join("\n").trim();
}

export interface AssembleResult {
  content: string;
  sectionsIncluded: number;
  sectionsSkipped: number;
  totalWords: number;
}

export function assembleSections(
  sections: DocumentSection[],
  options: AssembleOptions
): AssembleResult {
  const ordered = [...sections].sort((a, b) => a.orderIndex - b.orderIndex);
  const parts: string[] = [];
  let included = 0;
  let skipped = 0;

  if (options.documentTitle) {
    parts.push(`# ${options.documentTitle}`);
  }

  for (const section of ordered) {
    const raw = (section.content || "").trim();

    if (!raw) {
      skipped += 1;
      if (options.includePlaceholders) {
        parts.push(`${headingFor(section.level)} ${section.title}`);
        parts.push("_[section not generated yet]_");
      }
      continue;
    }

    included += 1;
    const body = stripLeadingH1(raw);
    const startsWithHeading = /^#{2,3}\s+/.test(body.trimStart());

    if (startsWithHeading) {
      parts.push(body);
    } else {
      parts.push(`${headingFor(section.level)} ${section.title}`);
      parts.push(body);
    }
  }

  const content = parts.join("\n\n").trim();
  return {
    content,
    sectionsIncluded: included,
    sectionsSkipped: skipped,
    totalWords: countWords(content),
  };
}
