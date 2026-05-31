import { createClient } from "@supabase/supabase-js";
import { prisma } from "../../db/prisma.js";
import { badRequest, conflict, ensureFoundValue } from "../../lib/errors.js";
import { hashPassword } from "../../lib/auth.js";
import { rebuildPublicRestaurantSnapshot } from "../../lib/public-menu.js";
import { ensureRestaurantRole } from "../restaurant/access.js";
import { config } from "../../utils/conf.js";

const getSupabaseAdminClient = () => {
  return createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

export const RESTAURANT_MEMBER_ROLES = ["OWNER", "ADMIN", "MANAGER"] as const;

const managerMembershipSelect = {
  id: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      email: true,
    },
  },
} as const;

export const addRestaurantMember = async (
  actorUserId: string,
  restaurantId: string,
  input: {
    email: string;
    role: (typeof RESTAURANT_MEMBER_ROLES)[number];
  },
) => {
  await ensureRestaurantRole(actorUserId, restaurantId, "OWNER");

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      id: true,
      ownerId: true,
    },
  });

  const existingRestaurant = ensureFoundValue(restaurant, "Restaurant not found");

  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      email: true,
    },
  });

  const existingUser = ensureFoundValue(user, "User not found");

  if (existingUser.id === existingRestaurant.ownerId && input.role !== "OWNER") {
    conflict(
      "The company owner for this restaurant must keep OWNER access.",
    );
  }

  if (existingUser.id !== existingRestaurant.ownerId && input.role === "OWNER") {
    conflict(
      "Only the company owner can hold OWNER access for this restaurant.",
    );
  }

  if (input.role === "MANAGER") {
    const assignedManagerRestaurant = await prisma.restaurantMember.findFirst({
      where: {
        userId: existingUser.id,
        role: "MANAGER",
        NOT: {
          restaurantId,
        },
      },
      select: {
        restaurant: {
          select: {
            name: true,
          },
        },
      },
    });

    if (assignedManagerRestaurant) {
      conflict(
        `This manager is already assigned to ${assignedManagerRestaurant.restaurant.name}. Managers can only manage one restaurant.`,
      );
    }
  }

  const membership = await prisma.restaurantMember.upsert({
    where: {
      userId_restaurantId: {
        userId: existingUser.id,
        restaurantId,
      },
    },
    update: {
      role: input.role,
    },
    create: {
      userId: existingUser.id,
      restaurantId,
      role: input.role,
    },
    select: {
      id: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  await rebuildPublicRestaurantSnapshot(restaurantId);
  return membership;
};

// ─── Shared validation for manager account input ──────────────────────────────

const validateManagerInput = async (
  restaurantId: string,
  input: { email: string },
) => {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      id: true,
      name: true,
      ownerId: true,
      owner: {
        select: { email: true },
      },
    },
  });

  const existingRestaurant = ensureFoundValue(restaurant, "Restaurant not found");

  const normalizedEmail = input.email.toLowerCase().trim();

  if (normalizedEmail === existingRestaurant.owner.email.toLowerCase().trim()) {
    conflict("The company owner account cannot also be used as the restaurant manager.");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      restaurantsOwned: { select: { id: true } },
    },
  });

  if (
    existingUser &&
    (existingUser.id === existingRestaurant.ownerId ||
      existingUser.restaurantsOwned.length > 0)
  ) {
    conflict("A company owner account cannot be assigned as a restaurant manager.");
  }

  if (existingUser) {
    const membershipElsewhere = await prisma.restaurantMember.findFirst({
      where: {
        userId: existingUser.id,
        NOT: { restaurantId },
      },
      select: {
        role: true,
        restaurant: { select: { name: true } },
      },
    });

    if (membershipElsewhere) {
      conflict(
        `This account already belongs to ${membershipElsewhere.restaurant.name}. A restaurant manager can only be assigned to one restaurant.`,
      );
    }
  }

  return { existingRestaurant, existingUser, normalizedEmail };
};

// ─── Step 1: Send OTP (no user created yet) ───────────────────────────────────

