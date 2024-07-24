import { OpenAIEmbeddings } from '@langchain/openai'
import { HNSWLib } from '@langchain/community/vectorstores/hnswlib'
import { formatDocumentsAsString } from 'langchain/util/document'
import { PromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence, RunnablePassthrough } from '@langchain/core/runnables'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { codeCheckSchema } from '#validators/code_check'
import logger from '@adonisjs/core/services/logger'
import { pdfDocReader } from '../integrations/langchain/document_reader.js'
import { prisma } from '#services/prisma_service'
import { openaiModel } from '../integrations/langchain/openai.js'
import { ESLint } from 'eslint'

interface CodeCheckResult {
  securityScore: number
  maintainabilityScore: number
  readabilityScore: number
  securitySuggestion: string
  maintainabilitySuggestion: string
  readabilitySuggestion: string
  overallDescription: string
  eslintErrorCount: number
  eslintFatalErrorCount: number
}

export default class CodeCheckService {
  private vectorStore: HNSWLib | null = null
  private readonly condenseQuestionPrompt: PromptTemplate
  private readonly answerPrompt: PromptTemplate
  private readonly jsonSchema: object
  private eslint: ESLint

  constructor() {
    this.condenseQuestionPrompt = PromptTemplate.fromTemplate(`
      Given the following code, analyze it for security, maintainability, and readability:
      Code: {question}
      Provide a concise summary of the main concerns in each area.
    `)

    this.answerPrompt = PromptTemplate.fromTemplate(`
      Based on the following context and code, provide a comprehensive analysis:
      Context: {context}
      Code: {question}

      1. Overall Description: Summarize the code quality, considering security, maintainability, and readability in one or two sentences.

      2. Security Analysis:
         - Score the code's security on a scale of 0 to 100, where 0 is extremely insecure and 100 is highly secure.
         - Provide specific suggestions for improving security.

      3. Maintainability Analysis:
         - Score the code's maintainability on a scale of 0 to 100, where 0 is very difficult to maintain and 100 is easily maintainable.
         - Provide specific suggestions for improving maintainability.

      4. Readability Analysis:
         - Score the code's readability on a scale of 0 to 100, where 0 is very difficult to read and 100 is easily readable.
         - Provide specific suggestions for improving readability.

      Please ensure all suggestions are based solely on the given code, and ensure all fields mentioned above are fulfilled.
    `)

    this.jsonSchema = {
      title: 'CodeCheckResult',
      type: 'object',
      properties: {
        securityScore: { type: 'integer', minimum: 0, maximum: 100 },
        maintainabilityScore: { type: 'integer', minimum: 0, maximum: 100 },
        readabilityScore: { type: 'integer', minimum: 0, maximum: 100 },
        securitySuggestion: { type: 'string' },
        maintainabilitySuggestion: { type: 'string' },
        readabilitySuggestion: { type: 'string' },
        overallDescription: { type: 'string' },
      },
      required: [
        'securityScore',
        'maintainabilityScore',
        'readabilityScore',
        'securitySuggestion',
        'maintainabilitySuggestion',
        'readabilitySuggestion',
        'overallDescription',
      ],
    }

    // Initialize ESLint with settings for JSX and TSX
    this.eslint = new ESLint({
      useEslintrc: false,
      overrideConfig: {
        parser: '@typescript-eslint/parser',
        parserOptions: {
          ecmaVersion: 2021,
          sourceType: 'module',
          ecmaFeatures: {
            jsx: true,
          },
        },
        plugins: ['react', '@typescript-eslint'],
        extends: [
          'eslint:recommended',
          'plugin:react/recommended',
          'plugin:@typescript-eslint/recommended',
        ],
        rules: {
          // Add any specific rules you want to enforce
          'react/prop-types': 'off', // Example: Turn off prop-types rule
        },
      },
    })
  }

  private async initializeVectorStore(): Promise<void> {
    if (!this.vectorStore) {
      this.vectorStore = await HNSWLib.fromTexts(
        pdfDocReader.map((doc) => doc.pageContent),
        pdfDocReader.map((_, index) => ({ id: index + 1 })),
        new OpenAIEmbeddings()
      )
    }
  }

  private createStandaloneQuestionChain(): RunnableSequence {
    return RunnableSequence.from([
      {
        question: (input: { question: string; chat_history: [string, string][] }) => input.question,
        chat_history: (input: { question: string; chat_history: [string, string][] }) =>
          this.formatChatHistory(input.chat_history),
      },
      this.condenseQuestionPrompt,
      openaiModel,
      new StringOutputParser(),
    ])
  }

  private formatChatHistory(chatHistory: [string, string][]): string {
    return chatHistory
      .map(([human, assistant]) => `Human: ${human}\nAssistant: ${assistant}`)
      .join('\n')
  }

