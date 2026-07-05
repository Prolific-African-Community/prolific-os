/**
 * Visual asset intelligence (deterministic first pass).
 *
 * Classifies image resources by filename, suggests placements against section
 * titles, picks a document logo, and parses PNG/JPEG dimensions without any
 * dependency. A future ticket can layer AI on top of the same shapes.
 */

export type VisualAssetRole =
  | "logo"
  | "cover"
  | "site_photo"
  | "plan"
  | "diagram"
  | "chart"
  | "screenshot"
  | "map"
  | "illustration"
  | "unknown";

export interface VisualAssetInput {
  id: string;
  filename: string;
  mimeType: string;
}

export interface VisualPlacementSuggestion {
  resourceId: string;
  filename: string;
  role: VisualAssetRole;
  target: "cover" | "section" | "appendix";
  sectionTitle?: string;
  confidence: "high" | "medium" | "low";
  reason: string;
}

export function isImageResource(resource: { mimeType: string }): boolean {
  return resource.mimeType.startsWith("image/");
}

const ROLE_PATTERNS: Array<{ role: VisualAssetRole; pattern: RegExp }> = [
  { role: "logo", pattern: /logo|brand|marque|mark|icon|embleme|prolific/i },
  { role: "cover", pattern: /cover|couverture|page-?de-?garde|hero/i },
  { role: "map", pattern: /map|carte|localisation|location|acces|accès/i },
  { role: "screenshot", pattern: /screenshot|capture|dashboard|interface|ecran|écran|app/i },
  { role: "plan", pattern: /plan|masse|cadastre|blueprint|layout|implantation|floor/i },
  { role: "diagram", pattern: /schema|sch[ée]ma|diagram|flux|process|workflow|orga/i },
  { role: "chart", pattern: /chart|graph|budget|courbe|stats?|kpi|rentab|financ/i },
  { role: "site_photo", pattern: /photo|site|terrain|hangar|entrepot|entrepôt|warehouse|batiment|bâtiment|parking|camion|truck|facade|vue|aerienne|a[ée]rienne/i },
];

/** Fallback: which section keywords fit a role when the filename itself
 * doesn't share words with any section title. */
const ROLE_SECTION_KEYWORDS: Partial<Record<VisualAssetRole, RegExp>> = {
  plan: /site|actif|implantation|description|localisation/i,
  map: /localisation|acces|accès|site|situation/i,
  site_photo: /site|actif|description|stationnement|parking|hangar|infrastructure/i,
  diagram: /flux|processus|process|organisation|fonctionnement/i,
  chart: /budget|financ|économique|economique|rentab|hypoth/i,
  screenshot: /digit|outil|interface|syst[eè]me|plateforme|r[ée]servation/i,
};

export function classifyVisualAsset(filename: string): VisualAssetRole {
  for (const { role, pattern } of ROLE_PATTERNS) {
    if (pattern.test(filename)) return role;
  }
  if (/\.(jpe?g)$/i.test(filename)) return "site_photo";
  if (/\.(png|webp)$/i.test(filename)) return "illustration";
  return "unknown";
}

/** Words shared between a filename and a section title → section match. */
function matchSection(
  filename: string,
  sectionTitles: string[]
): { title: string; score: number } | null {
  const stem = filename
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  const words = stem.split(/[^a-z0-9]+/).filter((w) => w.length >= 4);
  if (!words.length) return null;

  let best: { title: string; score: number } | null = null;
  for (const title of sectionTitles) {
    const normalized = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
    const score = words.filter((w) => normalized.includes(w)).length;
    if (score > 0 && (!best || score > best.score)) {
      best = { title, score };
    }
  }
  return best;
}

export function suggestVisualPlacements(
  assets: VisualAssetInput[],
  sectionTitles: string[]
): VisualPlacementSuggestion[] {
  return assets.filter(isImageResource).map((asset) => {
    const role = classifyVisualAsset(asset.filename);

    if (role === "logo" || role === "cover") {
      return {
        resourceId: asset.id,
        filename: asset.filename,
        role,
        target: "cover" as const,
        confidence: "high" as const,
        reason:
          role === "logo"
            ? "Filename looks like a logo/brand mark."
            : "Filename looks like a cover visual.",
      };
    }

    const match = matchSection(asset.filename, sectionTitles);
    if (match) {
      return {
        resourceId: asset.id,
        filename: asset.filename,
        role,
        target: "section" as const,
        sectionTitle: match.title,
        confidence: match.score >= 2 ? ("high" as const) : ("medium" as const),
        reason: `Filename matches section « ${match.title} ».`,
      };
    }

    // Role-based fallback: e.g. a chart belongs near the budget section.
    const roleKeywords = ROLE_SECTION_KEYWORDS[role];
    if (roleKeywords) {
      const fallback = sectionTitles.find((title) =>
        roleKeywords.test(
          title.normalize("NFD").replace(/[̀-ͯ]/g, "")
        ) || roleKeywords.test(title)
      );
      if (fallback) {
        return {
          resourceId: asset.id,
          filename: asset.filename,
          role,
          target: "section" as const,
          sectionTitle: fallback,
          confidence: "medium" as const,
          reason: `A ${role.replace("_", " ")} usually belongs in « ${fallback} ».`,
        };
      }
    }

    return {
      resourceId: asset.id,
      filename: asset.filename,
      role,
      target: "appendix" as const,
      confidence: "low" as const,
      reason: "No matching section — suggested for the appendix.",
    };
  });
}

/** First embeddable (PNG/JPEG) logo-like resource, if any. */
export function pickLogoResource<T extends VisualAssetInput>(
  resources: T[]
): T | null {
  const embeddable = resources.filter(
    (r) =>
      isImageResource(r) &&
      (r.mimeType === "image/png" || r.mimeType === "image/jpeg")
  );
  return (
    embeddable.find((r) => classifyVisualAsset(r.filename) === "logo") || null
  );
}

/* ------------------------------------------------------- Image dimensions */

export interface ImageDimensions {
  width: number;
  height: number;
}

/** Parse PNG (IHDR) or JPEG (SOF marker) dimensions from raw bytes. */
export function readImageDimensions(
  buffer: Buffer,
  mime: string
): ImageDimensions | null {
  try {
    if (mime === "image/png") {
      // PNG signature (8) + IHDR length/type (8) → width/height at 16/20.
      if (buffer.length < 24) return null;
      if (buffer.readUInt32BE(12) !== 0x49484452) return null; // "IHDR"
      return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
      };
    }
    if (mime === "image/jpeg") {
      let offset = 2; // skip 0xFFD8
      while (offset + 9 < buffer.length) {
        if (buffer[offset] !== 0xff) return null;
        const marker = buffer[offset + 1];
        const size = buffer.readUInt16BE(offset + 2);
        // SOF0–SOF15 except DHT(C4)/DAC(CC)/RST markers.
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return {
            height: buffer.readUInt16BE(offset + 5),
            width: buffer.readUInt16BE(offset + 7),
          };
        }
        offset += 2 + size;
      }
    }
  } catch {
    /* fall through */
  }
  return null;
}
