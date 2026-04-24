"use client";

import { useEffect, useRef } from "react";

import { ensureModelViewerScript } from "@/lib/model-viewer";

const CAMERA_ORBIT = "45deg 60deg auto";
const FIELD_OF_VIEW = "30deg";

type Props = {
  modelUrl: string;
  alt: string;
  interactive: boolean;
  onLoaded: () => void;
};

export function ArPreviewModelViewer({
  modelUrl,
  alt,
  onLoaded,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  useEffect(() => {
    void ensureModelViewerScript();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const mv = document.createElement("model-viewer");

    mv.setAttribute("src", modelUrl);
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

    mv.style.width = "100%";
    mv.style.height = "100%";
    mv.style.setProperty("--poster-color", "transparent");
    mv.style.setProperty("--progress-bar-height", "0px");
    mv.style.background = "transparent";

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
