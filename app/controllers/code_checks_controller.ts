import type { HttpContext } from '@adonisjs/core/http'
import { inject } from '@adonisjs/core'
import CodeCheckService from '#services/code_check_service'
import { codeCheckRequestSchema, type CodeCheckRequest } from '#validators/code_check'
import { prisma } from '#services/prisma_service'

@inject()
export default class CodeCheckController {
  constructor(protected codeCheckService: CodeCheckService) {}

  public async publicCheckCode({ request, response }: HttpContext) {
    try {
      const data = request.only(['code', 'language'])
      const validatedData = codeCheckRequestSchema.parse(data) as CodeCheckRequest
      const result = await this.codeCheckService.performCodeCheck(
        validatedData.code,
        validatedData.language
      )

      return response.status(200).json(result)
    } catch (error) {
      if (error.code === 'P2002') {
        return response.status(400).json({ message: 'Invalid input', errors: error.message })
      }

      console.error('Code check error:', error)
      return response
        .status(500)
        .json({ message: 'An error occurred while processing the request.' })
    }
  }

  public async checkAndStoreCode({ request, response }: HttpContext) {
    try {
      const data = request.only(['code', 'language', 'repoId'])
      const validatedData = codeCheckRequestSchema.parse(data) as CodeCheckRequest & {
        repoId: string
      }

      const repoExists = await prisma.codeRepo.findUnique({
        where: { id: validatedData.repoId },
      })
      if (!repoExists) {
        return response.status(404).json({ message: 'Repository not found.' })
      }

      const result = await this.codeCheckService.performAndStoreCodeCheck(
        validatedData.repoId,
        validatedData.code,
        validatedData.language
      )

      return response.status(200).json(result)
    } catch (error) {
      if (error.code === 'P2002') {
        return response.status(400).json({ message: 'Invalid input', errors: error.message })
      }

      console.error('Code check error:', error)
      return response
        .status(500)
        .json({ message: 'An error occurred while processing the request.' })
    }
  }

  public async getCodeCheck({ params, response, request }: HttpContext) {
    try {
      const { id } = params

      const repoExists = await prisma.codeRepo.findUnique({
        where: { id },
      })
      if (!repoExists) {
        return response.status(404).json({ message: 'Repository not found.' })
      }

      const result = await this.codeCheckService.getLatestCodeCheck(id, request.user?.id ?? '')

      if (!result) {
        return response
          .status(404)
          .json({ message: 'No code check result found for this repository.' })
      }

      return response.status(200).json(result)
    } catch (error) {
      console.error('Error retrieving code check result:', error)
      return response
        .status(500)
        .json({ message: 'An error occurred while retrieving the code check result.' })
    }
  }
}
