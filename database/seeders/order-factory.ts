import { faker } from "@faker-js/faker";
import type { Order, OrderStatus } from "@prisma/client";
import { generateIdFromEntropySize } from "lucia";
import { generateDates } from "./utils.js";

export const generateOrders = async (
  existingUserIds: string[],
  existingCodeRepoIds: string[],
  count: number,
): Promise<Order[]> => {
  const generatedOrders: Order[] = [];
  const orderStatus: OrderStatus[] = ["pending", "completed", "cancelled"];

  for (let i = 0; i < count; i++) {
    const randomUserId =
      existingUserIds[Math.floor(Math.random() * existingUserIds.length)];
    const randomCodeRepoId =
      existingCodeRepoIds[
        Math.floor(Math.random() * existingCodeRepoIds.length)
      ];
    const { createdAt, updatedAt, deletedAt } = generateDates();

    const order: Order = {
      id: generateIdFromEntropySize(32),
      userId: randomUserId,
      codeRepoId: randomCodeRepoId,
      totalAmount: parseFloat(faker.commerce.price()),
      status: orderStatus[Math.floor(Math.random() * orderStatus.length)],
      createdAt,
      updatedAt,
      deletedAt,
   };
    generatedOrders.push(order);
  }

  return generatedOrders;
};
