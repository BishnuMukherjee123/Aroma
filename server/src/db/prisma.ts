/* eslint-disable node/no-unsupported-features/es-builtins */
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client.js";
import { config } from "../utils/conf.js";

type GlobalPrisma = typeof globalThis & {
  __aromaPrisma?: PrismaClient;
};

const globalState = globalThis as GlobalPrisma;

if (!globalState.__aromaPrisma) {
  globalState.__aromaPrisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: config.DATABASE_URL,
    }),
  });
}

export const prisma = globalState.__aromaPrisma;
