import { prisma } from "#services/prisma_service";
import { generateComments } from "./comment-factory.js";
import { generateOrders } from "./order-factory.js";
import { generateCodeRepos } from "./repo-factory.js";
import { generateReviews } from "./review-factorty.js";
import { generateSupportTickets } from "./support-factorty.js";
import { generateUsers } from "./user-factory.js";

async function main() {
  const { users, profiles } = await generateUsers(100);
  await prisma.user.createMany({
    data: users,
  });

  await prisma.profile.createMany({
    data: profiles,
  });

  const codeRepos = await generateCodeRepos(
    1000,
  );
  await prisma.codeRepo.createMany({
    data: codeRepos,
  });

  await prisma.order.createMany({
    data: await generateOrders(
      users.map((u) => u.id),
      codeRepos.map((r) => r.id),
      1000,
    ),
  });

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
      1000,
    ),
  });
}

console.log('Seeding database...')
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
