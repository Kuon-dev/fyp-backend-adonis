import type { SupportTicketType, SupportTicketStatus } from "@prisma/client";
import { prisma } from "./prisma_service.js";
import { kyselyDb } from "#database/kysely";
import { z } from "zod";
import mail from "@adonisjs/mail/services/main";
import { render } from "@react-email/components";
import env from '#start/env'
import KortexSupportTicketReceived from "#resources/mail-templates/support-received.mail";

export const ticketSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  message: z.string(),
  createdAt: z.string(),
});

export const newTicketSchema = z.object({
  email: z.string().email(),
  subject: z.string(),
  message: z.string(),
});

/**
 * Service class for handling support ticket operations.
 */
export default class SupportTicketService {
  /**
   * Validates and creates a new support ticket.
   * 
   * @param email - The email address of the user.
   * @param subject - The subject of the support ticket.
   * @param message - The message content of the support ticket.
   * @param type - The type of the support ticket.
   */
  public async createTicket(email: string, subject: string, message: string, type: SupportTicketType) {
    const valid = newTicketSchema.safeParse({ email, subject, message, type });
    if (!valid.success) throw new Error(valid.error.message);

    try {
      await prisma.supportTicket.create({
        data: {
          email,
          title: subject,
          content: message,
          type,
        },
      });
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  /**
   * Retrieves paginated support tickets.
   * 
   * @param page - The page number for pagination.
   * @param limit - The number of tickets per page.
   */
  public async getPaginatedTickets(page: number = 1, limit: number = 10) {
    const offset = (page - 1) * limit;
    return await prisma.supportTicket.findMany({
      skip: offset,
      take: limit,
    });
  }

  /**
   * Retrieves all support tickets.
   */
  public async getAllTickets() {
    return await prisma.supportTicket.findMany();
  }

  /**
   * Retrieves a support ticket by its ID.
   * 
   * @param id - The ID of the support ticket.
   */
  public async getTicketById(id: string) {
    return await prisma.supportTicket.findUnique({ where: { id } });
  }

  /**
   * Retrieves support tickets by title using full text search.
   * 
   * @param title - The title of the support tickets.
   */
  public async getTicketsByTitle(title: string) {
    const result = await kyselyDb
      .selectFrom("SupportTicket")
      .selectAll()
      .where("title", "ilike", `${title}%`)
      .execute();

    return result ?? [];
  }

  /**
   * Retrieves support tickets by email using full text search.
   * 
   * @param email - The email address of the user.
   */
  public async getTicketsByEmail(email: string) {
    const result = await kyselyDb
      .selectFrom("SupportTicket")
      .selectAll()
      .where("email", "ilike", `${email}%`)
      .execute();

    return result ?? [];
  }

  /**
   * Retrieves support tickets by status using full text search.
   * 
   * @param status - The status of the support tickets.
   */
  public async getTicketsByStatus(status: SupportTicketStatus) {
    const result = await kyselyDb
      .selectFrom("SupportTicket")
      .selectAll()
      .where("status", "ilike", `${status}`)
      .execute();

    return result ?? [];
  }

  /**
   * Updates the status of a support ticket.
   * 
   * @param id - The ID of the support ticket.
   * @param status - The new status of the support ticket.
   */
  public async updateTicket(id: string, status: SupportTicketStatus) {
    return await prisma.supportTicket.update({
      where: { id },
      data: { status },
    });
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
          .from(env.get('SMTP_HOST') ?? "")
          .subject('Verify your email address')
          .html(render(KortexSupportTicketReceived()));
      })

      return {
        success: true,
        message: "Email sent successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
