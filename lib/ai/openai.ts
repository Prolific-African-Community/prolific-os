import OpenAI from "openai";

export const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";

export function getOpenAIModel() {
  return process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
}

export function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export async function generateTextWithOpenAI(prompt: string) {
  const model = getOpenAIModel();
  const client = getOpenAIClient();
  const response = await client.responses.create({
    model,
    input: prompt,
  });
  const text = response.output_text?.trim();

  if (!text) {
    throw new Error("OpenAI returned an empty response");
  }

  return {
    model,
    text,
  };
}
