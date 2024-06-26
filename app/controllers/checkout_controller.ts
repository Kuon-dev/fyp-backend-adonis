
import type { HttpContext } from '@adonisjs/core/http'
import Stripe from 'stripe';
import { prisma } from '#services/prisma_service';
import env from "#start/env";
import logger from '@adonisjs/core/services/logger'
import { OrderService } from '#services/order_service';
import { OrderStatus } from '@prisma/client';

const stripe = new Stripe(env.get("STRIPE_SECRET_KEY"), {
  apiVersion: '2024-04-10',
});

/**
 * Controller class for handling Payment operations.
 */
export default class PaymentController {
  private orderService: OrderService;

  constructor() {
    this.orderService = new OrderService();
  }

  /**
   * Create a Stripe Payment Intent.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @bodyParam repoIds - An array of IDs of the Repos to purchase.
   */
  public async createPaymentIntent({ request, response }: HttpContext) {
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

    // Calculate the total amount for the payment intent
    const amount = repos.reduce((total, repo) => total + repo.price, 0);

    try {
      // Create a Payment Intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'usd',
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          repoIds: repoIds.join(','),
        },
      });

      return response.send({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
      logger.error(error);
      return response.status(500).send({ error: 'Error creating payment intent' });
    }
  }

  /**
   * Retrieve a Stripe Payment Intent.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @paramParam paymentIntentId - The ID of the Stripe Payment Intent.
   */
  public async getPaymentIntent({ params, response }: HttpContext) {
    const { paymentIntentId } = params;

    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      return response.send(paymentIntent);
    } catch (error) {
      logger.error(error);
      return response.status(500).send({ error: 'Error retrieving payment intent' });
    }
  }

  /**
   * Submit a Stripe Payment Intent and create an order.
   *
   * @param {HttpContext} ctx - The HTTP context object.
   * @bodyParam paymentIntentId - The ID of the Stripe Payment Intent.
   * @bodyParam userId - The ID of the user making the payment.
   */
  public async submitPaymentIntent({ request, response }: HttpContext) {
    const { paymentIntentId, userId } = request.body();

    try {
      // Confirm the Payment Intent
      const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        const repoIds = paymentIntent.metadata.repoIds.split(',');

        // Retrieve the repos from the database
        const repos = await prisma.codeRepo.findMany({
          where: { id: { in: repoIds } },
        });

        // Create orders for each repo
        for (const repo of repos) {
          await this.orderService.createOrder({
            userId,
            codeRepoId: repo.id,
            totalAmount: repo.price,
          });
        }

        return response.send({ success: true });
      } else {
        return response.status(400).send({ error: 'Payment not completed' });
      }
    } catch (error) {
      logger.error(error);
      return response.status(500).send({ error: 'Error confirming payment intent' });
    }
  }
}

