import { SupportTicketType, SupportTicketStatus } from '@prisma/client'
import { prisma } from './prisma_service.js'
import { kyselyDb } from '#database/kysely'
import { z } from 'zod'
import mail from '@adonisjs/mail/services/main'
import { render } from '@react-email/components'
import env from '#start/env'
import KortexSupportTicketReceived from '#resources/mail-templates/support-received.mail'

export const ticketSchema = z.object({
  id: z.string().cuid(),
  email: z.string().email(),
  title: z.string().min(1),
  content: z.string().min(1),
  status: z.nativeEnum(SupportTicketStatus),
  type: z.nativeEnum(SupportTicketType),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const newTicketSchema = z.object({
  email: z.string().email(),
  title: z.string().min(1),
  content: z.string().min(1),
  type: z.nativeEnum(SupportTicketType),
})

/**
 * Service class for handling support ticket operations.
 */
export default class SupportTicketService {
  /**
   * Creates a new support ticket.
   *
   * @param email - The email address of the user.
   * @param title - The title of the support ticket.
   * @param content - The content of the support ticket.
   * @param type - The type of the support ticket.
   * @returns The created support ticket.
   */
  public async createTicket(
    email: string,
    title: string,
    content: string,
    type: SupportTicketType
  ) {
    const validatedData = newTicketSchema.parse({ email, title, content, type })

    try {
      const ticket = await prisma.supportTicket.create({
        data: validatedData,
      })
      return ticket
    } catch (error: any) {
      throw new Error(`Failed to create ticket: ${error.message}`)
    }
  }

  /**
   * Retrieves paginated support tickets.
   *
   * @param page - The page number for pagination.
   * @param limit - The number of tickets per page.
   * @returns An object containing the tickets and pagination metadata.
   */
  //public async getPaginatedTickets(page: number = 1, limit: number = 10) {
  //  const offset = (page - 1) * limit
  //  try {
  //    const [tickets, total] = await Promise.all([
  //      prisma.supportTicket.findMany({
  //        skip: offset,
  //        take: limit,
  //        orderBy: { createdAt: 'desc' },
  //      }),
  //      prisma.supportTicket.count(),
  //    ])
  //
  //    return {
  //      data: tickets,
  //      meta: {
  //        total,
  //        page,
  //        limit,
  //        lastPage: Math.ceil(total / limit),
  //      },
  //    }
  //  } catch (error: any) {
  //    throw new Error(`Failed to retrieve paginated tickets: ${error.message}`)
  //  }
  //}

  /**
   * Retrieves all support tickets.
   *
   * @returns An array of all support tickets.
   */
  public async getAllTickets() {
    try {
      return await prisma.supportTicket.findMany({
        orderBy: { createdAt: 'desc' },
      })
    } catch (error: any) {
      throw new Error(`Failed to retrieve all tickets: ${error.message}`)
    }
  }

  /**
   * Retrieves a support ticket by its ID.
   *
   * @param id - The ID of the support ticket.
   * @returns The support ticket or null if not found.
   */
  public async getTicketById(id: string) {
    try {
      return await prisma.supportTicket.findUnique({ where: { id } })
    } catch (error: any) {
      throw new Error(`Failed to retrieve ticket: ${error.message}`)
    }
  }

  /**
   * Retrieves support tickets by title using full text search.
   *
   * @param title - The title to search for.
   * @returns An array of matching support tickets.
   */
  public async getTicketsByTitle(title: string) {
    try {
      const result = await kyselyDb
        .selectFrom('SupportTicket')
        .selectAll()
        .where('title', 'ilike', `%${title}%`)
        .execute()

      return result
    } catch (error: any) {
      throw new Error(`Failed to retrieve tickets by title: ${error.message}`)
    }
  }

  /**
   * Retrieves support tickets by email.
   *
   * @param email - The email address to search for.
   * @returns An array of matching support tickets.
   */
  public async getTicketsByEmail(email: string) {
    try {
      const result = await kyselyDb
        .selectFrom('SupportTicket')
        .selectAll()
        .where('email', '=', email)
        .execute()

      return result
    } catch (error: any) {
      throw new Error(`Failed to retrieve tickets by email: ${error.message}`)
    }
  }

  /**
   * Retrieves support tickets by status.
   *
   * @param status - The status to search for.
   * @returns An array of matching support tickets.
   */
  public async getTicketsByStatus(status: SupportTicketStatus) {
    try {
      const result = await kyselyDb
        .selectFrom('SupportTicket')
        .selectAll()
        .where('status', '=', status)
        .execute()

      return result
    } catch (error: any) {
      throw new Error(`Failed to retrieve tickets by status: ${error.message}`)
    }
  }

  /**
   * Updates the status of a support ticket.
   *
   * @param id - The ID of the support ticket.
   * @param status - The new status of the support ticket.
   * @returns The updated support ticket or null if not found.
   */
  public async updateTicket(id: string, status: SupportTicketStatus) {
    try {
      return await prisma.supportTicket.update({
        where: { id },
        data: { status },
      })
    } catch (error: any) {
      if (error.code === 'P2025') {
        return null
      }
      throw new Error(`Failed to update ticket: ${error.message}`)
    }
  }

  /**
   * Deletes a support ticket.
   *
   * @param id - The ID of the support ticket to delete.
   * @returns True if the ticket was deleted, false if not found.
   */
  public async deleteTicket(id: string) {
    try {
      await prisma.supportTicket.delete({
        where: { id },
      })
      return true
    } catch (error: any) {
      if (error.code === 'P2025') {
        return false
      }
      throw new Error(`Failed to delete ticket: ${error.message}`)
    }
  }

  /**
   * Sends a default email notification.
   *
   * @param email - The email address to send the notification to.
   */
  public async sendDefaultEmail(email: string) {
    try {
      await mail.send((message) => {
        message
          .to(email)
          .from(env.get('SMTP_HOST') ?? '')
          .subject('Support Ticket Received')
          .html(render(KortexSupportTicketReceived()))
      })

      return {
        success: true,
        message: 'Email sent successfully',
      }
    } catch (error: any) {
      throw new Error(`Failed to send email: ${error.message}`)
    }
  }
}
