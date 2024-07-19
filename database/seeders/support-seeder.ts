import { faker } from '@faker-js/faker'
import { generateIdFromEntropySize } from 'lucia'
import { SupportTicket, SupportTicketStatus, SupportTicketType } from '@prisma/client'
import { prisma } from '#services/prisma_service'
import { DateTime } from 'luxon'

function generateDates() {
  const now = DateTime.now()
  const oneMonthAgo = now.minus({ months: 1 })
  const createdAt = faker.date.between({ from: oneMonthAgo.toJSDate(), to: now.toJSDate() })
  const updatedAt = faker.date.between({ from: createdAt, to: now.toJSDate() })
  return { createdAt, updatedAt }
}

function generateSupportTicket(): Omit<SupportTicket, 'id'> {
  const { createdAt, updatedAt } = generateDates()
  const status = faker.helpers.arrayElement(Object.values(SupportTicketStatus))
  const type = faker.helpers.arrayElement(Object.values(SupportTicketType))

  const titlePrefixes = {
    [SupportTicketType.general]: ['Question about', 'Issue with', 'Feedback on'],
    [SupportTicketType.technical]: ['Bug in', 'Error when', 'Problem with'],
    [SupportTicketType.payment]: ['Payment failed for', 'Refund request for', 'Billing issue with'],
  }

  const titlePrefix = faker.helpers.arrayElement(titlePrefixes[type])
  const title = `${titlePrefix} ${faker.lorem.words(3)}`

  return {
    email: faker.internet.email(),
    title,
    content: faker.lorem.paragraphs(2),
    status,
    type,
    createdAt,
    updatedAt,
  }
}

async function processBatch(tickets: Omit<SupportTicket, 'id'>[]) {
  const createdTickets: SupportTicket[] = []
  for (const ticketData of tickets) {
    try {
      const createdTicket = await prisma.supportTicket.create({
        data: {
          ...ticketData,
          id: generateIdFromEntropySize(32),
        },
      })
      createdTickets.push(createdTicket)
      console.log(`Created support ticket: ${createdTicket.id}`)
    } catch (error) {
      console.error(`Error creating support ticket:`, error)
    }
  }
  return createdTickets
}

export async function seedSupportTickets(count: number = 50) {
  let successfullyCreated = 0
  const batchSize = 10 // Adjust this value based on your needs

  try {
    for (let i = 0; i < count; i += batchSize) {
      const batchCount = Math.min(batchSize, count - i)
      const ticketBatch = Array.from({ length: batchCount }, generateSupportTicket)
      const createdTickets = await processBatch(ticketBatch)
      successfullyCreated += createdTickets.length
    }
    console.log(
      `Successfully seeded ${successfullyCreated} out of ${count} requested support tickets`
    )
  } catch (error) {
    console.error('Error seeding support tickets:', error)
  } finally {
    await prisma.$disconnect()
  }

  return { successfullyCreated }
}

// Optional: Add a function to delete all support tickets (useful for testing)
export async function deleteAllSupportTickets() {
  try {
    const { count } = await prisma.supportTicket.deleteMany()
    console.log(`Deleted ${count} support tickets`)
    return count
  } catch (error) {
    console.error('Error deleting support tickets:', error)
  } finally {
    await prisma.$disconnect()
  }
}
