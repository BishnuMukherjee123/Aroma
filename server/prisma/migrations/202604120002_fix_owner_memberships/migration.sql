UPDATE "RestaurantMember" AS rm
SET
  "role" = 'OWNER',
  "updatedAt" = NOW()
FROM "Restaurant" AS r
WHERE rm."restaurantId" = r."id"
  AND rm."userId" = r."ownerId"
  AND rm."role" <> 'OWNER';
