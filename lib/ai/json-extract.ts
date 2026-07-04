/**
 * Robust, dependency-free JSON extraction for model output.
 *
 * Tolerates: fenced code blocks, ```json fences, commentary before/after the
 * JSON, trailing commas, smart quotes used as delimiters, arrays returned
 * instead of an object, and a plan nested under a wrapper key
 * (documentPlan / plan / result / data). Never uses eval.
 */

const WRAPPER_KEYS = [
  "documentPlan",
  "plan",
  "sourceBrief",
  "brief",
  "result",
  "data",
];

// Keys that indicate the object is already the target payload (plan or brief),
// so we should not unwrap it further.
const TARGET_KEYS = [
  "sections",
  "documentTitle",
  "executiveIntent",
  "summary",
  "keyFigures",
  "keyFacts",
];

function stripFences(raw: string): string {
  // Remove ```json / ``` fences anywhere in the text.
  return raw.replace(/```[a-zA-Z]*\n?/g, "").replace(/```/g, "").trim();
}

function normalizeSmartQuotes(text: string): string {
  return text
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‘’‚‛′]/g, "'");
}

function stripTrailingCommas(text: string): string {
  return text.replace(/,(\s*[}\]])/g, "$1");
}

/** Extract the first balanced { ... } substring, respecting string literals. */
function balancedObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/** Extract the first balanced [ ... ] substring, respecting string literals. */
function balancedArray(text: string): string | null {
  const start = text.indexOf("[");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "[") depth += 1;
    else if (ch === "]") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function parseLoose(text: string | null): unknown | undefined {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    /* fall through */
  }
  try {
    return JSON.parse(stripTrailingCommas(text));
  } catch {
    return undefined;
  }
}

function looksLikeSectionArray(value: unknown): boolean {
  if (!Array.isArray(value) || !value.length) return false;
  const objectsWithTitle = value.filter(
    (v) => v && typeof v === "object" && typeof (v as { title?: unknown }).title === "string"
  );
  return objectsWithTitle.length >= Math.ceil(value.length / 2);
}

/** Turn a parsed value into the plan object, unwrapping wrappers/arrays. */
function coerceToPlanObject(value: unknown, depth = 0): Record<string, unknown> | null {
  if (depth > 4 || value == null) return null;

  if (Array.isArray(value)) {
    // A plan object nested in an array?
    const nested = value.find(
      (v) =>
        v &&
        typeof v === "object" &&
        ("sections" in (v as object) || "documentTitle" in (v as object))
    );
    if (nested) return coerceToPlanObject(nested, depth + 1);
    // A bare array of sections?
    if (looksLikeSectionArray(value)) return { sections: value };
    return null;
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (TARGET_KEYS.some((k) => k in obj)) {
      return obj;
    }
    // Unwrap a known wrapper key.
    for (const key of WRAPPER_KEYS) {
      if (obj[key] && typeof obj[key] === "object") {
        const inner = coerceToPlanObject(obj[key], depth + 1);
        if (inner) return inner;
      }
    }
    // Single-key object wrapping the plan.
    const keys = Object.keys(obj);
    if (keys.length === 1 && obj[keys[0]] && typeof obj[keys[0]] === "object") {
      const inner = coerceToPlanObject(obj[keys[0]], depth + 1);
      if (inner) return inner;
    }
    return obj;
  }

  return null;
}

/**
 * Best-effort extraction of a plan-shaped object from raw model text.
 * Returns null only when no JSON object could be recovered at all.
 */
export function extractJsonObject(raw: string): Record<string, unknown> | null {
  if (!raw || !raw.trim()) return null;

  const base = stripFences(raw);
  const variants = [
    base,
    balancedObject(base),
    balancedArray(base),
    normalizeSmartQuotes(base),
    balancedObject(normalizeSmartQuotes(base)),
    balancedArray(normalizeSmartQuotes(base)),
  ];

  for (const variant of variants) {
    const parsed = parseLoose(variant);
    if (parsed === undefined) continue;
    const coerced = coerceToPlanObject(parsed);
    if (coerced) return coerced;
  }

  return null;
}