  private async lintCode(
    code: string,
    language: 'JSX' | 'TSX'
  ): Promise<{ errorCount: number; fatalErrorCount: number }> {
    const extension = language === 'JSX' ? '.jsx' : '.tsx'
    const results = await this.eslint.lintText(code, { filePath: `temp${extension}` })
    return {
      errorCount: results[0].errorCount,
      fatalErrorCount: results[0].fatalErrorCount,
    }
  }

  public async performCodeCheck(code: string, language: 'JSX' | 'TSX'): Promise<CodeCheckResult> {
    try {
      await this.initializeVectorStore()

      if (!this.vectorStore) {
        throw new Error('Vector store initialization failed')
      }

      const retriever = this.vectorStore.asRetriever()
      const standaloneQuestionChain = this.createStandaloneQuestionChain()

      const answerChain = RunnableSequence.from([
        {
          context: retriever.pipe(formatDocumentsAsString),
          question: new RunnablePassthrough(),
        },
        this.answerPrompt,
        openaiModel.withStructuredOutput(this.jsonSchema),
      ])

      const conversationalRetrievalQAChain = standaloneQuestionChain.pipe(answerChain)

      const result = await conversationalRetrievalQAChain.invoke({
        question: `Analyze the following ${language} code for overall description, security, maintainability, and readability:\n\n${code}`,
        chat_history: [],
      })

      const { errorCount, fatalErrorCount } = await this.lintCode(code, language)

      logger.info({ message: 'Code check result', result })
      logger.info({ message: 'ESLint error counts', errorCount, fatalErrorCount })

      const finalResult: CodeCheckResult = {
        ...codeCheckSchema.parse(result),
        eslintErrorCount: errorCount,
        eslintFatalErrorCount: fatalErrorCount,
      }

      logger.info({ message: 'Code check completed', result: finalResult })
      return finalResult
    } catch (error) {
      logger.error({ message: 'Error performing code check', error })
      throw new Error(
        `Code check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  public async performAndStoreCodeCheck(
    repoId: string,
    code: string,
    language: 'JSX' | 'TSX'
  ): Promise<CodeCheckResult> {
    try {
      const result = await this.performCodeCheck(code, language)

      await this.storeCodeCheckResult(repoId, result)

      return result
    } catch (error) {
      logger.error({ message: 'Error performing and storing code check', error, repoId })
      throw new Error(
        `Code check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private async storeCodeCheckResult(repoId: string, result: CodeCheckResult): Promise<void> {
    try {
      await prisma.codeCheck.create({
        data: {
          repoId,
          securityScore: result.securityScore,
          maintainabilityScore: result.maintainabilityScore,
          readabilityScore: result.readabilityScore,
          securitySuggestion: result.securitySuggestion,
          maintainabilitySuggestion: result.maintainabilitySuggestion,
          readabilitySuggestion: result.readabilitySuggestion,
          overallDescription: result.overallDescription,
          eslintErrorCount: result.eslintErrorCount,
          eslintFatalErrorCount: result.eslintFatalErrorCount,
        },
      })

      logger.info({ message: 'Code check result stored successfully', repoId })
    } catch (error) {
      logger.error({ message: 'Error storing code check result', error, repoId })
      throw new Error(
        `Failed to store code check result: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  public async getLatestCodeCheck(repoId: string, userId: string): Promise<CodeCheckResult | null> {
    try {
      const latestCodeCheck = await prisma.codeCheck.findFirst({
        where: { repoId },
        orderBy: { createdAt: 'desc' },
      })

      if (!latestCodeCheck) {
        return null
      }

      // Fetch user and repo information
      const user = await prisma.user.findUnique({ where: { id: userId } })
      const repo = await prisma.codeRepo.findUnique({ where: { id: repoId } })

      if (!user || !repo) {
        throw new Error('User or repository not found')
      }

      // Check if user is admin or repo owner
      const isAdmin = user.role === 'ADMIN'
      const isOwner = repo.userId === userId

      // Prepare the result object
      const result: Partial<CodeCheckResult> = {
        securityScore: latestCodeCheck.securityScore,
        maintainabilityScore: latestCodeCheck.maintainabilityScore,
        readabilityScore: latestCodeCheck.readabilityScore,
        eslintErrorCount: latestCodeCheck.eslintErrorCount,
        eslintFatalErrorCount: latestCodeCheck.eslintFatalErrorCount,
      }

      // Include detailed descriptions only for admin or repo owner
      if (isAdmin || isOwner) {
        result.securitySuggestion = latestCodeCheck.securitySuggestion
        result.maintainabilitySuggestion = latestCodeCheck.maintainabilitySuggestion
        result.readabilitySuggestion = latestCodeCheck.readabilitySuggestion
        result.overallDescription = latestCodeCheck.overallDescription
      }

      return result as CodeCheckResult
    } catch (error) {
      logger.error({ message: 'Error retrieving latest code check', error, repoId, userId })
      throw new Error(
        `Failed to retrieve latest code check: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}
