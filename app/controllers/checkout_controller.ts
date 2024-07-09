import type { HttpContext } from '@adonisjs/core/http'
import Stripe from 'stripe';
import { prisma } from '#services/prisma_service';
import env from "#start/env";
import logger from '@adonisjs/core/services/logger'
import { OrderService } from '#services/order_service';
import { OrderStatus } from '@prisma/client';
import { inject } from '@adonisjs/core';

const stripe = new Stripe(env.get("STRIPE_SECRET_KEY"), {
  apiVersion: '2024-04-10',
});

/**
 * Controller class for handling Payment operations.
 */
@inject()
export default class PaymentController {
  constructor(protected orderService: OrderService) {}

  /**
   * @createPaymentIntent
   * @description Create a Stripe Payment Intent for purchasing code repositories.
   * @requestBody {
   *   "repoIds": ["repo1", "repo2", "repo3"]
   * }
   * @responseBody 200 - {
   *   "clientSecret": "pi_3N2XuXXXXXXXXXXX_secret_XXXXXXXX"
   * }
   * @responseBody 400 - { "error": "Invalid repoIds provided" }
   * @responseBody 404 - { "error": "No repos found for the provided IDs" }
   * @responseBody 500 - { "error": "Error creating payment intent" }
   */
  public async createPaymentIntent({ request, response }: HttpContext) {
    const { repoIds } = request.body();

    if (!Array.isArray(repoIds) || repoIds.length === 0) {
      return response.status(400).send({ error: 'Invalid repoIds provided' });
    }

    const repos = await prisma.codeRepo.findMany({
      where: { id: { in: repoIds } },
    });

    if (repos.length === 0) {
      return response.status(404).send({ error: 'No repos found for the provided IDs' });
    }

    const amount = repos.reduce((total, repo) => total + repo.price, 0);

    try {
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
   * @getPaymentIntent
   * @description Retrieve a Stripe Payment Intent.
   * @paramParam paymentIntentId - The ID of the Stripe Payment Intent.
   * @responseBody 200 - Stripe PaymentIntent object
   * @responseBody 500 - { "error": "Error retrieving payment intent" }
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
   * @submitPaymentIntent
   * @description Submit a Stripe Payment Intent and create an order.
   * @requestBody {
   *   "paymentIntentId": "pi_3N2XuXXXXXXXXXXX",
   *   "userId": "user123"
   * }
   * @responseBody 200 - { "success": true }
   * @responseBody 400 - { "error": "Payment not completed" }
   * @responseBody 500 - { "error": "Error confirming payment intent" }
   */
  public async submitPaymentIntent({ request, response }: HttpContext) {
    const { paymentIntentId, userId } = request.body();

    try {
      const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        const repoIds = paymentIntent.metadata.repoIds.split(',');

        const repos = await prisma.codeRepo.findMany({
          where: { id: { in: repoIds } },
        });

        await prisma.$transaction(async (p) => {
          for (const repo of repos) {
            await p.order.create({
              data: {
                userId,
                codeRepoId: repo.id,
                totalAmount: repo.price,
                status: OrderStatus.pending,
              },
            });
          }
        });

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
