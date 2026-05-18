"use client";

/**
 * EighthWallArViewer
 *
 * Renders the A-Frame / 8th Wall AR scene for a single dish model.
 *
 * SCRIPT LOADING CONTRACT:
 *   All 8th Wall scripts are injected by the parent layout
 *   (app/r/[restaurant_id]/ar/[dish_id]/layout.tsx) via next/script
 *   strategy="beforeInteractive". By the time this component hydrates:
 *     • window.AFRAME  is defined (8frame loaded synchronously)
 *     • window.XR8     may still be loading (engine is afterInteractive)
 *
 *   We listen for the "xrloaded" event to know when XR8 is ready, which is
 *   the same pattern used in the official Three.js example (threejs-world-
 *   effects-example/src/app.js): `window.XR8 ? onxrloaded() : window.addEventListener('xrloaded', onxrloaded)`
 *
 *   When using A-Frame + xrweb, XR8 initialization is handled internally by
 *   xrextras — we don't need to call XR8.run() ourselves. A-Frame's xrweb
 *   component does it. So we simply wait for AFRAME and render the scene.
 */

import { useEffect, useRef, useState } from "react";
import "./EighthWallArViewer.css";

// ─── A-Frame type helpers ────────────────────────────────────────────────────

type AFrameComponentContext = {
  data: { min: number; max: number };
  el: HTMLElement & { sceneEl?: HTMLElement };
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
    XR8?: { stop?: () => void };
  }
}

// ─── tap-place A-Frame component ─────────────────────────────────────────────
//
// One model per session, 5 cm float, shadow cast, easeOutElastic pop-in,
// two-finger rotate + pinch-scale after animation completes.
// Registered once before any <a-scene> renders (see bottom of this module).

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
      if (this.spawnedEl) return; // one model per session

      if (this.prompt) this.prompt.style.display = "none";

      const touchPoint = (
        event as unknown as CustomEvent<{
          intersection: { point: { x: number; y: number; z: number } };
        }>
      ).detail.intersection.point;

      const newElement = document.createElement("a-entity");
      this.spawnedEl = newElement;

      // Disable ground raycasting — future gestures (pinch/rotate) must not
      // re-trigger placement after the model is placed.
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
      newElement.setAttribute("gltf-model", "#dishModel");
      this.el.sceneEl?.appendChild(newElement);

      // Pop-in animation once GLB is decoded
      newElement.addEventListener("model-loaded", () => {
        newElement.setAttribute("visible", "true");
        newElement.setAttribute("animation", {
          property: "scale",
          to: `${targetScale} ${targetScale} ${targetScale}`,
          easing: "easeOutElastic",
          dur: 800,
        } as unknown as string);
      });

      // Attach gestures AFTER animation finishes so the scale baseline is correct.
      // If attached at scale 0.0001, pinch-scale caches that as its minimum
      // and the model instantly collapses on first multi-touch.
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

// ─── Props ───────────────────────────────────────────────────────────────────

