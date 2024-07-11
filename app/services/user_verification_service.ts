import { createDate, TimeSpan, isWithinExpirationDate } from 'oslo'
import { generateIdFromEntropySize } from 'lucia'
import { alphabet, generateRandomString } from 'oslo/crypto'
import { prisma } from './prisma_service.js'
import type { User } from 'lucia'
import mail from '@adonisjs/mail/services/main'
import env from '#start/env'
import { render } from '@react-email/components'
import KortexVerifyEmail from '../../resources/mail-templates/verify-email.mail.js'

export default class UserVerificationService {
  async generateEmailVerificationCode(userId: string, email: string): Promise<string> {
    // delete all previous codes
    await prisma.emailVerificationCode.deleteMany({
      where: { userId },
    })

    const code = generateRandomString(8, alphabet('0-9'))
    await prisma.emailVerificationCode.create({
      data: {
        id: generateIdFromEntropySize(32),
        userId,
        email,
        code,
        expiresAt: createDate(new TimeSpan(15, 'm')), // 15 minutes
      },
    })
    return code
  }

  async sendVerificationCode(email: string, code: string, token: string): Promise<void> {
    await mail.send((message) => {
      message
        .to(email)
        .from(env.get('SMTP_HOST') ?? '')
        .subject('Verify your email address')
        .html(render(KortexVerifyEmail({ validationCode: code, authToken: token })))
    })
  }

  async verifyVerificationCode(user: User, code: string): Promise<boolean> {
    const transaction = await prisma.$transaction(async (tx) => {
      const databaseCode = await tx.emailVerificationCode.findFirstOrThrow({
        where: { userId: user.id },
      })

      if (!databaseCode || databaseCode.code !== code) {
        return false
      }

      if (!isWithinExpirationDate(databaseCode.expiresAt) || databaseCode.email !== user.email) {
        return false
      }

      await tx.emailVerificationCode.delete({ where: { id: databaseCode.id } })

      return true
    })

    return transaction
  }
}
