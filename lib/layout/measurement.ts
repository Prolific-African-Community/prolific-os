import type { TextMeasurementProvider, TextMeasureRequest, TextMeasureResult } from "./model";

const ROLE_SCALE: Record<TextMeasureRequest["typographyRole"], number> = {
  display: 2.1,
  title: 1.65,
  heading: 1.3,
  body: 1,
  caption: 0.78,
  source: 0.68,
  metric: 1.8,
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));

/** Deterministic approximation. Format adapters can later inject measured metrics. */
export class ApproximateTextMeasurer implements TextMeasurementProvider {
  constructor(private readonly baseCharactersPerLine = 78) {}

  measure(request: TextMeasureRequest): TextMeasureResult {
    const width = Math.max(0.08, Math.min(1, request.maxWidth));
    const scale = ROLE_SCALE[request.typographyRole];
    const punctuationPenalty = (request.text.match(/[,:;.!?]/g) || []).length * 0.16;
    const longWordPenalty = (request.text.match(/\b\S{14,}\b/g) || []).length * 0.7;
    const localeFactor = request.locale === "fr" ? 0.97 : 1;
    const effectiveCharacters = Math.max(8, (this.baseCharactersPerLine * width * localeFactor) / scale);
    const estimatedLines = Math.max(1, Math.ceil((request.text.length + punctuationPenalty + longWordPenalty) / effectiveCharacters));
    const lineHeight = 0.022 * scale;
    const estimatedHeight = estimatedLines * lineHeight;
    return {
      estimatedLines,
      estimatedHeight,
      overflowRisk: clamp((estimatedLines - (request.typographyRole === "title" ? 2 : 8)) / 8),
    };
  }
}