type Props = {
  modelUrl: string;
  alt: string;
  backUrl?: string;
  onClose?: () => void;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function EighthWallArViewer({ modelUrl, alt, backUrl, onClose }: Props) {
  const [runtimeState, setRuntimeState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const sceneRef = useRef<HTMLElement | null>(null);
  const registeredRef = useRef(false);

  // ── Back-gesture / close handling ─────────────────────────────────────────
  //
  // Strategy: we do NOT intercept the browser back button here.
  // The menu page already sets aroma-returning-from-ar in sessionStorage before
  // navigating to AR. When the user presses back:
  //   • Browser restores menu from BFCache  → pageshow (persisted:true) fires
  //   • PublicRestaurantMenu detects the flag → window.location.reload()
  //   • Fresh menu page, all 8th Wall state cleared, button re-enabled.
  //
  // The pushState trap is only used for the onClose (overlay) mode so that
  // the × button can close the viewer without full-page navigation.
  useEffect(() => {
    if (!onClose) return; // backUrl mode: let native browser back handle it

    window.history.pushState({ aromaArBackTrap: true }, "", window.location.href);

    const handlePopState = () => {
      onClose();
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [onClose]);

  // ── Wait for AFRAME ────────────────────────────────────────────────────────
  //
  // The layout loads 8frame synchronously with strategy="beforeInteractive",
  // so window.AFRAME should be defined before this effect ever runs.
  // We register tap-place here (once) so it's available when <a-scene> parses.
  useEffect(() => {
    let cancelled = false;

    const registerAndReady = () => {
      if (cancelled) return;

      if (window.AFRAME && !registeredRef.current) {
        if (!window.AFRAME.components?.["tap-place"]) {
          window.AFRAME.registerComponent("tap-place", tapPlaceComponent);
        }
        registeredRef.current = true;
      }

      setRuntimeState("ready");
    };

    if (window.AFRAME) {
      // Happy path: 8frame already evaluated (expected case)
      registerAndReady();
    } else {
      // Fallback: poll for up to 5 s in case the script is still evaluating
      let elapsed = 0;
      const poll = setInterval(() => {
        elapsed += 100;
        if (window.AFRAME) {
          clearInterval(poll);
          registerAndReady();
        } else if (elapsed >= 5000) {
          clearInterval(poll);
          if (!cancelled) setRuntimeState("error");
        }
      }, 100);

      return () => {
        cancelled = true;
        clearInterval(poll);
      };
    }

    return () => {
      cancelled = true;
      try {
        (sceneRef.current as (HTMLElement & { pause?: () => void }) | null)?.pause?.();
        window.XR8?.stop?.();
      } catch {
        // A-Frame may already be tearing down
      }
    };
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="eighth-wall-ar-shell">
      {/* ── Close / back button ─────────────────────────────────────────── */}
      {onClose ? (
        <button
          type="button"
          className="eighth-wall-ar-close"
          aria-label="Close AR view"
          onClick={() => {
            if (window.history.state?.aromaArBackTrap) {
              window.history.back();
              return;
            }
            onClose();
          }}
        >
          ×
        </button>
      ) : null}

      {/* ── Loading ─────────────────────────────────────────────────────── */}
      {runtimeState === "loading" ? (
        <div className="eighth-wall-ar-loading" aria-live="polite">
          <span className="eighth-wall-ar-loading-ring" />
          <span className="eighth-wall-ar-loading-text">Starting camera…</span>
        </div>
      ) : null}

      {/* ── Error ───────────────────────────────────────────────────────── */}
      {runtimeState === "error" ? (
        <div className="eighth-wall-ar-error" role="alert">
          <p>AR could not start on this device.</p>
          <small>Try Chrome on Android or Safari 16+ on iOS.</small>
          {backUrl && (
            <a href={backUrl} className="eighth-wall-ar-back-link">
              ← Back to menu
            </a>
          )}
        </div>
      ) : null}

      {/* ── AR Scene ────────────────────────────────────────────────────── */}
      {runtimeState === "ready" ? (
        <>
          {/* "Tap To Place Model" prompt overlay */}
          <div className="eighth-wall-ar-over">
            <span id="promptText">Tap To Place Model</span>
          </div>

          {/*
           * <a-scene> with xrweb.
           *
           * allowedDevices: any  — this is the key flag for iOS. Without it,
           * 8th Wall restricts camera access on certain device classes and the
           * rear camera never opens.
           *
           * xrextras-pbr-environment provides realistic IBL lighting so the
           * dish material looks correct under AR lighting conditions.
           */}
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
              {/* id="dishModel" — referenced by gltf-model in tap-place component */}
              <a-asset-item id="dishModel" src={modelUrl} />
            </a-assets>

            {/* Camera with raycaster limited to .cantap objects */}
            <a-camera
              id="camera"
              raycaster="objects: .cantap"
              cursor="fuse: false; rayOrigin: mouse;"
            />

            {/* Directional light that follows the camera */}
            <a-entity
              light="type: directional; intensity: 0.8; castShadow: true; shadowMapHeight:2048; shadowMapWidth:2048; shadowCameraTop: 10; shadowCameraBottom: -10; shadowCameraRight: 10; shadowCameraLeft: -10; target: #camera"
              xrextras-attach="target: camera; offset: 8 15 4"
              position="1 4.3 2.5"
              shadow=""
            />

            <a-light type="ambient" intensity="0.3" />
            <a-light type="hemisphere" ground-color="#333" intensity="0.8" />

            {/* Large invisible ground plane — clicking triggers tap-place */}
            <a-box
              id="ground"
              className="cantap"
              scale="1000 2 1000"
              position="0 -0.99 0"
              material="shader: shadow; transparent: true; opacity: 0.7"
              shadow=""
            />
          </a-scene>
        </>
      ) : null}
    </div>
  );
}
