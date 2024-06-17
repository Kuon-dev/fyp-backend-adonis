import type { HttpContext } from '@adonisjs/core/http'
import Stripe from 'stripe';
import { prisma } from '#services/prisma_service';
import env from "#start/env";
import logger from '@adonisjs/core/services/logger'

// const stripe = new Stripe('YOUR_STRIPE_SECRET_KEY', {
//   apiVersion: '2022-11-15',
// });

const stripe = new Stripe(env.get("STRIPE_SECRET_KEY"), {
  apiVersion: '2024-04-10',
});


/**
 * Controller class for handling Checkout operations.
 */
// @inject()
export default class CheckoutController {

  /**
   * Create a Stripe Checkout Session.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @bodyParam repoIds - An array of IDs of the Repos to purchase.
   */
  public async createCheckoutSession({ request, response }: HttpContext) {
    const { repoIds } = request.body();

    if (!Array.isArray(repoIds) || repoIds.length === 0) {
      return response.status(400).send({ error: 'Invalid repoIds provided' });
    }

    // Retrieve the repos from the database
    const repos = await prisma.codeRepo.findMany({
      where: { id: { in: repoIds } },
    });

    if (repos.length === 0) {
      return response.status(404).send({ error: 'No repos found for the provided IDs' });
    }

    // Create line items for the checkout session
    const lineItems = repos.map(repo => ({
      price: repo.stripePriceId!,
      quantity: 1,
    }));

    try {
      // Create a Checkout Session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${env.get('FRONTEND_URL')}/checkout/success`,
        cancel_url: `${env.get('FRONTEND_URL')}/checkout/cancel`,
      });

      return response.send({ url: session.url, id: session.id });
    } catch (error) {
      logger.error(error);
      return response.status(500).send({ error: 'Error creating checkout session' });
    }
  }

  /**
   * Retrieve a Stripe Checkout Session.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam sessionId - The ID of the Stripe Checkout Session.
   */
  public async getCheckoutSession({ params, response }: HttpContext) {
    const { sessionId } = params;

    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      return response.send(session);
    } catch (error) {
      logger.error(error)
      return response.status(500).send({ error: 'Error retrieving checkout session' });
    }
  }
}
