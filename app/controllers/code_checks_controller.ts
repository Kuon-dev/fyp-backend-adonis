import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import CodeCheckService from '#services/code_check_service'
import { codeCheckRequestSchema, type CodeCheckRequest } from '#validators/code_check'

/**
 * Controller class for handling Code Check operations.
 */
@inject()
export default class CodeCheckController {
  constructor(protected codeCheckService: CodeCheckService) {}

  /**
   * @checkCode
   * @description Perform a code check and provide quality analysis.
   * @requestBody {
   *   "code": "function example() { return 'Hello, World!' }",
   *   "language": "javascript",
   * }
   * @responseBody 200 - {
   *   "score": 7,
   *   "description": "The code is simple and straightforward...",
   *   "suggestion": "Consider adding error handling...",
   *   "securityScore": 8,
   *   "maintainabilityScore": 7,
   *   "readabilityScore": 9,
   *   "securitySuggestion": "No major security issues found...",
   *   "maintainabilitySuggestion": "Add comments to explain the function's purpose...",
   *   "readabilitySuggestion": "The code is already quite readable...",
   *   "eslintResults": [{ "ruleId": "semi", "message": "Missing semicolon." }]
   * }
   * @responseBody 400 - { "message": "Invalid input. Code and language are required." }
   * @responseBody 500 - { "message": "An error occurred while processing the request." }
   */
  public async checkCode({ request, response }: HttpContext) {
    try {
      const data = request.only(['code', 'language'])
      const validatedData = codeCheckRequestSchema.parse(data) as CodeCheckRequest

      const result = await this.codeCheckService.performCodeCheck(
        validatedData.code,
        validatedData.language,
      )
      
      return response.status(200).json(result)
    } catch (error) {
      if (error.messages) {
        // This is a validation error
        return response.status(400).json({ message: "Invalid input", errors: error.messages })
      }
      
      console.error('Code check error:', error)
      return response.status(500).json({ message: 'An error occurred while processing the request.' })
    }
  }
}
