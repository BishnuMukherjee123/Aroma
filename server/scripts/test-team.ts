import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

import { prisma } from "../src/db/prisma.js";

async function run() {
  const users = await prisma.user.findMany({ where: { email: "jerry.holland.bs123454@gmail.com" } });
  if (users.length === 0) return console.log("User not found");
  const uid = users[0].id;
  console.log("Testing getTeamMembers for", uid);

  // Replicating getTeamMembers logic exactly
  const userMemberships = await prisma.restaurantMember.findMany({
    where: { userId: uid },
    select: { restaurantId: true },
  });
  const restaurantIds = userMemberships.map((m) => m.restaurantId);
  if (restaurantIds.length === 0) return console.log("No restaurants");

  const members = await prisma.restaurantMember.findMany({
    where: { restaurantId: { in: restaurantIds } },
    select: {
      role: true,
      restaurant: { select: { name: true } },
      user: { select: { id: true, email: true, name: true, profilePicUrl: true } },
    },
  });

  const uniqueMembersMap = new Map();
  for (const member of members) {
    if (!member.user) continue;
    const existing = uniqueMembersMap.get(member.user.id);
    if (existing) {
      if (!existing.restaurants.includes(member.restaurant.name)) {
        existing.restaurants.push(member.restaurant.name);
      }
      const ranks = { OWNER: 3, ADMIN: 2, MANAGER: 1 };
      // Explicitly checking what fails here
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

  console.log("Success:");
  console.log(Array.from(uniqueMembersMap.values()));
}

run().catch(console.error).finally(() => prisma.$disconnect());
