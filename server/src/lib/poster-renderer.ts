/**
 * poster-renderer.ts
 *
 * Core Puppeteer + <model-viewer> rendering logic.
 * Shared by:
 *   - src/lib/poster-service.ts  (automatic generation on model upload)
 *   - scripts/backfill-posters.ts (manual backfill CLI script)
 *
 * Returns a raw PNG Buffer — callers are responsible for persistence.
 * No Three.js. No file-system writes. Pure render → buffer.
 */

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import puppeteer from "puppeteer";

// ---------------------------------------------------------------------------
// Dimensions — must match the card image area aspect ratio (h-56 ≈ 224 px).
// Mobile cards are ~375 px wide → ratio 375/224 ≈ 1.67:1.
// Using this ratio keeps object-cover display free of cropping on mobile and
// ensures the dish appears at the same zoom level as the live model-viewer.
// ---------------------------------------------------------------------------
const POSTER_WIDTH = 768;
const POSTER_HEIGHT = 460; // 768 / 1.67 ≈ 460

const MODEL_VIEWER_CDN =
  "https://ajax.googleapis.com/ajax/libs/model-viewer/4.1.0/model-viewer.min.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const htmlEscape = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Builds a self-contained HTML page that renders the GLB via <model-viewer>
 * and sets body[data-ready="true"] when the model fires its "load" event.
 */
const buildPosterHtml = (modelUrl: string, alt: string): string => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <title>${htmlEscape(alt)} poster</title>
    <script>
      self.ModelViewerElement = self.ModelViewerElement || {};
      self.ModelViewerElement.dracoDecoderLocation =
        "https://www.gstatic.com/draco/versioned/decoders/1.5.7/";
    </script>
    <script type="module" src="${MODEL_VIEWER_CDN}"></script>
    <style>
      html, body {
        width: ${POSTER_WIDTH}px;
        height: ${POSTER_HEIGHT}px;
        margin: 0;
        padding: 0;
        overflow: hidden;
        background: transparent;
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
        --progress-bar-height: 0px;
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
      camera-orbit="45deg 60deg auto"
      field-of-view="30deg"
      min-camera-orbit="auto auto auto"
      max-camera-orbit="auto auto auto"
      min-field-of-view="30deg"
      max-field-of-view="30deg"
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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Renders a GLB model URL to a PNG poster using Puppeteer + <model-viewer>.
 * Puppeteer bundles Chromium with SwiftShader (software WebGL), so the
 * 3D model actually renders — no real GPU required.
 *
 * @param modelUrl  Publicly accessible URL of the .glb file.
 * @param alt       Accessible label used as the model-viewer alt attribute.
 * @returns         Raw PNG bytes as a Node.js Buffer.
 */
export const renderPosterPng = async (
  modelUrl: string,
  alt: string,
): Promise<Buffer> => {
  const renderDir = await mkdtemp(path.join(tmpdir(), "aroma-poster-"));
  const htmlPath = path.join(renderDir, "render.html");

  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await writeFile(htmlPath, buildPosterHtml(modelUrl, alt), "utf8");

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-web-security",
        "--allow-file-access-from-files",
        // SwiftShader gives software WebGL — model-viewer needs this
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-webgl",
        "--ignore-gpu-blocklist",
        `--window-size=${POSTER_WIDTH},${POSTER_HEIGHT}`,
      ],
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: POSTER_WIDTH, height: POSTER_HEIGHT });

      // Load the local HTML (model-viewer fetches the GLB from its public URL)
      await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`, {
        waitUntil: "networkidle0",
        timeout: 60_000,
      });

      // Wait for model-viewer's "load" event (body[data-ready="true"]).
      // Falls back to a screenshot after 30 s so we don't stall forever.
      const loaded = await page
        .waitForFunction(
          // @ts-expect-error - document is not defined in server TS config
          () => (document.body as { dataset: Record<string, string> }).dataset.ready === "true",
          { timeout: 30_000 },
        )
        .then(() => true)
        .catch(() => false);

      if (!loaded) {
        const hasError = await page.evaluate(
          // @ts-expect-error - document is not defined in server TS config
          () => (document.body as { dataset: Record<string, string> }).dataset.error === "true",
        );
        if (hasError) {
          throw new Error(
            `model-viewer failed to load the GLB for "${alt}". ` +
              "Check the model URL is publicly accessible.",
          );
        }
        console.warn(
          `[poster-renderer] model-viewer timed out for "${alt}" — screenshotting anyway`,
        );
      }

      // Give the renderer one extra frame to stabilise before capture
      await new Promise((r) => setTimeout(r, 500));

      const screenshotBuffer = await page.screenshot({ omitBackground: true });

      // Puppeteer returns Buffer | string depending on the `encoding` option.
      // With the default (no encoding option), it always returns a Buffer.
      return Buffer.isBuffer(screenshotBuffer)
        ? screenshotBuffer
        : Buffer.from(screenshotBuffer);
    } finally {
      await browser.close();
    }
  } finally {
    await rm(renderDir, { recursive: true, force: true }).catch(() => {
      // Non-fatal: temp dir cleanup failure should not surface as an error.
    });
  }
};
