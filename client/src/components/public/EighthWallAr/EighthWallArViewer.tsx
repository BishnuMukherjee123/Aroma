"use client";

import { useEffect, useRef, useState } from "react";

import "./EighthWallArViewer.css";

const EIGHTH_WALL_BASE = "/8thwall";
const AFRAME_SCRIPT = `${EIGHTH_WALL_BASE}/external/scripts/8frame-1.5.0.min.js`;
const XREXTRAS_SCRIPT = `${EIGHTH_WALL_BASE}/vendor/xrextras/xrextras.js`;
const LANDING_PAGE_SCRIPT = `${EIGHTH_WALL_BASE}/vendor/landing-page/landing-page.js`;
const ENGINE_SCRIPT = `${EIGHTH_WALL_BASE}/vendor/engine-binary/xr.js`;

type AFrameComponentContext = {
  data: {
    min: number;
    max: number;
  };
  el: HTMLElement & {
    sceneEl?: HTMLElement;
  };
  prompt?: HTMLElement | null;
  spawnedEl?: HTMLElement | null;
};

type AFrameGlobal = {
  components?: Record<string, unknown>;
  registerComponent: (
    name: string,
    component: {
      schema: Record<string, { default: number }>;
      init: (this: AFrameComponentContext) => void;
    },
  ) => void;
};

declare global {
  interface Window {
    AFRAME?: AFrameGlobal;
    XR8?: {
      stop?: () => void;
    };
  }
}

let eighthWallLoadPromise: Promise<void> | null = null;

const loadScript = (
  src: string,
  options: { type?: string; async?: boolean; crossOrigin?: string } = {},
): Promise<void> => {
  const existing = document.querySelector(
    `script[src="${src}"]`,
  ) as HTMLScriptElement | null;

  if (existing?.dataset.loaded === "true") {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const script = existing ?? document.createElement("script");

    const handleLoad = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    const handleError = () => reject(new Error(`Failed to load ${src}`));

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });

    if (!existing) {
      if (options.type) script.type = options.type;
      if (typeof options.async === "boolean") script.async = options.async;
      if (options.crossOrigin) script.crossOrigin = options.crossOrigin;
      script.src = src;

      if (src === ENGINE_SCRIPT) {
        script.setAttribute("data-preload-chunks", "slam");
      }

      document.head.appendChild(script);
    }
  });
};

const installCurrentScriptShim = () => {
  Object.defineProperty(document, "currentScript", {
    configurable: true,
    get() {
      const fakeScript = document.createElement("script");
      fakeScript.src = `${window.location.origin}${ENGINE_SCRIPT}`;
      fakeScript.setAttribute("data-preload-chunks", "slam");
      return fakeScript;
    },
  });
};

const tapPlaceComponent = {
  schema: {
    min: { default: 5 },
    max: { default: 8 },
  },
  init(this: AFrameComponentContext) {
    const ground = document.getElementById("ground");
    this.prompt = document.getElementById("promptText");
    this.spawnedEl = null;

    ground?.addEventListener("click", (event) => {
      if (this.spawnedEl) {
        return;
      }

      if (this.prompt) {
        this.prompt.style.display = "none";
      }

      const touchPoint = (
        event as unknown as CustomEvent<{
          intersection: { point: { x: number; y: number; z: number } };
        }>
      ).detail.intersection.point;

      const newElement = document.createElement("a-entity");
      this.spawnedEl = newElement;

      ground.classList.remove("cantap");

      newElement.setAttribute(
        "position",
        `${touchPoint.x} ${touchPoint.y + 0.05} ${touchPoint.z}`,
      );

      const randomYRotation = Math.random() * 360;
      newElement.setAttribute("rotation", `0 ${randomYRotation} 0`);

      const targetScale = Math.floor(
        Math.random() *
          (Math.floor(this.data.max) - Math.ceil(this.data.min)) +
          Math.ceil(this.data.min),
      );

      newElement.setAttribute("visible", "false");
      newElement.setAttribute("scale", "0.0001 0.0001 0.0001");

      newElement.setAttribute("shadow", {
        receive: false,
        cast: true,
      } as unknown as string);

      newElement.setAttribute("class", "cantap");
      newElement.setAttribute("gltf-model", "#cactusModel");
      this.el.sceneEl?.appendChild(newElement);

      newElement.addEventListener("model-loaded", () => {
        newElement.setAttribute("visible", "true");
        newElement.setAttribute("animation", {
          property: "scale",
          to: `${targetScale} ${targetScale} ${targetScale}`,
          easing: "easeOutElastic",
          dur: 800,
        } as unknown as string);
      });

      newElement.addEventListener("animationcomplete", () => {
        newElement.removeAttribute("animation");
        newElement.setAttribute(
          "scale",
          `${targetScale} ${targetScale} ${targetScale}`,
        );

        newElement.setAttribute("xrextras-two-finger-rotate", "");
        newElement.setAttribute("xrextras-pinch-scale", "min: 0.1; max: 5");
      });
    });
  },
};

