
// user_factory.ts
import { hash } from "@node-rs/argon2";
import { prisma } from "#services/prisma_service";
import { generateIdFromEntropySize } from "lucia";
import { Role } from "@prisma/client";

interface UserFactoryData {
  email: string;
  password: string;
  fullname: string;
}

export class UserFactory {
  static async createUser({ email, password, fullname }: UserFactoryData) {
    return this.createBaseUser({ email, password, fullname, role: Role.USER });
  }

  static async createSeller({ email, password, fullname }: UserFactoryData) {
    return prisma.$transaction(async (prisma) => {
      const passwordHash = await hash(password, {
        memoryCost: 19456,
        timeCost: 3,
        parallelism: 1,
        outputLen: 64,
      });

      const id = generateIdFromEntropySize(32);

      const user = await prisma.user.create({
        data: { id, email, passwordHash, role: Role.SELLER },
      });

      const sellerProfile = await prisma.sellerProfile.create({
        data: {
          userId: user.id,
          businessName: fullname,
          businessAddress: "",
          businessPhone: "",
          businessEmail: email,
        }
      });

      return { user, sellerProfile };
    });
  }

  static async createModerator({ email, password, fullname }: UserFactoryData) {
    return this.createBaseUser({ email, password, fullname, role: Role.MODERATOR });
  }

  static async createAdmin({ email, password, fullname }: UserFactoryData) {
    return this.createBaseUser({ email, password, fullname, role: Role.ADMIN });
  }

  private static async createBaseUser({ email, password, fullname, role }: UserFactoryData & { role: Role }) {
    return prisma.$transaction(async (prisma) => {
      const passwordHash = await hash(password, {
        memoryCost: 19456,
        timeCost: 3,
        parallelism: 1,
        outputLen: 64,
      });

      const id = generateIdFromEntropySize(32);

      const user = await prisma.user.create({
        data: { id, email, passwordHash, role },
      });

      const profile = await prisma.profile.create({
        data: { userId: id, name: fullname },
      });

      return { user, profile };
    });
  }
}

