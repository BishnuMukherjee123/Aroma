import { createClient } from "@supabase/supabase-js";
import { prisma } from "../../db/prisma.js";
import { conflict, ensureFoundValue, unauthorized } from "../../lib/errors.js";
import {
  createAuthToken,
  hashPassword,
} from "../../lib/auth.js";
import { config } from "../../utils/conf.js";

const getSupabaseClient = () => {
  return createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

const authUserSelect = {
  id: true,
  email: true,
  createdAt: true,
  updatedAt: true,
} as const;

const roleRank = {
  EDITOR: 1,
  ADMIN: 2,
  OWNER: 3,
} as const;

/** Shared helper: find or create the local user, then return a session token. */
const findOrCreateAuthSession = async (normalizedEmail: string) => {
  let user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: authUserSelect,
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash: "",
      },
      select: authUserSelect,
    });
  }

  return {
    user,
    token: createAuthToken({
      userId: user.id,
      email: user.email,
    }),
  };
};

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
  const normalizedEmail = input.email.toLowerCase().trim();
  const supabase = getSupabaseClient();
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: input.password,
  });

  if (error || !data.user) {
    unauthorized("Invalid email or password");
    return;
  }

  return findOrCreateAuthSession(normalizedEmail);
};

export const sendOtpService = async (email: string) => {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (!user) {
    unauthorized("Unauthorized email address");
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      shouldCreateUser: false,
    },
  });

  if (error) {
    throw new Error(`Failed to send OTP: ${error.message}`);
  }

  return { success: true, message: "OTP sent successfully" };
};

export const verifyOtpService = async (email: string, code: string) => {
  const normalizedEmail = email.toLowerCase().trim();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: normalizedEmail,
    token: code,
    type: "email",
  });

  if (error || !data.user) {
    unauthorized("Invalid or expired OTP code");
    return;
  }

  return findOrCreateAuthSession(normalizedEmail);
};

export const getCurrentUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...authUserSelect,
      restaurantsOwned: {
        select: {
          id: true,
          name: true,
          publicId: true,
          isActive: true,
          isPublished: true,
        },
      },
      memberships: {
        select: {
          id: true,
          role: true,
          restaurant: {
            select: {
              id: true,
              name: true,
              publicId: true,
              isActive: true,
              isPublished: true,
            },
          },
        },
      },
    },
  });

  const existingUser = ensureFoundValue(user, "User not found");
  const membershipMap = new Map(
    existingUser.memberships.map((membership) => [
      membership.restaurant.id,
      membership,
    ]),
  );

  for (const restaurant of existingUser.restaurantsOwned) {
    const currentMembership = membershipMap.get(restaurant.id);

    if (
      !currentMembership ||
      roleRank[currentMembership.role] < roleRank.OWNER
    ) {
      membershipMap.set(restaurant.id, {
        id: currentMembership?.id ?? `owner-${restaurant.id}`,
        role: "OWNER",
        restaurant,
      });
    }
  }

  return {
    id: existingUser.id,
    email: existingUser.email,
    createdAt: existingUser.createdAt,
    updatedAt: existingUser.updatedAt,
    memberships: Array.from(membershipMap.values()),
  };
};
