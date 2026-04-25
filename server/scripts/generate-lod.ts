/**
 * generate-lod.ts
 *
 * Generates a low-poly LOD-0 (Level of Detail) version of every MODEL_3D asset
 * and stores it as a MODEL_3D_LOD0 asset in Supabase Storage + the database.
 *
 * The LOD is created by:
 *   1. weld()         — merge duplicate vertices (prerequisite for simplify)
 *   2. simplify()     — reduce polygon count to ~15% of original (MeshoptSimplifier)
 *   3. prune()        — remove unused nodes, materials, textures
 *   4. draco()        — re-compress the reduced geometry with Draco
 *
 * The resulting LOD is typically 60-90% smaller than the original, enabling
 * near-instant first-tap rendering. The client loads the LOD first, then
 * silently swaps to the full-quality model after it finishes loading.
 *
 * Usage:
 *   npm run lod:generate            — process all dishes missing a LOD asset
 *   npm run lod:generate -- --force — regenerate all LODs even if they exist
 *   npm run lod:generate -- --dry-run — show what would be done, no uploads
 */

import { NodeIO }               from "@gltf-transform/core";
import { EXTTextureWebP, KHRDracoMeshCompression } from "@gltf-transform/extensions";
import { draco, prune, simplify, weld } from "@gltf-transform/functions";
import draco3dgltf              from "draco3dgltf";
import { MeshoptSimplifier }    from "meshoptimizer";
import { createClient }         from "@supabase/supabase-js";

import { prisma }               from "../src/db/prisma.js";
import { config }               from "../src/utils/conf.js";
import { getStoragePublicUrl }  from "../src/lib/supabase-storage.js";
import { rebuildPublicRestaurantSnapshot } from "../src/lib/public-menu.js";

// ─── CLI flags ────────────────────────────────────────────────────────────────
const DRY_RUN = process.argv.includes("--dry-run");
const FORCE   = process.argv.includes("--force");

/** Polygon ratio to keep — 15% of original face count. */
const SIMPLIFY_RATIO = 0.15;

// ─── Supabase ─────────────────────────────────────────────────────────────────
const getSupabase = () =>
  createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

async function downloadGlb(storageKey: string): Promise<Buffer> {
  const { data, error } = await getSupabase()
    .storage.from(config.SUPABASE_STORAGE_BUCKET)
    .download(storageKey);
  if (error || !data) {
    throw new Error(`Download failed for ${storageKey}: ${error?.message ?? "no data"}`);
  }
  return Buffer.from(await data.arrayBuffer());
}

async function uploadGlb(storageKey: string, buffer: Buffer): Promise<void> {
  const { error } = await getSupabase()
    .storage.from(config.SUPABASE_STORAGE_BUCKET)
    .upload(storageKey, buffer, {
      contentType: "model/gltf-binary",
      upsert: true,
      cacheControl: "31536000",
    });
  if (error) throw new Error(`Upload failed for ${storageKey}: ${error.message}`);
}

