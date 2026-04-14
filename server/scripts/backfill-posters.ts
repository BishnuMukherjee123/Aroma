import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import puppeteer from "puppeteer";
import { createClient } from "@supabase/supabase-js";

import { prisma } from "../src/db/prisma.js";
import { slugifyFileName } from "../src/lib/ids.js";
import { getStoragePublicUrl } from "../src/lib/supabase-storage.js";
import { rebuildPublicRestaurantSnapshot } from "../src/lib/public-menu.js";
import { config } from "../src/utils/conf.js";

const POSTER_SIZE = 768;
const MODEL_VIEWER_CDN =
  "https://ajax.googleapis.com/ajax/libs/model-viewer/4.1.0/model-viewer.min.js";

type ModelAsset = {
  id: string;
  storageKey: string;
  url: string;
};

type DishToBackfill = {
  id: string;
  name: string;
  restaurantId: string;
  restaurantName: string;
  modelAsset: ModelAsset;
};

const fileNameToPosterName = (fileName: string) =>
  `${fileName.replace(/\.(glb|gltf)$/i, "").trim() || "dish-model"}-poster.png`;

const htmlEscape = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const createPosterHtml = (modelUrl: string, alt: string): string =>
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <title>${htmlEscape(alt)} poster</title>
    <script type="module" src="${MODEL_VIEWER_CDN}"></script>
    <style>
      html, body {
        width: ${POSTER_SIZE}px;
        height: ${POSTER_SIZE}px;
        margin: 0;
        padding: 0;
        overflow: hidden;
        background: radial-gradient(circle at top, rgba(255,255,255,0.72), transparent 50%), linear-gradient(180deg, #dbe7fb 0%, #cfdcf5 100%);
      }
      body {
        display: flex;
        align-items: stretch;
        justify-content: stretch;
      }
      model-viewer {
        width: 100%;
        height: 100%;
        --poster-color: transparent;
        background: transparent;
      }
    </style>
  </head>
  <body>
    <model-viewer
      id="viewer"
      src="${htmlEscape(modelUrl)}"
      alt="${htmlEscape(alt)}"
      camera-controls
      interaction-prompt="none"
      environment-image="neutral"
      exposure="1"
      shadow-intensity="1"
      camera-orbit="0deg 82deg auto"
      field-of-view="28deg"
      min-camera-orbit="auto auto auto"
      max-camera-orbit="auto auto auto"
      min-field-of-view="28deg"
      max-field-of-view="28deg"
      disable-zoom
    ></model-viewer>
    <script>
      const viewer = document.getElementById("viewer");
      viewer.addEventListener("load", () => {
        document.body.dataset.ready = "true";
      }, { once: true });
      viewer.addEventListener("error", () => {
        document.body.dataset.error = "true";
      }, { once: true });
    </script>
  </body>
</html>`;

/**
 * Renders a GLB model URL to a PNG poster using Puppeteer + model-viewer.
 * Puppeteer bundles Chromium with SwiftShader (software WebGL), so the
 * 3D model actually renders — no real GPU required.
 */
const renderPosterPng = async (
  modelUrl: string,
  alt: string,
  outputPath: string,
): Promise<void> => {
  const renderDir = await mkdtemp(path.join(tmpdir(), "aroma-poster-"));
  const htmlPath = path.join(renderDir, "render.html");

  try {
    await writeFile(htmlPath, createPosterHtml(modelUrl, alt), "utf8");

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        // SwiftShader gives software WebGL — model-viewer needs this
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-webgl",
        "--ignore-gpu-blocklist",
        `--window-size=${POSTER_SIZE},${POSTER_SIZE}`,
      ],
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: POSTER_SIZE, height: POSTER_SIZE });

      // Load the local HTML (model-viewer fetches the GLB from the public URL)
      await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`, {
        waitUntil: "networkidle0",
        timeout: 60_000,
      });

      // Wait for model-viewer's "load" event (body[data-ready="true"])
      // Falls back to a screenshot if it takes > 30s
      const loaded = await page
        .waitForFunction(
          () => (document.body as HTMLElement).dataset.ready === "true",
          { timeout: 30_000 },
        )
        .then(() => true)
        .catch(() => false);

      if (!loaded) {
        const hasError = await page.evaluate(
          () => (document.body as HTMLElement).dataset.error === "true",
        );
        if (hasError) {
          throw new Error(
            `model-viewer failed to load the GLB for "${alt}". ` +
              "Check the model URL is publicly accessible.",
          );
        }
        console.warn(
          `  ⚠️  model-viewer timed out for "${alt}" — screenshotting anyway`,
        );
      }

      // Give the renderer one more frame to stabilise
      await new Promise((r) => setTimeout(r, 500));

      await page.screenshot({ path: outputPath as `${string}.png` });
    } finally {
      await browser.close();
    }
  } finally {
    await rm(renderDir, { recursive: true, force: true });
  }
};

