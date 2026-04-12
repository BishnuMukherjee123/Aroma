CREATE TABLE IF NOT EXISTS "MainMenu" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MainMenu_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MainMenu_restaurantId_idx"
  ON "MainMenu"("restaurantId");

CREATE INDEX IF NOT EXISTS "MainMenu_restaurantId_isPublished_sortOrder_idx"
  ON "MainMenu"("restaurantId", "isPublished", "sortOrder");

ALTER TABLE "Menu"
  ADD COLUMN IF NOT EXISTS "mainMenuId" TEXT;

INSERT INTO "MainMenu" (
  "id",
  "name",
  "restaurantId",
  "isPublished",
  "sortOrder",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  'Main Menu',
  r."id",
  true,
  0,
  NOW(),
  NOW()
FROM "Restaurant" r
WHERE NOT EXISTS (
  SELECT 1
  FROM "MainMenu" mm
  WHERE mm."restaurantId" = r."id"
);

WITH default_main_menu AS (
  SELECT DISTINCT ON ("restaurantId")
    "id",
    "restaurantId"
  FROM "MainMenu"
  ORDER BY "restaurantId", "sortOrder" ASC, "createdAt" ASC
)
UPDATE "Menu" m
SET "mainMenuId" = dmm."id"
FROM default_main_menu dmm
WHERE m."restaurantId" = dmm."restaurantId"
  AND m."mainMenuId" IS NULL;

ALTER TABLE "Menu"
  ALTER COLUMN "mainMenuId" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Menu_mainMenuId_fkey'
  ) THEN
    ALTER TABLE "Menu"
      ADD CONSTRAINT "Menu_mainMenuId_fkey"
      FOREIGN KEY ("mainMenuId") REFERENCES "MainMenu"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Menu_mainMenuId_idx"
  ON "Menu"("mainMenuId");

DROP INDEX IF EXISTS "Menu_restaurantId_isPublished_sortOrder_idx";

CREATE INDEX IF NOT EXISTS "Menu_mainMenuId_isPublished_sortOrder_idx"
  ON "Menu"("mainMenuId", "isPublished", "sortOrder");
