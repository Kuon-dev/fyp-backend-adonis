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

  /**
   * Publish a message to a queue
   * @param {string} queue - The name of the queue
   * @param {object} message - The message to publish
   */
  public async publishMessage(queue: string, message: object) {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized')
    }

    await this.channel.assertQueue(queue, { durable: true })
    this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true })
  }

  /**
   * Consume messages from a queue
   * @param {string} queue - The name of the queue
   * @param {function} callback - The callback function to process messages
   */
  public async consume(queue: string, callback: (msg: ConsumeMessage | null) => void) {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized')
    }

    await this.channel.assertQueue(queue, { durable: true })
    await this.channel.consume(queue, callback, { noAck: false })
  }

  /**
   * Acknowledge a message
   * @param {ConsumeMessage} message - The message to acknowledge
   */
  public ack(message: ConsumeMessage) {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized')
    }

    this.channel.ack(message)
  }

  /**
   * Negatively acknowledge a message (requeue)
   * @param {ConsumeMessage} message - The message to negatively acknowledge
   */
  public nack(message: ConsumeMessage) {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized')
    }

    this.channel.nack(message, false, true)
  }

  /**
   * Close the RabbitMQ connection
   */
  public async close() {
    if (this.channel) {
      await this.channel.close()
    }
    if (this.connection) {
      await this.connection.close()
    }
  }
}
