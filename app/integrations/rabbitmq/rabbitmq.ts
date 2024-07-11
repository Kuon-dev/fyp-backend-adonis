//import { inject } from '@adonisjs/core'
import amqp, { Connection, Channel, ConsumeMessage } from 'amqplib'
import env from '#start/env'

//@inject()
export default class RabbitMQService {
  private connection: Connection | null = null
  private channel: Channel | null = null

  constructor() {}

  /**
   * Initialize the RabbitMQ connection and channel
   */
  public async init() {
    try {
      this.connection = await amqp.connect(env.get('RABBITMQ_URL'))
      this.channel = await this.connection.createChannel()
      console.log('Connected to RabbitMQ')
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error)
      throw error
    }
  }

  // ... (rest of the methods remain the same)
}
