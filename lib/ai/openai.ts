import OpenAI from "openai";

export const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";

export function getOpenAIModel() {
  return process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
}

export function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "AI generation isn't configured yet. Add an OPENAI_API_KEY to enable it."
    );
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

/**
 * Translate raw OpenAI/SDK errors into short, human-readable, actionable
 * messages so the UI never has to surface low-level technical output.
 */
export function toFriendlyOpenAIError(error: unknown): string {
  if (error instanceof OpenAI.APIError) {
    const status = error.status;
    const code = (error.code as string | null) || "";

    if (status === 401) {
      return "OpenAI rejected the API key. Verify your OPENAI_API_KEY is valid.";
    }
    if (status === 429 || code === "insufficient_quota") {
      if (code === "insufficient_quota") {
        return "OpenAI quota exceeded. Check your API billing or usage limits.";
      }
      return "OpenAI is receiving too many requests right now. Wait a moment and try again.";
    }
    if (status === 404 || code === "model_not_found") {
      return "The configured AI model is unavailable. Check the OPENAI_MODEL setting.";
    }
    if (typeof status === "number" && status >= 500) {
      return "OpenAI had a temporary problem. Please try generating again in a moment.";
    }
    return error.message || "AI generation failed. Please try again.";
  }

  if (error instanceof OpenAI.APIConnectionError) {
    return "Could not reach OpenAI. Check your connection and try again.";
  }

  if (error instanceof Error) {
    if (/OPENAI_API_KEY/i.test(error.message)) {
      return error.message;
    }
    if (/quota/i.test(error.message)) {
      return "OpenAI quota exceeded. Check your API billing or usage limits.";
    }
    return error.message;
  }

  return "AI generation failed. Please try again.";
}

export interface GenerateTextOptions {
  /** System-level instructions (persona / house style). */
  instructions?: string;
  /** Upper bound on generated tokens. Long deliverables need a high ceiling. */
  maxOutputTokens?: number;
}

export async function generateTextWithOpenAI(
  prompt: string,
  options: GenerateTextOptions = {}
) {
  const model = getOpenAIModel();

  try {
    const client = getOpenAIClient();
    const response = await client.responses.create({
      model,
      input: prompt,
      ...(options.instructions ? { instructions: options.instructions } : {}),
      // Allow room for a 4,000–5,000 word deliverable (~1.3 tokens/word) plus headroom.
      max_output_tokens: options.maxOutputTokens ?? 12000,
    });
    const text = response.output_text?.trim();

    if (!text) {
      throw new Error("OpenAI returned an empty response. Please try again.");
    }

    return {
      model,
      text,
    };
  } catch (error) {
    throw new Error(toFriendlyOpenAIError(error));
  }
}
