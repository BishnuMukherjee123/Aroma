/**
 * compress-models.ts
 *
 * Draco-compresses every MODEL_3D asset in the database and re-uploads
 * the compressed GLB to the same Supabase storage key (upsert).
 *
 * Draco compression reduces GLB geometry data by 60–90%, dramatically
 * cutting first-visit download time. model-viewer has the Draco decoder
 * pre-configured, so no frontend change is required.
 *
 * Usage:
 *   npm run models:compress
 *   npm run models:compress -- --dry-run   (show sizes, don't upload)
 *
 * Safety:
 *   - Only processes assets where status = READY and kind = MODEL_3D
 *   - Already-compressed GLBs (containing a Draco mesh) are skipped
 *   - Updates asset.sizeBytes in DB after compression
 *   - Rebuilds the public menu snapshot for affected restaurants
 */

import { NodeIO }    from "@gltf-transform/core";
import { EXTTextureWebP, KHRDracoMeshCompression } from "@gltf-transform/extensions";
import { draco }     from "@gltf-transform/functions";
import draco3dgltf   from "draco3dgltf";
import { createClient } from "@supabase/supabase-js";
import { prisma }    from "../src/db/prisma.js";
import { config }    from "../src/utils/conf.js";
import { rebuildPublicRestaurantSnapshot } from "../src/lib/public-menu.js";

// ─── CLI flags ────────────────────────────────────────────────────────────────
const DRY_RUN = process.argv.includes("--dry-run");

// ─── Supabase helpers ─────────────────────────────────────────────────────────
const getSupabase = () =>
  createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

/** Download a GLB from Supabase storage and return it as a Buffer. */
async function downloadGlb(storageKey: string): Promise<Buffer> {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from(config.SUPABASE_STORAGE_BUCKET)
    .download(storageKey);

  if (error || !data) {
    throw new Error(`Download failed for ${storageKey}: ${error?.message ?? "no data"}`);
  }

  return Buffer.from(await data.arrayBuffer());
}

/** Upload a Buffer back to the same storage key (upsert = replace in-place). */
async function uploadGlb(storageKey: string, buffer: Buffer): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.storage
    .from(config.SUPABASE_STORAGE_BUCKET)
    .upload(storageKey, buffer, {
      contentType: "model/gltf-binary",
      upsert: true,          // overwrite the existing file
      cacheControl: "31536000", // 1-year CDN cache for immutable assets
    });

  if (error) {
    throw new Error(`Upload failed for ${storageKey}: ${error.message}`);
  }
}

/** Returns true if the GLB binary already contains a KHR_draco_mesh_compression extension. */
function isDracoCompressed(buffer: Buffer): boolean {
  // GLB JSON chunk starts at byte 20. Searching for the extension name is
  // sufficient — if Draco is present it will appear in the extensionsUsed array.
  const jsonChunkLength = buffer.readUInt32LE(12);
  const jsonStr = buffer
    .subarray(20, 20 + jsonChunkLength)
    .toString("utf8");
  return jsonStr.includes("KHR_draco_mesh_compression");
}

// ─── Main ──────────────────────────────────────────────────────────────────────
async function compressModels(): Promise<void> {
  if (DRY_RUN) {
    console.log("🔍  DRY RUN — no files will be uploaded or DB records changed.\n");
  }

  // Fetch all READY 3D model assets
  const assets = await prisma.asset.findMany({
    where: { kind: "MODEL_3D", status: "READY" },
    select: {
      id: true,
      storageKey: true,
      sizeBytes: true,
      restaurantId: true,
      dish: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (assets.length === 0) {
    console.log("✅  No MODEL_3D assets found.");
    return;
  }

  console.log(`📦  Found ${assets.length} MODEL_3D asset(s) to process.\n`);

  // Initialise gltf-transform Draco encoder
  // gltf-transform v4: encoder/decoder modules are registered as IO
  // dependencies — NOT passed directly to the draco() transform.
  const dracoDecoder = await draco3dgltf.createDecoderModule();
  const dracoEncoder = await draco3dgltf.createEncoderModule();
  const io = new NodeIO()
    .registerExtensions([EXTTextureWebP, KHRDracoMeshCompression])
    .registerDependencies({
      "draco3d.decoder": dracoDecoder,
      "draco3d.encoder": dracoEncoder,
    });

  const touchedRestaurantIds = new Set<string>();
  let skipped = 0;
  let compressed = 0;
  let failed = 0;

  for (const asset of assets) {
    const label = `${asset.dish.name} (${asset.storageKey.split("/").pop()})`;

    try {
      // ── 1. Download ────────────────────────────────────────────────────────
      process.stdout.write(`  ⬇  Downloading ${label} … `);
      const originalBuffer = await downloadGlb(asset.storageKey);
      const originalSize   = originalBuffer.byteLength;
      console.log(`${(originalSize / 1024).toFixed(0)} KB`);

      // ── 2. Skip if already Draco-compressed ──────────────────────────────
      if (isDracoCompressed(originalBuffer)) {
        console.log(`  ✓  Already Draco-compressed — skipping.\n`);
        skipped++;
        continue;
      }

      // ── 3. Compress ────────────────────────────────────────────────────────
      process.stdout.write(`  ⚙  Compressing with Draco … `);
      const document = await io.readBinary(new Uint8Array(originalBuffer));

      await document.transform(
        draco({
          // quantization bits — balance between precision and file size
          quantizePosition: 14,
          quantizeNormal:   10,
          quantizeTexcoord: 12,
          quantizeColor:    8,
          quantizeGeneric:  12,
          encodeSpeed:      5,
          decodeSpeed:      5,
        }),
      );

      const compressedArray  = await io.writeBinary(document);
      const compressedBuffer = Buffer.from(compressedArray);
      const compressedSize   = compressedBuffer.byteLength;
      const reduction        = (((originalSize - compressedSize) / originalSize) * 100).toFixed(1);

      console.log(
        `${(compressedSize / 1024).toFixed(0)} KB  (${reduction}% smaller)`
      );

      if (DRY_RUN) {
        console.log(`  [dry-run] Would upload and update DB.\n`);
        compressed++;
        continue;
      }

      // ── 4. Upload (upsert in place) ────────────────────────────────────────
      process.stdout.write(`  ⬆  Uploading … `);
      await uploadGlb(asset.storageKey, compressedBuffer);
      console.log("done");

      // ── 5. Update sizeBytes in DB ─────────────────────────────────────────
      await prisma.asset.update({
        where: { id: asset.id },
        data: { sizeBytes: compressedSize },
      });

      touchedRestaurantIds.add(asset.restaurantId);
      compressed++;
      console.log(`  ✅  Done.\n`);

    } catch (err) {
      failed++;
      console.error(
        `  ❌  Failed for ${label}: ${err instanceof Error ? err.message : err}\n`
      );
    }
  }

  // ── Rebuild public menu snapshots for all affected restaurants ─────────────
  if (!DRY_RUN && touchedRestaurantIds.size > 0) {
    console.log(`\n🔄  Rebuilding public snapshots for ${touchedRestaurantIds.size} restaurant(s)…`);
    for (const restaurantId of touchedRestaurantIds) {
      await rebuildPublicRestaurantSnapshot(restaurantId);
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log("\n─────────────────────────────────────────");
  console.log(`✅  Compressed : ${compressed}`);
  console.log(`⏭  Skipped    : ${skipped} (already Draco)`);
  if (failed > 0) console.log(`❌  Failed     : ${failed}`);
  console.log("─────────────────────────────────────────");
}

void compressModels()
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