/** Derive the LOD storage key from the full-quality key. */
function lodStorageKey(modelStorageKey: string): string {
  return modelStorageKey.replace(/\.glb$/i, "-lod0.glb");
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function generateLod(): Promise<void> {
  if (DRY_RUN) console.log("🔍  DRY RUN — no files will be uploaded.\n");
  if (FORCE)   console.log("💪  FORCE — regenerating all LODs.\n");

  // Fetch all READY full-quality models
  const modelAssets = await prisma.asset.findMany({
    where: { kind: "MODEL_3D", status: "READY" },
    select: {
      id: true,
      storageKey: true,
      sizeBytes: true,
      dishId: true,
      restaurantId: true,
      dish: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (modelAssets.length === 0) {
    console.log("✅  No MODEL_3D assets found.");
    return;
  }

  // Build a set of dish IDs that already have a LOD asset
  const existingLodDishIds = new Set(
    (
      await prisma.asset.findMany({
        where: { kind: "MODEL_3D_LOD0", status: "READY" },
        select: { dishId: true },
      })
    ).map((a) => a.dishId)
  );

  const toProcess = FORCE
    ? modelAssets
    : modelAssets.filter((a) => !existingLodDishIds.has(a.dishId));

  if (toProcess.length === 0) {
    console.log("✅  All dishes already have LOD assets. Use --force to regenerate.");
    return;
  }

  console.log(`🔺  Generating LOD for ${toProcess.length} model(s)...\n`);

  // Initialise gltf-transform encoder/decoder once
  // Register extensions so the IO can read GLBs that use:
  //   • EXT_texture_webp  — WebP textures (used by these models)
  //   • KHR_draco_mesh_compression — already-compressed geometry (decode before re-encode)
  const dracoDecoder = await draco3dgltf.createDecoderModule();
  const dracoEncoder = await draco3dgltf.createEncoderModule();
  const io = new NodeIO()
    .registerExtensions([EXTTextureWebP, KHRDracoMeshCompression])
    .registerDependencies({
      "draco3d.decoder": dracoDecoder, // needed to READ existing Draco geometry
      "draco3d.encoder": dracoEncoder, // needed to WRITE Draco geometry
    });
  await MeshoptSimplifier.ready;

  const touchedRestaurantIds = new Set<string>();
  let done = 0, failed = 0;

  for (const asset of toProcess) {
    const label = `${asset.dish.name} (${asset.storageKey.split("/").pop()})`;
    const lodKey = lodStorageKey(asset.storageKey);

    try {
      // ── 1. Download full-quality GLB ──────────────────────────────────────
      process.stdout.write(`  ⬇  Downloading ${label} … `);
      const originalBuffer = await downloadGlb(asset.storageKey);
      console.log(`${(originalBuffer.byteLength / 1024).toFixed(0)} KB`);

      // ── 2. Apply LOD pipeline ─────────────────────────────────────────────
      process.stdout.write(`  ⚙  Simplifying (${(SIMPLIFY_RATIO * 100).toFixed(0)}% polygons) … `);
      const document = await io.readBinary(new Uint8Array(originalBuffer));

      await document.transform(
        weld(),
        simplify({
          simplifier: MeshoptSimplifier,
          ratio: SIMPLIFY_RATIO,
          error: 0.001,
        }),
        prune(),
        draco({
          // gltf-transform v4: encoder is auto-resolved from io.registerDependencies()
          quantizePosition: 14,
          quantizeNormal:   10,
          quantizeTexcoord: 12,
          quantizeColor:    8,
          quantizeGeneric:  12,
          encodeSpeed:      5,
          decodeSpeed:      5,
        }),
      );

      const lodArray  = await io.writeBinary(document);
      const lodBuffer = Buffer.from(lodArray);
      const reduction = (
        ((originalBuffer.byteLength - lodBuffer.byteLength) / originalBuffer.byteLength) * 100
      ).toFixed(1);

      console.log(
        `${(lodBuffer.byteLength / 1024).toFixed(0)} KB  (${reduction}% smaller)`
      );

      if (DRY_RUN) {
        console.log(`  [dry-run] Would upload to ${lodKey}\n`);
        done++;
        continue;
      }

      // ── 3. Upload LOD ─────────────────────────────────────────────────────
      process.stdout.write(`  ⬆  Uploading LOD … `);
      await uploadGlb(lodKey, lodBuffer);
      console.log("done");

      // ── 4. Upsert LOD asset record in DB ─────────────────────────────────
      await prisma.asset.upsert({
        where: {
          // composite unique doesn't exist, use findFirst + create/update pattern
          id: (
            await prisma.asset.findFirst({
              where: { dishId: asset.dishId, kind: "MODEL_3D_LOD0" },
              select: { id: true },
            })
          )?.id ?? "___new___",
        },
        update: {
          storageKey: lodKey,
          url: getStoragePublicUrl(lodKey),
          sizeBytes: lodBuffer.byteLength,
          status: "READY",
        },
        create: {
          dishId:       asset.dishId,
          restaurantId: asset.restaurantId,
          kind:         "MODEL_3D_LOD0",
          status:       "READY",
          storageKey:   lodKey,
          url:          getStoragePublicUrl(lodKey),
          mimeType:     "model/gltf-binary",
          sizeBytes:    lodBuffer.byteLength,
        },
      });

      touchedRestaurantIds.add(asset.restaurantId);
      done++;
      console.log(`  ✅  LOD saved for ${asset.dish.name}\n`);

    } catch (err) {
      failed++;
      console.error(
        `  ❌  Failed for ${label}: ${err instanceof Error ? err.message : err}\n`
      );
    }
  }

  // ── Rebuild snapshots ──────────────────────────────────────────────────────
  if (!DRY_RUN && touchedRestaurantIds.size > 0) {
    console.log(`\n🔄  Rebuilding public snapshots for ${touchedRestaurantIds.size} restaurant(s)…`);
    for (const id of touchedRestaurantIds) {
      await rebuildPublicRestaurantSnapshot(id);
    }
  }

  console.log("\n─────────────────────────────────────────");
  console.log(`✅  Generated : ${done}`);
  if (failed > 0) console.log(`❌  Failed    : ${failed}`);
  console.log("─────────────────────────────────────────");
}

void generateLod()
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
