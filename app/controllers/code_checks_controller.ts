import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core';
import CodeCheckService from '#services/code_check_service';
import { Exception } from '@adonisjs/core/exceptions';

/**
 * Controller class for handling Code Check operations.
 */
@inject()
export default class CodeCheckController {
  constructor(protected codeCheckService: CodeCheckService) {}

  /**
   * Perform a code check.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @bodyParam code - The code to be checked.
   * @bodyParam language - The programming language of the code.
   * @bodyParam chatHistory - The chat history for context.
   */
  public async checkCode({ request, response }: HttpContext) {
    const { code, language, chatHistory } = request.body();

    if (!code || !language) {
      throw new Exception('Code and language are required', {status: 400});
    }

    try {
      const result = await this.codeCheckService.performCodeCheck(code, language, chatHistory || []);
      return response.send(result);
    } catch (error) {
      return response.abort({ message: error.message }, 500);
    }
  }
}

