"use client";

import { useEffect, useRef } from "react";

/**
 * CDN must match the version used in the poster backfill script so the
 * renderer is byte-for-byte identical and the live preview looks the same
 * as the pre-generated poster image.
 */
const MODEL_VIEWER_CDN =
  "https://ajax.googleapis.com/ajax/libs/model-viewer/4.1.0/model-viewer.min.js";

let scriptInjected = false;

function ensureModelViewerScript() {
  if (scriptInjected || typeof document === "undefined") return;
  scriptInjected = true;
  if (document.querySelector(`script[src="${MODEL_VIEWER_CDN}"]`)) return;
  const script = document.createElement("script");
  script.type = "module";
  script.src = MODEL_VIEWER_CDN;
  document.head.appendChild(script);
}

/**
 * Camera settings — MUST stay in sync with backfill-posters.ts so the static
 * poster PNG and the live interactive view look visually identical.
 */
const CAMERA_ORBIT = "0deg 82deg auto";
const FIELD_OF_VIEW = "28deg";

type Props = {
  modelUrl: string;
  alt: string;
  /** Not used for rendering decisions — kept for API compatibility with ArPreviewCanvas */
  interactive: boolean;
  onLoaded: () => void;
};

/**
 * Renders a GLB using the <model-viewer> web component.
 * Using the same renderer as the poster generation guarantees that the
 * static poster image and the live 3D preview look visually identical —
 * same camera, same lighting, same WebGL pipeline.
 */
export function ArPreviewModelViewer({
  modelUrl,
  alt,
  onLoaded,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Keep the callback stable across renders without re-triggering effects
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  // Inject model-viewer script once
  useEffect(() => {
    ensureModelViewerScript();
  }, []);

  // Imperatively create the <model-viewer> element to avoid TypeScript JSX
  // namespace issues with custom elements.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const mv = document.createElement("model-viewer");

    // Core model settings
    mv.setAttribute("src", modelUrl);
    mv.setAttribute("alt", alt);

    // Camera — identical to poster generation
    mv.setAttribute("camera-orbit", CAMERA_ORBIT);
    mv.setAttribute("field-of-view", FIELD_OF_VIEW);

    // Lighting — identical to poster generation
    mv.setAttribute("environment-image", "neutral");
    mv.setAttribute("exposure", "1");
    mv.setAttribute("shadow-intensity", "1");

    // Interaction
    mv.setAttribute("camera-controls", "");
    mv.setAttribute("auto-rotate", "");
    mv.setAttribute("auto-rotate-delay", "0");
    mv.setAttribute("rotation-per-second", "25deg");
    mv.setAttribute("interaction-prompt", "none");
    mv.setAttribute("disable-zoom", "");

    // Visual — transparent so the card gradient shows behind it
    mv.style.width = "100%";
    mv.style.height = "100%";
    mv.style.setProperty("--poster-color", "transparent");
    mv.style.setProperty("--progress-bar-height", "0px");   // hide gray loading bar
    mv.style.background = "transparent";

    // Fire onLoaded when model-viewer finishes loading the GLB
    const handleLoad = () => onLoadedRef.current();
    mv.addEventListener("load", handleLoad, { once: true });

    container.appendChild(mv);

    return () => {
      mv.removeEventListener("load", handleLoad);
      if (container.contains(mv)) {
        container.removeChild(mv);
      }
    };
  }, [modelUrl, alt]);

  return <div ref={containerRef} className="h-full w-full" />;
}
