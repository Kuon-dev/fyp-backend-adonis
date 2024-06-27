import { OpenAIEmbeddings } from "@langchain/openai";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { formatDocumentsAsString } from "langchain/util/document";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence, RunnablePassthrough } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { codeCheckSchema } from "#validators/code_check";
import logger from "@adonisjs/core/services/logger";
import { pdfDocReader } from "../integrations/langchain/document_reader.js";
import { openaiModel } from "../integrations/langchain/openai.js";

/**
 * Service class for handling Code Check operations.
 */
export default class CodeCheckService {
  private condenseQuestionTemplate = `
    Given the following code, identify and highlight any potential security issues in the code.
    Standalone code: {question}
  `;
  private CONDENSE_QUESTION_PROMPT = PromptTemplate.fromTemplate(this.condenseQuestionTemplate);
  private jsonSchema = {
    title: "CodeCheckResult",
    description: "Result of the code check.",
    type: "object",
    properties: {
      score: { title: "Score", description: "The code quality score", type: "integer", minimum: 0, maximum: 10 },
      suggestion: { title: "Suggestion", description: "Suggestions for improvement based on the given code only", type: "string" },
      description: { title: "Description", description: "Describe the overall quality and problem of the code", type: "string" },
    },
    required: ["score", "suggestion", "description"],
  };

  private answerTemplate = `Review the following code for any security vulnerabilities based only on the following context without describing the code itself:
    {context}
    Code: {question}
    Description: describe the overall code quality and any potential security issues in a single sentence.
    Suggestion: provide suggestions for improvement based on the given code only.
  `;
  private ANSWER_PROMPT = PromptTemplate.fromTemplate(this.answerTemplate);

  private standaloneQuestionChain = RunnableSequence.from([
    {
      question: (input: { question: string, chat_history: [string, string][] }) => input.question,
      chat_history: (input: { question: string, chat_history: [string, string][] }) =>
        this.formatChatHistory(input.chat_history),
    },
    this.CONDENSE_QUESTION_PROMPT,
    openaiModel,
    new StringOutputParser(),
  ]);

  private formatChatHistory(chatHistory: [string, string][]) {
    const formattedDialogueTurns = chatHistory.map(
      (dialogueTurn) => `Human: ${dialogueTurn[0]}\nAssistant: ${dialogueTurn[1]}`
    );
    return formattedDialogueTurns.join("\n");
  }

  /**
   * Perform a code check and provide context-aware responses.
   *
   * @param code - The code to be checked.
   * @param language - The programming language of the code.
   * @returns The result of the code check and context-aware responses.
   */
  public async performCodeCheck(code: string, language: string) {
    try {
      const vectorStore = await HNSWLib.fromTexts(
        pdfDocReader.map((doc) => doc.pageContent),
         [{ id: 1 }, { id: 2 }],
        new OpenAIEmbeddings()
      );
      const retriever = vectorStore.asRetriever();
      const answerChain = RunnableSequence.from([
        {
          context: retriever.pipe(formatDocumentsAsString),
          question: new RunnablePassthrough(),
        },
        this.ANSWER_PROMPT,
        openaiModel.withStructuredOutput(this.jsonSchema),
      ]);

      const conversationalRetrievalQAChain = this.standaloneQuestionChain.pipe(answerChain);
      const result = await conversationalRetrievalQAChain.invoke({
        question: `Check the following code written in ${language}: ${code}`,
        chat_history: [],
      });
      logger.info(result)
      const parsedResponse = codeCheckSchema.parse(result);
      return parsedResponse;
    } catch (error) {
      logger.error(error);
      throw new Error('Error performing code check');
    }
  }
}
