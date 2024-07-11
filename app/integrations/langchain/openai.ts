import { ChatOpenAI } from '@langchain/openai'
import env from '#start/env'

export const openaiModel = new ChatOpenAI({
  apiKey: env.get('OPENAI_API_KEY'),
  model: 'gpt-4o',
  temperature: 0.3,
  maxTokens: 1000,
  topP: 0.9,
  frequencyPenalty: 0.2,
  presencePenalty: 0.2,
})
