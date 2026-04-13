import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { access, constants as fsConstants } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

import { createClient } from "@supabase/supabase-js";

import { prisma } from "../src/db/prisma.js";
import { slugifyFileName } from "../src/lib/ids.js";
import {
  getStoragePublicUrl,
} from "../src/lib/supabase-storage.js";
import { rebuildPublicRestaurantSnapshot } from "../src/lib/public-menu.js";
import { config } from "../src/utils/conf.js";

const execFile = promisify(execFileCallback);

const POSTER_SIZE = 768;
const MODEL_VIEWER_CDN =
  "https://ajax.googleapis.com/ajax/libs/model-viewer/4.1.0/model-viewer.min.js";

type DishToBackfill = {
  id: string;
  name: string;
  restaurantId: string;
  restaurantName: string;
  modelAsset: {
    id: string;
    storageKey: string;
    url: string;
  };
};

const browserCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];

const fileNameToPosterName = (fileName: string) =>
  `${fileName.replace(/\.(glb|gltf)$/i, "").trim() || "dish-model"}-poster.png`;

const htmlEscape = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const resolveBrowserPath = async (): Promise<string> => {
  for (const candidate of browserCandidates) {
    const exists = await new Promise<boolean>((resolve) => {
      access(candidate, fsConstants.F_OK, (error) => resolve(!error));
    });

    if (exists) {
      return candidate;
    }
  }

  throw new Error(
    "Unable to find a local Edge/Chrome browser for poster rendering.",
  );
};

const createPosterHtml = (modelUrl: string, alt: string): string => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1"
    />
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
      camera-orbit="336deg 70deg 2.6m"
      field-of-view="32deg"
      min-camera-orbit="auto auto 2.6m"
      max-camera-orbit="auto auto 2.6m"
      min-field-of-view="32deg"
      max-field-of-view="32deg"
      disable-zoom
    ></model-viewer>
    <script>
      const viewer = document.getElementById("viewer");
      viewer.addEventListener(
        "load",
        () => {
          document.body.dataset.ready = "true";
        },
        { once: true }
      );
      viewer.addEventListener(
        "error",
        () => {
          document.body.dataset.error = "true";
        },
        { once: true }
      );
    </script>
  </body>
</html>`;

const renderPosterPng = async (
  browserPath: string,
  modelUrl: string,
  alt: string,
  outputPath: string,
): Promise<void> => {
  const renderDir = await mkdtemp(path.join(tmpdir(), "aroma-poster-"));
  const htmlPath = path.join(renderDir, "render.html");

  try {
    await writeFile(htmlPath, createPosterHtml(modelUrl, alt), "utf8");

    await execFile(browserPath, [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      `--window-size=${POSTER_SIZE},${POSTER_SIZE}`,
      "--run-all-compositor-stages-before-draw",
      "--virtual-time-budget=20000",
      `--screenshot=${outputPath}`,
      `file:///${htmlPath.replace(/\\/g, "/")}`,
    ]);
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
      restaurant: {
        select: {
          name: true,
        },
      },
      assets: {
        where: {
          status: "READY",
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          kind: true,
          storageKey: true,
          url: true,
        },
      },
    },
  });

  return dishes
    .map((dish) => {
      const modelAsset = dish.assets.find((asset) => asset.kind === "MODEL_3D");
      const posterAsset = dish.assets.find((asset) => asset.kind === "POSTER");

      if (!modelAsset || posterAsset) {
        return null;
      }

      return {
        id: dish.id,
        name: dish.name,
        restaurantId: dish.restaurantId,
        restaurantName: dish.restaurant.name,
        modelAsset,
      } satisfies DishToBackfill;
    })
    .filter((dish): dish is DishToBackfill => Boolean(dish));
};

const uploadPosterForDish = async (
  supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }),
  dish: DishToBackfill,
  posterBuffer: Buffer,
  posterFileName: string,
): Promise<void> => {
  const storageKey = `restaurants/${dish.restaurantId}/dishes/${dish.id}/${Date.now()}-${slugifyFileName(
    posterFileName,
  )}`;

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
  const browserPath = await resolveBrowserPath();
  const dishes = await getMissingPosterDishes();

  if (dishes.length === 0) {
    console.log("No dishes are missing posters.");
    return;
  }

  console.log(`Generating posters for ${dishes.length} dishes...`);

  const touchedRestaurantIds = new Set<string>();

  for (const dish of dishes) {
    const outputDir = await mkdtemp(path.join(tmpdir(), "aroma-poster-output-"));
    const outputPath = path.join(outputDir, `${dish.id}.png`);

    try {
      console.log(`Rendering poster for ${dish.name}...`);
      await renderPosterPng(
        browserPath,
        dish.modelAsset.url,
        dish.name,
        outputPath,
      );

      const posterBuffer = await readFile(outputPath);
      await uploadPosterForDish(
        undefined,
        dish,
        posterBuffer,
        fileNameToPosterName(dish.modelAsset.storageKey),
      );

      touchedRestaurantIds.add(dish.restaurantId);
      console.log(`Poster created for ${dish.name}.`);
    } finally {
      await rm(outputDir, { recursive: true, force: true });
    }
  }

  for (const restaurantId of touchedRestaurantIds) {
    await rebuildPublicRestaurantSnapshot(restaurantId);
  }

  console.log("Poster backfill complete.");
};

void backfillPosters()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
