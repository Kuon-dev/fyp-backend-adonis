import CodeCheckService from '#services/code_check_service'
import { CodeRepo, CodeRepoStatus, Language } from '@prisma/client'

export interface RepoCheckContext {
  repo: CodeRepo
  userId: string
  codeCheckResult?: Awaited<ReturnType<CodeCheckService['performCodeCheck']>>
}

export abstract class RepoCheckHandler {
  protected next: RepoCheckHandler | null = null

  setNext(handler: RepoCheckHandler): RepoCheckHandler {
    this.next = handler
    return handler
  }

  async handle(context: RepoCheckContext): Promise<void> {
    if (this.next) {
      return this.next.handle(context)
    }
  }
}

// Handler implementations
export class RepoExistenceHandler extends RepoCheckHandler {
  async handle(context: RepoCheckContext): Promise<void> {
    if (!context.repo) {
      throw new Error('Repo not found')
    }
    return super.handle(context)
  }
}

export class UserAuthorizationHandler extends RepoCheckHandler {
  async handle(context: RepoCheckContext): Promise<void> {
    if (context.repo.userId !== context.userId) {
      throw new Error('User is not authorized to perform this action on the repo')
    }
    return super.handle(context)
  }
}

export class RepoStatusHandler extends RepoCheckHandler {
  constructor(private expectedStatus: CodeRepoStatus) {
    super()
  }

  async handle(context: RepoCheckContext): Promise<void> {
    if (context.repo.status === this.expectedStatus) {
      throw new Error(`Repo is already ${this.expectedStatus}`)
    }
    return super.handle(context)
  }
}

export class RepoContentHandler extends RepoCheckHandler {
  async handle(context: RepoCheckContext): Promise<void> {
    if (!context.repo.sourceJs || !context.repo.sourceCss) {
      throw new Error('Repo must have both JavaScript and CSS content')
    }
    return super.handle(context)
  }
}

export class CodeCheckHandler extends RepoCheckHandler {
  constructor(private codeCheckService: CodeCheckService) {
    super()
  }

  async handle(context: RepoCheckContext): Promise<void> {
    context.codeCheckResult = await this.codeCheckService.performCodeCheck(
      context.repo.sourceJs!,
      context.repo.language as Language
    )
    return super.handle(context)
  }
}

export class CodeQualityHandler extends RepoCheckHandler {
  async handle(context: RepoCheckContext): Promise<void> {
    if (!context.codeCheckResult) {
      throw new Error('Code check result not available')
    }

    const minAcceptableScore = 0
    if (
      context.codeCheckResult.securityScore < minAcceptableScore ||
      context.codeCheckResult.maintainabilityScore < minAcceptableScore ||
      context.codeCheckResult.readabilityScore < minAcceptableScore ||
      context.codeCheckResult.eslintErrorCount > 10 ||
      context.codeCheckResult.eslintFatalErrorCount > 0
    ) {
      throw new Error('Code quality does not meet the required standards')
    }
    return super.handle(context)
  }
}
