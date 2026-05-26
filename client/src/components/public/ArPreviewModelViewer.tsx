"use client";

import { useEffect, useRef } from "react";

import { ensureModelViewerScript } from "@/lib/model-viewer";

const CAMERA_ORBIT = "45deg 60deg auto";
const FIELD_OF_VIEW = "30deg";

type Props = {
  modelUrl: string;
  /** Optional LOD-0 URL. When provided, the viewer loads this first (fast),
   *  then silently swaps to the full-quality modelUrl once it finishes loading. */
  lodUrl?: string | null;
  alt: string;
  interactive: boolean;
  onLoaded: () => void;
};

/**
 * ArPreviewModelViewer
 *
 * Progressive LOD loading strategy when lodUrl is provided:
 *
 *  Phase 1 — LOD-0 (fast):
 *    Mount <model-viewer src=lodUrl>. Fires onLoaded() once done so the
 *    spinner disappears and the poster fades out. User sees a simplified
 *    but correct-looking model in ~200-400ms.
 *
 *  Phase 2 — Full quality (seamless):
 *    While the user is looking at the LOD, a hidden second <model-viewer>
 *    pre-loads the full-quality model. When it fires its "load" event we
 *    swap the visible viewer's src to the full-quality URL. The swap is
 *    instant because the binary is already in the browser cache (fetched
 *    by the hidden viewer). The user perceives zero interruption.
 *
 * Without lodUrl: behaves exactly as before (single model-viewer, no swap).
 */
export function ArPreviewModelViewer({
  modelUrl,
  lodUrl,
  alt,
  onLoaded,
}: Props) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const onLoadedRef    = useRef(onLoaded);
  onLoadedRef.current  = onLoaded;

  useEffect(() => {
    void ensureModelViewerScript();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ─── Helper: create a configured <model-viewer> element ───────────────────
    const createMv = (src: string, visible: boolean): HTMLElement => {
      const mv = document.createElement("model-viewer");
      mv.setAttribute("src", src);
      mv.setAttribute("alt", alt);
      mv.setAttribute("camera-orbit", CAMERA_ORBIT);
      mv.setAttribute("field-of-view", FIELD_OF_VIEW);
      mv.setAttribute("environment-image", "neutral");
      mv.setAttribute("exposure", "1");
      mv.setAttribute("shadow-intensity", "1");
      mv.setAttribute("camera-controls", "");
      mv.setAttribute("auto-rotate", "");
      mv.setAttribute("auto-rotate-delay", "0");
      mv.setAttribute("rotation-per-second", "25deg");
      mv.setAttribute("interaction-prompt", "none");
      mv.setAttribute("disable-zoom", "");

      mv.style.width      = "100%";
      mv.style.height     = "100%";
      mv.style.setProperty("--poster-color", "transparent");
      mv.style.setProperty("--progress-bar-height", "0px");
      mv.style.background = "transparent";

      if (!visible) {
        // Hidden pre-loader for the full-quality model
        mv.style.position      = "absolute";
        mv.style.width         = "1px";
        mv.style.height        = "1px";
        mv.style.opacity       = "0";
        mv.style.pointerEvents = "none";
        mv.style.left          = "-9999px";
      }

      return mv;
    };

    let visibleMv: HTMLElement;
    let hiddenMv: HTMLElement | null = null;
    let cleanedUp = false;
    let handleLodLoad: (() => void) | undefined;
    let handleFullLoad: (() => void) | undefined;
    let handleLoad: (() => void) | undefined;

    if (lodUrl) {
      // ── PHASE 1: mount LOD viewer ──────────────────────────────────────────
      visibleMv = createMv(lodUrl, true);

      handleLodLoad = () => {
        if (cleanedUp) return;
        // Tell the card the model is "ready" — spinner hides, poster fades out
        onLoadedRef.current();

        // ── PHASE 2: pre-load full-quality in hidden viewer ──────────────────
        hiddenMv = createMv(modelUrl, false);
        container.appendChild(hiddenMv);

        handleFullLoad = () => {
          if (cleanedUp) return;
          // Swap the visible viewer to full-quality src.
          // The GLB is already in browser cache so this is near-instant.
          visibleMv.setAttribute("src", modelUrl);

          // Remove the now-redundant hidden viewer
          if (hiddenMv && container.contains(hiddenMv)) {
            container.removeChild(hiddenMv);
            hiddenMv = null;
          }
        };

        hiddenMv.addEventListener("load", handleFullLoad, { once: true });
      };

      visibleMv.addEventListener("load", handleLodLoad, { once: true });

    } else {
      // ── NO LOD: single viewer, original behaviour ──────────────────────────
      visibleMv = createMv(modelUrl, true);
      handleLoad = () => onLoadedRef.current();
      visibleMv.addEventListener("load", handleLoad, { once: true });
    }

    container.appendChild(visibleMv);

    return () => {
      cleanedUp = true;
      if (handleLodLoad) visibleMv.removeEventListener("load", handleLodLoad);
      if (handleLoad) visibleMv.removeEventListener("load", handleLoad);
      if (hiddenMv && handleFullLoad) hiddenMv.removeEventListener("load", handleFullLoad);
      if (container.contains(visibleMv)) container.removeChild(visibleMv);
      if (hiddenMv && container.contains(hiddenMv)) container.removeChild(hiddenMv);
    };
  }, [modelUrl, lodUrl, alt]);

  return <div ref={containerRef} className="h-full w-full" />;
}
