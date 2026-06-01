/* eslint-disable node/no-unsupported-features/es-builtins */
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client.js";
import { config } from "../utils/conf.js";

type GlobalPrisma = typeof globalThis & {
  __aromaPrisma?: PrismaClient;
};

const globalState = globalThis as GlobalPrisma;

import pg from "pg";
const { Pool } = pg;

if (!globalState.__aromaPrisma) {
  const pool = new Pool({
    connectionString: config.DATABASE_URL,
    max: 2,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  });
  globalState.__aromaPrisma = new PrismaClient({
    adapter: new PrismaPg(pool),
  });
}

export const prisma = globalState.__aromaPrisma;
