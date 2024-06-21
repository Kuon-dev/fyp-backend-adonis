import type { ApplicationService } from '@adonisjs/core/types'
import {
  // getAuthenticatedUser,
  // lemonSqueezySetup,
} from "@lemonsqueezy/lemonsqueezy.js";
import env from "#start/env"

export default class AppProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  register() {}

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
  async start() {}

  /**
   * The process has been started
   */
  async ready() {}

  /**
   * Preparing to shutdown the app
   */
  async shutdown() {}
}
