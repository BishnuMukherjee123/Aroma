const MODEL_VIEWER_CDN =
  "https://ajax.googleapis.com/ajax/libs/model-viewer/4.1.0/model-viewer.min.js";

let modelViewerLoadPromise: Promise<void> | null = null;

// ─── Service Worker registration ──────────────────────────────────────────────
// Registers /sw.js once per page load. The SW intercepts all *.glb and poster
// fetch requests with a CacheFirst strategy — repeat visits serve from disk
// in ~1 ms instead of downloading from the network again.
// This is module-level (not inside a function) so it fires as early as possible.
(function registerServiceWorker() {
  if (
    typeof window === "undefined" ||
    !("serviceWorker" in navigator)
  ) {
    return;
  }
  navigator.serviceWorker
    .register("/sw.js", { scope: "/" })
    .catch((err: unknown) => {
      // SW registration is non-critical — log and continue.
      console.warn("[aroma] SW registration failed:", err);
    });
})();

type ModelViewerElement = HTMLElement & {
  activateAR?: () => Promise<void> | void;
};

export async function ensureModelViewerScript(): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  if (window.customElements?.get("model-viewer")) {
    return;
  }

  if (!modelViewerLoadPromise) {
    // Ensure the Draco decoder location is set BEFORE model-viewer is ever instantiated.
    const mvWindow = window as any;
    mvWindow.ModelViewerElement = mvWindow.ModelViewerElement || {};
    mvWindow.ModelViewerElement.dracoDecoderLocation =
      "https://www.gstatic.com/draco/versioned/decoders/1.5.7/";

    modelViewerLoadPromise = new Promise<void>((resolve, reject) => {
      const finish = async () => {
        try {
          await window.customElements.whenDefined("model-viewer");
          resolve();
        } catch (error) {
          reject(error);
        }
      };

      const existing = document.querySelector(
        `script[src="${MODEL_VIEWER_CDN}"]`,
      ) as HTMLScriptElement | null;

      if (existing) {
        existing.addEventListener("load", () => void finish(), { once: true });
        existing.addEventListener(
          "error",
          () => reject(new Error("Failed to load the AR viewer.")),
          { once: true },
        );
        return;
      }

      const script = document.createElement("script");
      script.type = "module";
      script.src = MODEL_VIEWER_CDN;
      script.addEventListener("load", () => void finish(), { once: true });
      script.addEventListener(
        "error",
        () => reject(new Error("Failed to load the AR viewer.")),
        { once: true },
      );
      document.head.appendChild(script);
    });
  }

  await modelViewerLoadPromise;
}

export async function launchDirectAr(options: {
  modelUrl: string;
  alt: string;
  posterUrl?: string | null;
}): Promise<void> {
  if (typeof document === "undefined") {
    return;
  }

  await ensureModelViewerScript();

  const launcher = document.createElement("model-viewer") as ModelViewerElement;
  launcher.setAttribute("src", options.modelUrl);
  launcher.setAttribute("alt", options.alt);
  launcher.setAttribute("ar", "");
  launcher.setAttribute("ar-modes", "webxr scene-viewer quick-look");
  launcher.setAttribute("camera-controls", "");
  launcher.setAttribute("interaction-prompt", "none");
  launcher.setAttribute("touch-action", "pan-y");

  if (options.posterUrl) {
    launcher.setAttribute("poster", options.posterUrl);
  }

  launcher.style.position = "fixed";
  launcher.style.left = "-99999px";
  launcher.style.top = "0";
  launcher.style.width = "1px";
  launcher.style.height = "1px";
  launcher.style.opacity = "0";
  launcher.style.pointerEvents = "none";

  document.body.appendChild(launcher);

  try {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

    if (!launcher.activateAR) {
      throw new Error(
        "AR could not open here. Try Chrome on Android or Safari on iPhone.",
      );
    }

    await launcher.activateAR();
  } finally {
    window.setTimeout(() => {
      launcher.remove();
    }, 1500);
  }
}
