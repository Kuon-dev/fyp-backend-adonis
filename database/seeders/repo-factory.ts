import { faker } from "@faker-js/faker";
import { generateIdFromEntropySize } from "lucia";
import type { CodeRepo, User, Tag } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import Stripe from 'stripe';
import { randomBoolean, weightedRandomDelete } from "./utils.js";
import { REPO_TAGS, TYPESCRIPT_VARIANT_1, TYPESCRIPT_VARIANT_2, TYPESCRIPT_VARIANT_3, TYPESCRIPT_VARIANT_4, TYPESCRIPT_VARIANT_5 } from "./constants.js";

const prisma = new PrismaClient();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
});

export const generateCodeRepos = async (users: User[], count: number = 10) => {
  const codeRepos: {repo: CodeRepo, tags: string[]}[] = [];

  //const users: User[] = await prisma.user.findMany();

  for (let i = 0; i < count; i++) {
    const userId = users[Math.floor(Math.random() * users.length)].id;

    // Create a Stripe product
    const product = await stripe.products.create({
      name: faker.company.name(),
      description: faker.lorem.sentence(),
    });

    const priceAmount = Math.floor(parseFloat(faker.commerce.price({ min: 100, max: 10000, dec: 2 })))

    // Create a Stripe price
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: priceAmount,
      currency: 'myr',
    });

    const codeRepo: CodeRepo = {
      id: generateIdFromEntropySize(32),
      userId: userId,
      sourceJs: faker.helpers.arrayElement([
        TYPESCRIPT_VARIANT_1,
        TYPESCRIPT_VARIANT_2,
        TYPESCRIPT_VARIANT_3,
        TYPESCRIPT_VARIANT_4,
        TYPESCRIPT_VARIANT_5,
      ]),
      sourceCss: "/* CSS */",
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: weightedRandomDelete(),
      visibility: randomBoolean() ? "public" : "private",
      status: faker.helpers.arrayElement(["pending", "active", "rejected"]),
      name: product.name,
      description: product.description!,
      language: faker.helpers.arrayElement(["JSX", "TSX"]),
      price: priceAmount,
      // tags: faker.helpers.arrayElements(REPO_TAGS, faker.number.int({ min: 1, max: 8 })),
      stripeProductId: product.id,
      stripePriceId: price.id,
    };

    codeRepos.push({
      repo: codeRepo,
      tags: faker.helpers.arrayElements(REPO_TAGS, faker.number.int({ min: 1, max: 8 })),
    });

    console.log('Generated code repo:', codeRepo.name)
  }

  return codeRepos;
};