const ensureEighthWallRuntime = async () => {
  if (!eighthWallLoadPromise) {
    eighthWallLoadPromise = (async () => {
      await loadScript(AFRAME_SCRIPT, { crossOrigin: "anonymous" });
      await loadScript(XREXTRAS_SCRIPT);
      await loadScript(LANDING_PAGE_SCRIPT);
      installCurrentScriptShim();
      await loadScript(ENGINE_SCRIPT, {
        type: "module",
        async: true,
      });

      if (!window.AFRAME) {
        throw new Error("A-Frame did not initialize.");
      }

      if (!window.AFRAME.components?.["tap-place"]) {
        window.AFRAME.registerComponent("tap-place", tapPlaceComponent);
      }
    })();
  }

  await eighthWallLoadPromise;
};

type Props = {
  modelUrl: string;
  alt: string;
  backUrl?: string;
  onClose?: () => void;
};

export function EighthWallArViewer({
  modelUrl,
  alt,
  backUrl,
  onClose,
}: Props) {
  const [runtimeState, setRuntimeState] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const sceneRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!backUrl) return;

    window.history.pushState({ aromaArBackTrap: true }, "", window.location.href);

    const handlePopState = () => {
      window.sessionStorage.removeItem("aroma-returning-from-ar");
      window.location.replace(backUrl);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [backUrl]);

  useEffect(() => {
    let cancelled = false;

    void ensureEighthWallRuntime()
      .then(() => {
        if (!cancelled) setRuntimeState("ready");
      })
      .catch((error: unknown) => {
        console.error("[aroma] 8th Wall failed to load:", error);
        if (!cancelled) setRuntimeState("error");
      });

    return () => {
      cancelled = true;
      try {
        (sceneRef.current as (HTMLElement & { pause?: () => void }) | null)
          ?.pause?.();
      } catch {
        // A-Frame may already be tearing down the scene.
      }
    };
  }, []);

  return (
    <div className="eighth-wall-ar-shell">
      {onClose ? (
        <button
          type="button"
          className="eighth-wall-ar-close"
          aria-label="Close AR view"
          onClick={onClose}
        >
          ×
        </button>
      ) : null}

      {runtimeState === "loading" ? (
        <div className="eighth-wall-ar-loading" aria-live="polite">
          <span className="eighth-wall-ar-loading-ring" />
        </div>
      ) : null}

      {runtimeState === "error" ? (
        <div className="eighth-wall-ar-error" role="alert">
          AR could not start on this device or browser.
        </div>
      ) : null}

      {runtimeState === "ready" ? (
        <>
          <div className="eighth-wall-ar-over">
            <span id="promptText">Tap To Place Model</span>
          </div>

          <a-scene
            ref={sceneRef}
            tap-place=""
            landing-page=""
            xrextras-loading=""
            xrextras-runtime-error=""
            xrextras-gesture-detector=""
            xrextras-pbr-environment=""
            renderer="colorManagement:true; physicallyCorrectLights:true; toneMapping: ACESFilmic; logarithmicDepthBuffer:true;"
            xrweb="
              allowedDevices: any;
              defaultEnvironmentFogIntensity: 0.5;
              defaultEnvironmentFloorTexture: #groundTex;
              defaultEnvironmentFloorColor: #FFF;
              defaultEnvironmentSkyBottomColor: #B4C4CC;
              defaultEnvironmentSkyTopColor: #5ac8fa;
              defaultEnvironmentSkyGradientStrength: 0.5;"
          >
            <a-assets>
              <img id="groundTex" src="/8thwall/assets/sand.jpg" alt="" />
              <a-asset-item id="cactusModel" src={modelUrl}></a-asset-item>
            </a-assets>

            <a-camera
              id="camera"
              raycaster="objects: .cantap"
              cursor="fuse: false; rayOrigin: mouse;"
            ></a-camera>

            <a-entity
              light="type: directional; intensity: 0.8; castShadow: true; shadowMapHeight:2048; shadowMapWidth:2048; shadowCameraTop: 10; shadowCameraBottom: -10; shadowCameraRight: 10; shadowCameraLeft: -10; target: #camera"
              xrextras-attach="target: camera; offset: 8 15 4"
              position="1 4.3 2.5"
              shadow=""
            ></a-entity>

            <a-light type="ambient" intensity="0.3"></a-light>
            <a-light
              type="hemisphere"
              ground-color="#333"
              intensity="0.8"
            ></a-light>

            <a-box
              id="ground"
              className="cantap"
              scale="1000 2 1000"
              position="0 -0.99 0"
              material="shader: shadow; transparent: true; opacity: 0.7"
              shadow=""
            ></a-box>
          </a-scene>
        </>
      ) : null}
    </div>
  );
}
