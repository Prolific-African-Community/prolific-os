/**
 * Brand / style profiles (code-based MVP).
 *
 * A profile carries company identity applied on top of a rendering preset:
 * company name, prepared-by line and an optional accent override. Future
 * brand kits (per-client logos, fonts, colors) become new entries here or a
 * small database table — the renderers only consume the resolved values.
 */

export type ConfidentialityLevel =
  | "none"
  | "internal"
  | "confidential"
  | "draft"
  | "final";

export interface BrandProfile {
  id: string;
  label: string;
  companyName: string;
  preparedByLabel?: string;
  /** Optional accent override on top of the preset accent. */
  accentColor?: string;
  defaultConfidentiality: ConfidentialityLevel;
}

const PROLIFIC: BrandProfile = {
  id: "prolific",
  label: "Prolific OS",
  companyName: "Prolific OS",
  defaultConfidentiality: "none",
};

export const BRAND_PROFILES: Record<string, BrandProfile> = {
  prolific: PROLIFIC,
};

export const DEFAULT_BRAND_PROFILE_ID = "prolific";

export function resolveBrandProfile(id: string | null | undefined): BrandProfile {
  if (id && BRAND_PROFILES[id]) return BRAND_PROFILES[id];
  return BRAND_PROFILES[DEFAULT_BRAND_PROFILE_ID];
}

export const CONFIDENTIALITY_LEVELS: ConfidentialityLevel[] = [
  "none",
  "internal",
  "confidential",
  "draft",
  "final",
];

export function parseConfidentiality(
  value: string | null | undefined
): ConfidentialityLevel {
  return CONFIDENTIALITY_LEVELS.includes(value as ConfidentialityLevel)
    ? (value as ConfidentialityLevel)
    : "none";
}

export function confidentialityLabel(
  level: ConfidentialityLevel,
  language: "fr" | "en"
): string | null {
  if (level === "none") return null;
  const labels: Record<Exclude<ConfidentialityLevel, "none">, { fr: string; en: string }> = {
    internal: { fr: "Usage interne", en: "Internal use" },
    confidential: { fr: "Confidentiel", en: "Confidential" },
    draft: { fr: "Projet — ne pas diffuser", en: "Draft — do not distribute" },
    final: { fr: "Version finale", en: "Final version" },
  };
  return labels[level][language];
}
