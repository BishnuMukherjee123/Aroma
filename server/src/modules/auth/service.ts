import { createClient } from "@supabase/supabase-js";
import { prisma } from "../../db/prisma.js";
import { conflict, ensureFoundValue, unauthorized } from "../../lib/errors.js";
import {
  createAuthToken,
  hashPassword,
} from "../../lib/auth.js";
import { config } from "../../utils/conf.js";

import { createSignedUpload, ensureStorageBucket } from "../../lib/supabase-storage.js";

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
  name: true,
  mobile: true,
  companyName: true,
  location: true,
  profilePicUrl: true,
  createdAt: true,
  updatedAt: true,
} as const;

const roleRank = {
  MANAGER: 1,
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

  // Always return the same generic success message to prevent email enumeration.
  // If user doesn't exist, we silently skip sending the OTP.
  if (!user) {
    return { success: true, message: "If this email is registered, an OTP has been sent" };
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      shouldCreateUser: false,
    },
  });

  if (error) {
    // Don't expose Supabase internal error messages to the client
    throw new Error("OTP delivery failed. Please try again later.");
  }

  return { success: true, message: "If this email is registered, an OTP has been sent" };
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
          coverImageUrl: true,
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
              coverImageUrl: true,
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
    name: existingUser.name,
    mobile: existingUser.mobile,
    companyName: existingUser.companyName,
    location: existingUser.location,
    profilePicUrl: existingUser.profilePicUrl,
    createdAt: existingUser.createdAt,
    updatedAt: existingUser.updatedAt,
    memberships: Array.from(membershipMap.values()),
  };
};

export const updateUserProfile = async (
  userId: string,
  input: {
    name?: string;
    mobile?: string;
    companyName?: string;
    location?: string;
    profilePicUrl?: string;
  },
) => {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name !== undefined ? input.name.trim() : undefined,
      mobile: input.mobile !== undefined ? input.mobile.trim() : undefined,
      companyName: input.companyName !== undefined ? input.companyName.trim() : undefined,
      location: input.location !== undefined ? input.location.trim() : undefined,
      profilePicUrl: input.profilePicUrl !== undefined ? input.profilePicUrl.trim() : undefined,
    },
    select: authUserSelect,
  });
  return updated;
};

export const getProfileAvatarUploadUrl = async (
  userId: string,
  input: { fileName: string; mimeType: string },
) => {
  await ensureStorageBucket();

  if (!["image/jpeg", "image/png", "image/webp"].includes(input.mimeType)) {
    throw Object.assign(new Error("Only JPEG, PNG, and WEBP images are allowed for avatars"), { statusCode: 400 });
  }

  // Clean filename
  const cleanedFileName = input.fileName.replace(/[^a-zA-Z0-9.-]+/g, "_").toLowerCase();
  const storageKey = `profile-pics/${userId}/${Date.now()}-${cleanedFileName}`;
  const upload = await createSignedUpload(storageKey);

  return {
    uploadUrl: upload.signedUrl,
    publicUrl: upload.publicUrl,
    token: upload.token,
    storageKey,
  };
};

export const getTeamMembers = async (userId: string) => {
  const userMemberships = await prisma.restaurantMember.findMany({
    where: { userId },
    select: { restaurantId: true },
  });

  const restaurantIds = userMemberships.map((m) => m.restaurantId);

  if (restaurantIds.length === 0) {
    return [];
  }

  const members = await prisma.restaurantMember.findMany({
    where: {
      restaurantId: { in: restaurantIds },
    },
    select: {
      role: true,
      restaurant: {
        select: {
          name: true,
        },
      },
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          profilePicUrl: true,
        },
      },
    },
  });

  const uniqueMembersMap = new Map<string, {
    id: string;
    email: string;
    name: string | null;
    profilePicUrl: string | null;
    role: string;
    restaurants: string[];
  }>();

  for (const member of members) {
    if (!member.user) continue;
    const existing = uniqueMembersMap.get(member.user.id);
    if (existing) {
      if (!existing.restaurants.includes(member.restaurant.name)) {
        existing.restaurants.push(member.restaurant.name);
      }
      const ranks: Record<string, number> = { OWNER: 3, ADMIN: 2, MANAGER: 1 };
      const currentRank = ranks[member.role] || 0;
      const existingRank = ranks[existing.role] || 0;
      if (currentRank > existingRank) {
        existing.role = member.role;
      }
    } else {
      uniqueMembersMap.set(member.user.id, {
        id: member.user.id,
        email: member.user.email,
        name: member.user.name,
        profilePicUrl: member.user.profilePicUrl,
        role: member.role,
        restaurants: [member.restaurant.name],
      });
    }
  }

  return Array.from(uniqueMembersMap.values());
};