const getMissingPosterDishes = async (): Promise<DishToBackfill[]> => {
  const dishes = await prisma.dish.findMany({
    select: {
      id: true,
      name: true,
      restaurantId: true,
      restaurant: { select: { name: true } },
      assets: {
        where: { status: "READY" },
        orderBy: { createdAt: "asc" },
        select: { id: true, kind: true, storageKey: true, url: true },
      },
    },
  });

  const results: DishToBackfill[] = [];

  for (const dish of dishes) {
    const modelAsset = dish.assets.find((a) => a.kind === "MODEL_3D");
    const posterAsset = dish.assets.find((a) => a.kind === "POSTER");

    if (!modelAsset || posterAsset) {
      continue;
    }

    results.push({
      id: dish.id,
      name: dish.name,
      restaurantId: dish.restaurantId,
      restaurantName: dish.restaurant.name,
      modelAsset: {
        id: modelAsset.id,
        storageKey: modelAsset.storageKey,
        url: modelAsset.url,
      },
    });
  }

  return results;
};

const uploadPosterForDish = async (
  dish: DishToBackfill,
  posterBuffer: Buffer,
  posterFileName: string,
): Promise<void> => {
  const supabase = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const storageKey = `restaurants/${dish.restaurantId}/dishes/${dish.id}/${Date.now()}-${slugifyFileName(posterFileName)}`;

  const { error: uploadError } = await supabase.storage
    .from(config.SUPABASE_STORAGE_BUCKET)
    .upload(storageKey, posterBuffer, {
      contentType: "image/png",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(
      `Failed to upload poster for ${dish.name}: ${uploadError.message}`,
    );
  }

  await prisma.asset.create({
    data: {
      dishId: dish.id,
      restaurantId: dish.restaurantId,
      kind: "POSTER",
      status: "READY",
      storageKey,
      url: getStoragePublicUrl(storageKey),
      mimeType: "image/png",
      sizeBytes: posterBuffer.byteLength,
    },
  });
};

const backfillPosters = async (): Promise<void> => {
  const dishes = await getMissingPosterDishes();

  if (dishes.length === 0) {
    console.log("✅ No dishes are missing posters.");
    return;
  }

  console.log(`🖼  Generating posters for ${dishes.length} dish(es)...\n`);

  const touchedRestaurantIds = new Set<string>();

  for (const dish of dishes) {
    const outputDir = await mkdtemp(path.join(tmpdir(), "aroma-poster-output-"));
    const outputPath = path.join(outputDir, `${dish.id}.png`);

    try {
      console.log(`  Rendering: ${dish.name} ...`);
      await renderPosterPng(dish.modelAsset.url, dish.name, outputPath);

      const posterBuffer = await readFile(outputPath);
      await uploadPosterForDish(
        dish,
        posterBuffer,
        fileNameToPosterName(dish.modelAsset.storageKey),
      );

      touchedRestaurantIds.add(dish.restaurantId);
      console.log(`  ✅ Poster created for ${dish.name}`);
    } catch (err) {
      console.error(
        `  ❌ Failed for ${dish.name}: ${err instanceof Error ? err.message : err}`,
      );
    } finally {
      await rm(outputDir, { recursive: true, force: true });
    }
  }

  for (const restaurantId of touchedRestaurantIds) {
    await rebuildPublicRestaurantSnapshot(restaurantId);
  }

  console.log("\n🎉 Poster backfill complete.");
};

void backfillPosters()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
