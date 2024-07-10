import { prisma } from "#services/prisma_service";
import { faker } from "@faker-js/faker";
import { generateComments } from "./comment-factory.js";
import { REPO_TAGS } from "./constants.js";
import { generateOrders } from "./order-factory.js";
import { generateCodeRepos } from "./repo-factory.js";
import { generateReviews } from "./review-factorty.js";
import { generateSupportTickets } from "./support-factorty.js";
import { generateUsers } from "./user-factory.js";
import { generateSellerProfiles } from "./seller-profile-factory.js";
import { CodeRepo } from "@prisma/client";

async function main() {

  const { users, profiles } = await generateUsers(100);
  await prisma.user.createMany({
    data: users,
  });

  console.log("Users generated");

  await prisma.profile.createMany({
    data: profiles,
  });

  console.log("Profiles generated");

  const codeRepos = await createCodeRepos(await generateCodeRepos(users, 100));

  console.log("Code repos generated");

  await prisma.order.createMany({
    data: await generateOrders(
      users.map((u) => u.id),
      codeRepos.map((r) => r.id),
      1000,
    ),
  });

  console.log("Orders generated");

  await prisma.supportTicket.createMany({
    data: await generateSupportTickets(
      users.map((u) => u.email),
      1000,
    ),
  });

  const reviews = await generateReviews(
    users.map((u) => u.id),
    codeRepos.map((r) => r.id),
    1000,
  );

  await prisma.review.createMany({
    data: reviews,
  });

  await prisma.comment.createMany({
    data: await generateComments(
      users.map((u) => u.id),
      reviews.map((r) => r.id),
      2000,
    ),
  });
}

export const createSellers = async () => {
  await prisma.$connect();
  console.log(prisma.)
  const users = await prisma.user.findMany({ where: { role: "SELLER" }});
  await generateSellerProfiles(users, 100);
  console.log('done')
}

/**
 * Creates multiple CodeRepo entries with their associated tags.
 * @param codeRepos - Array of objects containing CodeRepo data and associated tags.
 * @returns An array of created CodeRepo entries with tags.
 */
export const createCodeRepos = async (codeRepos: { repo: CodeRepo, tags: string[] }[]) => {
  const createdRepos = [];

  for (const { repo, tags } of codeRepos) {
    const createdRepo = await prisma.codeRepo.create({
      data: {
        ...repo,
      },
      include: {
        tags: true,
      },
    });

    await Promise.all(
      tags.map(async (tag) => {
        return prisma.tag.upsert({
          where: { name: tag },
          update: {},
          create: { name: tag, repoId: createdRepo.id},
        });
      })
    );

    createdRepos.push(createdRepo);
  }

  return createdRepos;
};

console.log('Seeding database...')
//main()
//  .then(async () => {
//    await prisma.$disconnect();
//  })
//  .catch(async (e) => {
//    console.error(e);
//    await prisma.$disconnect();
//    process.exit(1);
//  });

createSellers()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
