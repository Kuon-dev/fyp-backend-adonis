import type { ApplicationService } from '@adonisjs/core/types'
import app from '@adonisjs/core/services/app'
import RabbitMQService from '#integrations/rabbitmq/rabbitmq_service'
import env from '#start/env'
//import { Disk } from '@adonisjs/drive'

export default class AppProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  register() {
    app.container.singleton('te', () => {
      const rabbitmqService = new RabbitMQService()
      return rabbitmqService
    })
  }

  /**
   *
   * The container bindings have booted
   */
  async boot() {
    await import('../src/extensions.js')

    // const apiKey = env.get("LEMON_SQUEEZY_API_KEY")
    //
    // lemonSqueezySetup({
    //   apiKey,
    //   onError: (error) => console.error("Error while setting up Lemon Squeezy", error),
    // });
    //
    // fetch("https://api.lemonsqueezy.com/v1/stores/94953", {
    //   headers: {
    //     "Authorization": `Bearer ${apiKey}`,
    //   },
    // }).then((response) => response.json()).then((data) => console.log(data));
  }

  /**
   * The application has been booted
   */
  async start() {
    const rabbitmqService = app.container.make('rabbitmq') as RabbitMQService
    await rabbitmqService.init()

    // Start the code check worker
    const codeCheckWorker = new CodeCheckWorker(
      rabbitmqService,
      app.container.make('code_check_service')
    )
    await codeCheckWorker.start()

    console.log('RabbitMQ service and Code Check Worker initialized')
  }

  /**
   * The process has been started
   */
  async ready() {}

  /**
   * Preparing to shutdown the app
   */
  async shutdown() {
    const rabbitmqService = this.app.container.make('rabbitmq') as RabbitMQService
    await rabbitmqService.close()
  }
}
