import { faker } from '@faker-js/faker'

export const randomBoolean = () => Math.random() < 0.5

/**
 * Interface representing the generated dates.
 */
interface GeneratedDates {
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

/**
 * Generates creation, update, and optional deletion dates.
 *
 * @returns {GeneratedDates} - An object containing createdAt, updatedAt, and optionally deletedAt dates.
 */
export const generateDates = (): GeneratedDates => {
  const createdAt = faker.date.anytime()
  const updatedAt = new Date(
    createdAt.getTime() + faker.number.int({ min: 1000, max: 1000000 }) * 60 * 60 * 24 * 30
  )
  const deletedAt = randomBoolean()
    ? new Date(
        createdAt.getTime() +
          faker.number.int({
            min: 1000,
            max: (updatedAt.getTime() - createdAt.getTime()) / 60000,
          }) *
            60 *
            1000
      )
    : null

  return { createdAt, updatedAt, deletedAt }
}
/**
 * Generates a weighted random date for deletion.
 *
 * @returns {Date | null} - A date for deletion or null.
 */
export const weightedRandomDelete = (): Date | null => {
  const random = Math.random()
  if (random < 0.1) {
    return new Date()
  }
  return null
}

export const weightedRandomTrueBoolean = () => Math.random() < 0.9
