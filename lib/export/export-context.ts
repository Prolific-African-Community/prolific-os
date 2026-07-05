import { issueSignedToken, presignUrl } from "@vercel/blob";
import type { Resource } from "@prisma/client";
import { DocumentPlan } from "../documents/document-plan";
import {
  confidentialityLabel,
  parseConfidentiality,
  resolveBrandProfile,
} from "./brand-profiles";
import {
  DocumentRenderMetadata,
  PageOrientationOption,
  RenderKeyFigure,
  RenderLogo,
  RenderVisual,
  VisualSize,
} from "./rendering-presets";
import { pickLogoResource, readImageDimensions } from "./visual-assets";

/**
 * Shared assembly of render options + metadata for the DOCX/PDF export
 * routes: query parsing, plan-driven key figures, brand identity and a
 * best-effort secure logo fetch from private Blob storage.
 */

export interface ExportQueryOptions {
  presetId: string | null;
  orientation: PageOrientationOption | null;
  confidentiality: ReturnType<typeof parseConfidentiality>;
  brandId: string | null;
}

const q = (value: string | string[] | undefined): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

export function parseExportQuery(query: {
  [key: string]: string | string[] | undefined;
}): ExportQueryOptions {
  const orientationRaw = q(query.orientation);
  return {
    // `preset` and `style` are synonyms; `preset` wins.
    presetId: q(query.preset) ?? q(query.style),
    orientation:
      orientationRaw === "portrait" || orientationRaw === "landscape"
        ? orientationRaw
        : null,
    confidentiality: parseConfidentiality(q(query.confidentiality)),
    brandId: q(query.brand),
  };
}

/* ------------------------------------------------------------ Key figures */

/** Top figures from the document plan, deduped, in plan order. */
export function collectKeyFigures(
  plan: unknown,
  max: number
): RenderKeyFigure[] {
  if (!plan || typeof plan !== "object" || max <= 0) return [];
  const sections = (plan as DocumentPlan).sections;
  if (!Array.isArray(sections)) return [];

  const seen = new Set<string>();
  const out: RenderKeyFigure[] = [];
  for (const section of sections) {
    for (const figure of section.keyFigures || []) {
      const label = (figure.label || "").trim();
      const value = (figure.value || "").trim();
      if (!label || !value) continue;
      const key = `${label.toLowerCase()}|${value.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ label: label.slice(0, 40), value: value.slice(0, 28) });
      if (out.length >= max) return out;
    }
  }
  return out;
}

/* ------------------------------------------------------------------- Logo */

const LOGO_FETCH_TIMEOUT_MS = 5000;
const LOGO_MAX_BYTES = 3 * 1024 * 1024;

const isVercelBlobUrl = (value: string) => {
  try {
    return new URL(value).hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
};

const blobPathname = (value: string) => {
  try {
    return decodeURIComponent(new URL(value).pathname.replace(/^\/+/, ""));
  } catch {
    return value;
  }
};

/**
 * Best-effort secure image fetch from private Blob storage via a short-lived
 * presigned URL. Any failure returns null — exports must still succeed.
 */
export async function fetchImageBytes(
  storageUrl: string | null,
  mimeType: string
): Promise<RenderLogo | null> {
  if (!storageUrl || !isVercelBlobUrl(storageUrl)) return null;
  if (mimeType !== "image/png" && mimeType !== "image/jpeg") return null;

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;

  try {
    const pathname = blobPathname(storageUrl);
    const signedToken = await issueSignedToken({
      token,
      pathname,
      operations: ["get"],
      validUntil: Date.now() + 60_000,
    });
    const { presignedUrl } = await presignUrl(signedToken, {
      access: "private",
      operation: "get",
      pathname,
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LOGO_FETCH_TIMEOUT_MS);
    const response = await fetch(presignedUrl, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > LOGO_MAX_BYTES) return null;
    const buffer = Buffer.from(arrayBuffer);

    const mime = mimeType === "image/png" ? "image/png" : "image/jpeg";
    const dimensions = readImageDimensions(buffer, mime);
    if (!dimensions || !dimensions.width || !dimensions.height) return null;

    return { buffer, mime, width: dimensions.width, height: dimensions.height };
  } catch {
    return null;
  }
}

/**
 * Best-effort: find a logo-like image among the project's resources and fetch
 * its bytes. Any failure returns null — the export must still render
 * beautifully without a logo.
 */
export async function loadLogoFromResources(
  resources: Pick<Resource, "id" | "filename" | "mimeType" | "storageUrl">[]
): Promise<RenderLogo | null> {
  const candidate = pickLogoResource(resources);
  if (!candidate) return null;
  return fetchImageBytes(candidate.storageUrl, candidate.mimeType);
}

/* ---------------------------------------------------------------- Visuals */

const MAX_EXPORT_VISUALS = 12;

export interface PlacementForExport {
  target: string;
  size: string | null;
  caption: string | null;
  section: { title: string } | null;
  resource: {
    filename: string;
    mimeType: string;
    storageUrl: string | null;
  };
}

const asVisualSize = (value: string | null): VisualSize =>
  value === "small" || value === "large" || value === "full_width"
    ? value
    : "medium";

/**
 * Fetch the bytes for approved+enabled placements (section/appendix only).
 * Skips anything that fails — the export must still succeed.
 */
export async function loadPlacementVisuals(
  placements: PlacementForExport[]
): Promise<RenderVisual[]> {
  const out: RenderVisual[] = [];
  for (const placement of placements.slice(0, MAX_EXPORT_VISUALS)) {
    if (placement.target !== "section" && placement.target !== "appendix") {
      continue;
    }
    const image = await fetchImageBytes(
      placement.resource.storageUrl,
      placement.resource.mimeType
    );
    if (!image) continue;
    out.push({
      ...image,
      target: placement.target,
      sectionTitle:
        placement.target === "section"
          ? placement.section?.title ?? null
          : null,
      size: asVisualSize(placement.size),
      caption:
        placement.caption ||
        placement.resource.filename.replace(/\.[a-z0-9]+$/i, ""),
    });
  }
  return out;
}

/* --------------------------------------------------------------- Metadata */

export interface BuildMetadataArgs {
  documentTitle: string;
  projectName: string;
  documentType: string | null;
  status: string | null;
  date: Date;
  options: ExportQueryOptions;
  keyFigures: RenderKeyFigure[];
  logo: RenderLogo | null;
  visuals?: RenderVisual[];
  language: "fr" | "en";
}

export function buildRenderMetadata(
  args: BuildMetadataArgs
): DocumentRenderMetadata {
  const brand = resolveBrandProfile(args.options.brandId);
  const level =
    args.options.confidentiality !== "none"
      ? args.options.confidentiality
      : brand.defaultConfidentiality;

  return {
    documentTitle: args.documentTitle,
    projectName: args.projectName,
    documentType: args.documentType,
    status: args.status,
    date: args.date,
    companyName: brand.companyName,
    preparedByOverride: brand.preparedByLabel ?? null,
    confidentiality: confidentialityLabel(level, args.language),
    keyFigures: args.keyFigures,
    logo: args.logo,
    visuals: args.visuals ?? [],
    language: args.language,
  };
}
