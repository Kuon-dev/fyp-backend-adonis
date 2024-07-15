
import { faker } from '@faker-js/faker';
import { generateIdFromEntropySize } from 'lucia';
import { PayoutRequest, PayoutRequestStatus, Payout, PayoutStatus, SellerProfile, Order } from '@prisma/client';
import { prisma } from '#services/prisma_service';
import { DateTime } from 'luxon';

function generateDates() {
  const now = DateTime.now();
  const twoMonthsAgo = now.minus({ months: 2 });

  const createdAt = faker.date.between({ from: twoMonthsAgo.toJSDate(), to: now.toJSDate() });
  const updatedAt = faker.date.between({ from: createdAt, to: now.toJSDate() });
  const processedAt = faker.datatype.boolean(0.7)
    ? faker.date.between({ from: updatedAt, to: now.toJSDate() })
    : null;
  return { createdAt, updatedAt, processedAt };
}

function generatePayoutRequest(sellerProfiles: SellerProfile[]): Omit<PayoutRequest, 'id'> {
  const sellerProfile = faker.helpers.arrayElement(sellerProfiles);
  const { createdAt, updatedAt, processedAt } = generateDates();

  return {
    sellerProfileId: sellerProfile.id,
    totalAmount: parseFloat(faker.finance.amount(100, 10000, 2)),
    status: faker.helpers.arrayElement(Object.values(PayoutRequestStatus)),
    createdAt,
    updatedAt,
    processedAt,
    lastPayoutDate: processedAt,
  };
}

function generatePayout(payoutRequest: PayoutRequest): Omit<Payout, 'id'> {
  const { createdAt, updatedAt } = generateDates();

  return {
    sellerProfileId: payoutRequest.sellerProfileId,
    payoutRequestId: payoutRequest.id,
    totalAmount: payoutRequest.totalAmount,
    currency: 'USD',
    status: faker.helpers.arrayElement(Object.values(PayoutStatus)),
    stripePayoutId: faker.datatype.boolean(0.8) ? faker.string.uuid() : null,
    createdAt,
    updatedAt,
  };
}

async function processBatch(payoutRequests: Omit<PayoutRequest, 'id'>[], sellerProfiles: SellerProfile[]) {
  const createdPayoutRequests: PayoutRequest[] = [];
  const createdPayouts: Payout[] = [];

  for (const payoutRequestData of payoutRequests) {
    try {
      const createdPayoutRequest = await prisma.payoutRequest.create({
        data: {
          ...payoutRequestData,
          id: generateIdFromEntropySize(32),
        },
      });

      createdPayoutRequests.push(createdPayoutRequest);
      console.log(`Created payout request: ${createdPayoutRequest.id}`);

      if (createdPayoutRequest.status === 'APPROVED' || createdPayoutRequest.status === 'PROCESSED') {
        const payoutData = generatePayout(createdPayoutRequest);
        const createdPayout = await prisma.payout.create({
          data: {
            ...payoutData,
            id: generateIdFromEntropySize(32),
          },
        });

        createdPayouts.push(createdPayout);
        console.log(`Created payout: ${createdPayout.id}`);
      }

      // Update related orders
      await prisma.order.updateMany({
        where: {
          codeRepo: {
            userId: createdPayoutRequest.sellerProfileId,
          },
          status: 'SUCCEEDED',
          payoutRequestId: null,
        },
        data: {
          payoutRequestId: createdPayoutRequest.id,
        },
      });

    } catch (error) {
      console.error(`Error creating payout request or payout:`, error);
    }
  }

  return { createdPayoutRequests, createdPayouts };
}

export async function seedPayoutsAndRequests(count: number = 50) {
  let successfullyCreatedRequests = 0;
  let successfullyCreatedPayouts = 0;
  const batchSize = 10; // Adjust this value based on your needs

  try {
    const sellerProfiles = await prisma.sellerProfile.findMany();

    if (sellerProfiles.length === 0) {
      throw new Error('No seller profiles found. Please seed seller profiles first.');
    }

    for (let i = 0; i < count; i += batchSize) {
      const batchCount = Math.min(batchSize, count - i);
      const payoutRequestBatch = Array.from({ length: batchCount }, () => generatePayoutRequest(sellerProfiles));
      const { createdPayoutRequests, createdPayouts } = await processBatch(payoutRequestBatch, sellerProfiles);
      successfullyCreatedRequests += createdPayoutRequests.length;
      successfullyCreatedPayouts += createdPayouts.length;
    }

    console.log(`Successfully seeded ${successfullyCreatedRequests} payout requests and ${successfullyCreatedPayouts} payouts`);
  } catch (error) {
    console.error('Error seeding payouts and requests:', error);
  } finally {
    await prisma.$disconnect();
  }

  return { successfullyCreatedRequests, successfullyCreatedPayouts };
}

