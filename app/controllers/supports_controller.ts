import type { HttpContext } from '@adonisjs/core/http'
import SupportTicketService from '#services/support_service'
import { inject } from '@adonisjs/core'
import { SupportTicketStatus } from '@prisma/client'

@inject()
export default class SupportController {
  constructor(protected supportTicketService: SupportTicketService) {}

  /**
   * @createTicket
   * @description Create a new support ticket.
   * @bodyParam email string - The user's email address.
   * @bodyParam title string - The title of the support ticket.
   * @bodyParam content string - The content of the support ticket.
   * @bodyParam type string - The type of the support ticket.
   * @responseBody 201 - { "message": "Support ticket created successfully", "ticket": {...} }
   * @responseBody 400 - { "message": "Error message" }
   */
  async createTicket({ request, response }: HttpContext) {
    try {
      const { email, title, content, type } = request.only(['email', 'title', 'content', 'type'])
      const ticket = await this.supportTicketService.createTicket(email, title, content, type)
      return response.status(201).json({ message: 'Support ticket created successfully', ticket })
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  /**
   * @getPaginatedTickets
   * @description Get paginated support tickets.
   * @queryParam page number - The page number for pagination.
   * @queryParam limit number - The number of tickets per page.
   * @responseBody 200 - { "data": [...], "meta": {...} }
   * @responseBody 400 - { "message": "Error message" }
   */
  async getPaginatedTickets({ request, response }: HttpContext) {
    try {
      const page = request.input('page', 1)
      const limit = request.input('limit', 10)
      const { data, meta } = await this.supportTicketService.getPaginatedTickets(Number(page), Number(limit))
      return response.ok({ data, meta })
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  /**
   * @getAllTickets
   * @description Get all support tickets.
   * @responseBody 200 - { "tickets": [...] }
   * @responseBody 400 - { "message": "Error message" }
   */
  async getAllTickets({ response }: HttpContext) {
    try {
      const tickets = await this.supportTicketService.getAllTickets()
      return response.ok({ tickets })
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  /**
   * @getTicketById
   * @description Get a support ticket by ID.
   * @paramParam id string - The ID of the support ticket.
   * @responseBody 200 - { "ticket": {...} }
   * @responseBody 404 - { "message": "Ticket not found" }
   * @responseBody 400 - { "message": "Error message" }
   */
  async getTicketById({ params, response }: HttpContext) {
    try {
      const ticket = await this.supportTicketService.getTicketById(params.id)
      if (!ticket) {
        return response.notFound({ message: 'Ticket not found' })
      }
      return response.ok({ ticket })
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  /**
   * @getTicketsByTitle
   * @description Get support tickets by title.
   * @queryParam title string - The title to search for.
   * @responseBody 200 - { "tickets": [...] }
   * @responseBody 400 - { "message": "Error message" }
   */
  async getTicketsByTitle({ request, response }: HttpContext) {
    try {
      const title = request.input('title')
      const tickets = await this.supportTicketService.getTicketsByTitle(title)
      return response.ok({ tickets })
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  /**
   * @getTicketsByEmail
   * @description Get support tickets by email.
   * @queryParam email string - The email to search for.
   * @responseBody 200 - { "tickets": [...] }
   * @responseBody 400 - { "message": "Error message" }
   */
  async getTicketsByEmail({ request, response }: HttpContext) {
    try {
      const email = request.input('email')
      const tickets = await this.supportTicketService.getTicketsByEmail(email)
      return response.ok({ tickets })
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  /**
   * @getTicketsByStatus
   * @description Get support tickets by status.
   * @queryParam status string - The status to search for.
   * @responseBody 200 - { "tickets": [...] }
   * @responseBody 400 - { "message": "Error message" }
   */
  async getTicketsByStatus({ request, response }: HttpContext) {
    try {
      const status = request.input('status')
      const tickets = await this.supportTicketService.getTicketsByStatus(status)
      return response.ok({ tickets })
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  /**
   * @updateTicket
   * @description Update a support ticket status.
   * @paramParam id string - The ID of the support ticket.
   * @bodyParam status string - The new status of the support ticket.
   * @responseBody 200 - { "ticket": {...} }
   * @responseBody 400 - { "message": "Error message" }
   * @responseBody 404 - { "message": "Ticket not found" }
   */
  async updateTicket({ params, request, response }: HttpContext) {
    try {
      const { status } = request.only(['status'])
      if (!Object.values(SupportTicketStatus).includes(status)) {
        return response.badRequest({ message: 'Invalid status provided' })
      }
      const ticket = await this.supportTicketService.updateTicket(params.id, status)
      if (!ticket) {
        return response.notFound({ message: 'Ticket not found' })
      }
      return response.ok({ ticket })
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  /**
   * @deleteTicket
   * @description Delete a support ticket.
   * @paramParam id string - The ID of the support ticket.
   * @responseBody 200 - { "message": "Ticket deleted successfully" }
   * @responseBody 400 - { "message": "Error message" }
   * @responseBody 404 - { "message": "Ticket not found" }
   */
  //async deleteTicket({ params, response }: HttpContext) {
  //  try {
  //    const result = await this.supportTicketService.deleteTicket(params.id)
  //    if (!result) {
  //      return response.notFound({ message: 'Ticket not found' })
  //    }
  //    return response.ok({ message: 'Ticket deleted successfully' })
  //  } catch (error) {
  //    return response.status(400).json({ message: error.message })
  //  }
  //}

  /**
   * @sendDefaultEmail
   * @description Send a default email notification.
   * @bodyParam email string - The email address to send the notification to.
   * @responseBody 200 - { "message": "Email sent successfully" }
   * @responseBody 400 - { "message": "Error message" }
   */
  async sendDefaultEmail({ request, response }: HttpContext) {
    try {
      const { email } = request.only(['email'])
      await this.supportTicketService.sendDefaultEmail(email)
      return response.ok({ message: 'Email sent successfully' })
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }
}
