// import type { HttpContext } from '@adonisjs/core/http'
import type { HttpContext } from '@adonisjs/core/http';
import SupportTicketService from '#services/support_service';
import { inject } from '@adonisjs/core';

/**
 * Controller class for handling support ticket operations.
 */
@inject()
export default class SupportController {
  /**
   * Creates an instance of SupportController.
   *
   * @param supportTicketService - The support ticket service.
   */
  constructor(protected supportTicketService: SupportTicketService) {}

  /**
   * Handle creating a new support ticket.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @bodyParam email - The user's email address.
   * @bodyParam subject - The subject of the support ticket.
   * @bodyParam message - The content of the support ticket.
   * @bodyParam type - The type of the support ticket.
   */
  async createTicket({ request, response }: HttpContext) {
    const { email, subject, message, type } = request.only(['email', 'subject', 'message', 'type']);

    try {
      await this.supportTicketService.createTicket(email, subject, message, type);
      return response.status(201).json({ message: 'Support ticket created successfully' });
    } catch (error) {
      return response.abort({ message: error.message }, 400);
    }
  }

  /**
   * Handle getting paginated support tickets.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @queryParam page - The page number for pagination.
   * @queryParam limit - The number of tickets per page.
   */
  async getPaginatedTickets({ request, response }: HttpContext) {
    const { page = 1, limit = 10 } = request.only(['page', 'limit']);
    try {
      const tickets = await this.supportTicketService.getPaginatedTickets(Number(page), Number(limit));
      return response.status(200).json({ tickets });
    } catch (error) {
      return response.abort({ message: error.message }, 400);
    }
  }

  /**
   * Handle getting all support tickets.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   */
  async getAllTickets({ response }: HttpContext) {
    try {
      const tickets = await this.supportTicketService.getAllTickets();
      return response.status(200).json({ tickets });
    } catch (error) {
      return response.abort({ message: error.message }, 400);
    }
  }

  /**
   * Handle getting a support ticket by ID.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam id - The ID of the support ticket.
   */
  async getTicketById({ params, response }: HttpContext) {
    const { id } = params;
    try {
      const ticket = await this.supportTicketService.getTicketById(id);
      return response.status(200).json({ ticket });
    } catch (error) {
      return response.abort({ message: error.message }, 400);
    }
  }

  /**
   * Handle getting support tickets by title.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @bodyParam title - The title of the support tickets.
   */
  async getTicketsByTitle({ request, response }: HttpContext) {
    const { title } = request.only(['title']);
    try {
      const tickets = await this.supportTicketService.getTicketsByTitle(title);
      return response.status(200).json({ tickets });
    } catch (error) {
      return response.abort({ message: error.message }, 400);
    }
  }

  /**
   * Handle getting support tickets by email.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @bodyParam email - The user's email address.
   */
  async getTicketsByEmail({ request, response }: HttpContext) {
    const { email } = request.only(['email']);
    try {
      const tickets = await this.supportTicketService.getTicketsByEmail(email);
      return response.status(200).json({ tickets });
    } catch (error) {
      return response.abort({ message: error.message }, 400);
    }
  }

  /**
   * Handle getting support tickets by status.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @bodyParam status - The status of the support tickets.
   */
  async getTicketsByStatus({ request, response }: HttpContext) {
    const { status } = request.only(['status']);
    try {
      const tickets = await this.supportTicketService.getTicketsByStatus(status);
      return response.status(200).json({ tickets });
    } catch (error) {
      return response.abort({ message: error.message }, 400);
    }
  }

  /**
   * Handle updating a support ticket status.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam id - The ID of the support ticket.
   * @bodyParam status - The new status of the support ticket.
   */
  async updateTicket({ params, request, response }: HttpContext) {
    const { id } = params;
    const { status } = request.only(['status']);
    try {
      const ticket = await this.supportTicketService.updateTicket(id, status);
      return response.status(200).json({ ticket });
    } catch (error) {
      return response.abort({ message: error.message }, 400);
    }
  }

  /**
   * Handle sending a default email notification.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @bodyParam email - The email address to send the notification to.
   */
  async sendDefaultEmail({ request, response }: HttpContext) {
    const { email } = request.only(['email']);
    try {
      const result = await this.supportTicketService.sendDefaultEmail(email);
      return response.status(200).json(result);
    } catch (error) {
      return response.abort({ message: error.message }, 400);
    }
  }
}

