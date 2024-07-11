import { faker } from '@faker-js/faker'
// import { hash } from "@node-rs/argon2";
import type { SupportTicket, SupportTicketStatus, SupportTicketType } from '@prisma/client'

import { generateIdFromEntropySize } from 'lucia'
import { generateDates } from './utils.js'
// import { randomBoolean } from "@/utils/random";

export const generateSupportTickets = async (
  existingEmail: string[],
  count: number
): Promise<SupportTicket[]> => {
  const generatedTickets: SupportTicket[] = []
  const ticketStatus = ['inProgress', 'todo', 'backlog', 'done']
  const ticketType = ['general', 'technical', 'payment']
  const { createdAt, updatedAt, deletedAt } = generateDates()

  for (let i = 0; i < count; i++) {
    const randomEmailOrFromExisting =
      Math.random() > 0.5
        ? faker.internet.email()
        : existingEmail[Math.floor(Math.random() * existingEmail.length)]

    const ticket: SupportTicket = {
      id: generateIdFromEntropySize(32),
      email: randomEmailOrFromExisting,
      title: faker.lorem.sentence(),
      content: faker.lorem.paragraph(),
      status: ticketStatus[Math.floor(Math.random() * ticketStatus.length)] as SupportTicketStatus,
      type: ticketType[Math.floor(Math.random() * ticketType.length)] as SupportTicketType,
      createdAt,
      updatedAt,
      // deletedAt,
    }
    generatedTickets.push(ticket)
  }

  return generatedTickets
}
