/**
 * add-lod-enum.ts
 * 
 * Adds MODEL_3D_LOD0 to the AssetKind PostgreSQL enum using the pooler URL.
 * Run once: npm run db:add-lod-enum
 */
import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  try {
    // Check if the value already exists first
    const { rows } = await client.query<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'AssetKind' AND e.enumlabel = 'MODEL_3D_LOD0'
      ) AS exists
    `);

    if (rows[0]?.exists) {
      console.log("✅ MODEL_3D_LOD0 already exists in AssetKind enum.");
      return;
    }

    await client.query(`ALTER TYPE "AssetKind" ADD VALUE 'MODEL_3D_LOD0'`);
    console.log("✅ Added MODEL_3D_LOD0 to AssetKind enum.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
