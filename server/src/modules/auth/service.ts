import { prisma } from "../../db/prisma.js";
import { conflict, ensureFoundValue, unauthorized } from "../../lib/errors.js";
import {
  createAuthToken,
  hashPassword,
  verifyPassword,
} from "../../lib/auth.js";

const authUserSelect = {
  id: true,
  email: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const registerUser = async (input: {
  email: string;
  password: string;
}) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (existingUser) {
    conflict("Email is already registered");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
    },
    select: authUserSelect,
  });

  return {
    user,
    token: createAuthToken({
      userId: user.id,
      email: user.email,
    }),
  };
};

export const loginUser = async (input: {
  email: string;
  password: string;
}) => {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: {
      ...authUserSelect,
      passwordHash: true,
    },
  });

  const existingUser = ensureFoundValue(user, "Invalid email or password");
  const isValidPassword = await verifyPassword(
    input.password,
    existingUser.passwordHash,
  );

  if (!isValidPassword) {
    unauthorized("Invalid email or password");
  }

  return {
    user: {
      id: existingUser.id,
      email: existingUser.email,
      createdAt: existingUser.createdAt,
      updatedAt: existingUser.updatedAt,
    },
    token: createAuthToken({
      userId: existingUser.id,
      email: existingUser.email,
    }),
  };
};

export const getCurrentUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...authUserSelect,
      memberships: {
        select: {
          id: true,
          role: true,
          restaurant: {
            select: {
              id: true,
              name: true,
              publicId: true,
              isPublished: true,
            },
          },
        },
      },
    },
  });

  return ensureFoundValue(user, "User not found");
};
