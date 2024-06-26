import { ChatOpenAI } from "@langchain/openai";
import env from "#start/env"

export const openaiModel = new ChatOpenAI({
  apiKey: env.get("OPENAI_API_KEY"),
  model: "gpt-4o",
  temperature: 0.5,
  maxTokens: 100,
  topP: 1,
  frequencyPenalty: 0.5,
  presencePenalty: 0.5
});
