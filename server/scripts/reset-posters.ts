/**
 * reset-posters.ts
 *
 * Deletes all existing POSTER assets from the DB (and Supabase Storage),
 * so the backfill script can regenerate them from the GLB files.
 *
 * Usage: npx tsx scripts/reset-posters.ts
 */

import { createClient } from "@supabase/supabase-js";
import { prisma } from "../src/db/prisma.js";
import { config } from "../src/utils/conf.js";

const resetPosters = async (): Promise<void> => {
  const supabase = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // Find all existing POSTER assets
  const posterAssets = await prisma.asset.findMany({
    where: { kind: "POSTER" },
    select: { id: true, storageKey: true, dishId: true },
  });

  if (posterAssets.length === 0) {
    console.log("No POSTER assets found — nothing to reset.");
    return;
  }

  console.log(`Found ${posterAssets.length} POSTER asset(s) to delete.`);

  // Delete from Supabase Storage
  const storageKeys = posterAssets.map((a) => a.storageKey);
  const { error: storageError } = await supabase.storage
    .from(config.SUPABASE_STORAGE_BUCKET)
    .remove(storageKeys);

  if (storageError) {
    console.warn(
      `Warning: storage delete had errors: ${storageError.message}`,
    );
    // Continue anyway — the DB record deletion is more important
  } else {
    console.log(`Deleted ${storageKeys.length} file(s) from Supabase Storage.`);
  }

  // Delete from DB
  const { count } = await prisma.asset.deleteMany({
    where: { kind: "POSTER" },
  });

  console.log(`Deleted ${count} POSTER record(s) from the database.`);
  console.log(
    "\nAll done. Now run:  npm run posters:backfill  to regenerate them.",
  );
};

void resetPosters()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