export const sendManagerOtp = async (
  actorUserId: string,
  restaurantId: string,
  input: {
    email: string;
    password: string;
    name?: string;
    mobile?: string;
    profilePic?: string;
  },
) => {
  await ensureRestaurantRole(actorUserId, restaurantId, "OWNER");

  const { normalizedEmail } = await validateManagerInput(restaurantId, input);

  // Hash password NOW so we never store plaintext anywhere
  const passwordHash = await hashPassword(input.password);

  // Upsert the pending record (10 min expiry, overwrites any old pending for this restaurant)
  await prisma.pendingManagerOtp.upsert({
    where: { restaurantId },
    update: {
      email: normalizedEmail,
      passwordHash,
      name: input.name ?? null,
      mobile: input.mobile ?? null,
      profilePicUrl: input.profilePic ?? null,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
    create: {
      restaurantId,
      email: normalizedEmail,
      passwordHash,
      name: input.name ?? null,
      mobile: input.mobile ?? null,
      profilePicUrl: input.profilePic ?? null,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  // Send OTP email via Supabase
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: { shouldCreateUser: true },
  });

  if (error) {
    // Clean up pending record if OTP send fails
    await prisma.pendingManagerOtp.deleteMany({ where: { restaurantId } });
    throw new Error(`Failed to send OTP email: ${error.message}`);
  }

  return { success: true, email: normalizedEmail };
};

// ─── Step 2: Verify OTP and create the account ────────────────────────────────

export const verifyManagerOtpAndCreate = async (
  actorUserId: string,
  restaurantId: string,
  code: string,
) => {
  await ensureRestaurantRole(actorUserId, restaurantId, "OWNER");

  // Fetch the pending record
  const pendingRaw = await prisma.pendingManagerOtp.findUnique({
    where: { restaurantId },
  });

  if (!pendingRaw) {
    badRequest("No pending manager registration found. Please start over.");
  }

  const pending = ensureFoundValue(pendingRaw, "No pending manager registration found. Please start over.");

  if (new Date() > pending.expiresAt) {
    await prisma.pendingManagerOtp.delete({ where: { restaurantId } });
    badRequest("OTP has expired. Please start over.");
  }

  // Verify OTP with Supabase
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: pending.email,
    token: code,
    type: "email",
  });

  if (error || !data.user) {
    throw Object.assign(
      new Error("Invalid or expired OTP code. Please check and try again."),
      { statusCode: 401 },
    );
  }

  // OTP verified — now create the real account
  const existingUser = await prisma.user.findUnique({
    where: { email: pending.email },
    select: { id: true },
  });

  let supabaseUserId = existingUser?.id ?? data.user.id;

  if (!existingUser) {
    // Update the Supabase user's password (they were created by signInWithOtp above)
    const { error: updateErr } = await supabase.auth.admin.updateUserById(
      data.user.id,
      { password: pending.passwordHash, email_confirm: true },
    );

    if (updateErr) {
      throw new Error(`Failed to set manager password: ${updateErr.message}`);
    }
  } else {
    // Update existing Supabase user's password
    const { error: updateErr } = await supabase.auth.admin.updateUserById(
      existingUser.id,
      { password: pending.passwordHash },
    );

    if (updateErr) {
      throw new Error(`Failed to update manager password: ${updateErr.message}`);
    }
  }

  // Write to our database inside a transaction
  const payload = await prisma.$transaction(async (tx) => {
    const managerUser = await tx.user.upsert({
      where: { email: pending.email },
      update: {
        passwordHash: pending.passwordHash,
        ...(pending.name !== null ? { name: pending.name } : {}),
        ...(pending.mobile !== null ? { mobile: pending.mobile } : {}),
        ...(pending.profilePicUrl !== null ? { profilePicUrl: pending.profilePicUrl } : {}),
      },
      create: {
        id: supabaseUserId,
        email: pending.email,
        passwordHash: pending.passwordHash,
        ...(pending.name !== null ? { name: pending.name } : {}),
        ...(pending.mobile !== null ? { mobile: pending.mobile } : {}),
        ...(pending.profilePicUrl !== null ? { profilePicUrl: pending.profilePicUrl } : {}),
      },
      select: { id: true, email: true },
    });

    // Remove any other manager for this restaurant
    await tx.restaurantMember.deleteMany({
      where: {
        restaurantId,
        role: "MANAGER",
        NOT: { userId: managerUser.id },
      },
    });

    const membership = await tx.restaurantMember.upsert({
      where: {
        userId_restaurantId: { userId: managerUser.id, restaurantId },
      },
      update: { role: "MANAGER" },
      create: { userId: managerUser.id, restaurantId, role: "MANAGER" },
      select: managerMembershipSelect,
    });

    // Delete the pending record — it's no longer needed
    await tx.pendingManagerOtp.delete({ where: { restaurantId } });

    return { membership, createdUser: !existingUser };
  }, { maxWait: 15_000, timeout: 15_000 });

  await rebuildPublicRestaurantSnapshot(restaurantId);
  return payload;
};

// ─── Delete manager ───────────────────────────────────────────────────────────

export const deleteRestaurantManagerAccount = async (
  actorUserId: string,
  restaurantId: string,
) => {
  await ensureRestaurantRole(actorUserId, restaurantId, "OWNER");

  const existingManager = await prisma.restaurantMember.findFirst({
    where: { restaurantId, role: "MANAGER" },
  });

  const manager = ensureFoundValue(existingManager, "No manager assigned to this restaurant.");

  await prisma.$transaction([
    prisma.restaurantMember.delete({ where: { id: manager.id } }),
    prisma.user.delete({ where: { id: manager.userId } }),
  ]);

  await rebuildPublicRestaurantSnapshot(restaurantId);
  return { success: true };
};
