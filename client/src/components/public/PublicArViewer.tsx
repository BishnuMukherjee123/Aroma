"use client";

import Link from "next/link";
import Script from "next/script";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  fetchPublicRestaurant,
  type PublicDishPayload,
  type PublicRestaurantPayload,
} from "@/lib/api";

type PublicArViewerProps = {
  publicId: string;
  initialDishId?: string;
  initialRestaurant?: PublicRestaurantPayload | null;
};

type DeviceProfile = "desktop" | "android" | "ios" | "mobile-web";
type ViewerScriptState = "loading" | "ready" | "failed";
type ArStage = "gate" | "placing" | "placed" | "error";

type DishWithMenu = PublicDishPayload & {
  menuName: string;
  categoryName: string;
};

type ModelViewerElement = HTMLElement & {
  activateAR?: () => Promise<void> | void;
  canActivateAR?: boolean;
};

const detectDeviceProfile = (): DeviceProfile => {
  if (typeof navigator === "undefined") {
    return "desktop";
  }

  const userAgent = navigator.userAgent.toLowerCase();
  const hasTouchMac =
    userAgent.includes("macintosh") && navigator.maxTouchPoints > 1;

  if (userAgent.includes("android")) {
    return "android";
  }

  if (/iphone|ipad|ipod/.test(userAgent) || hasTouchMac) {
    return "ios";
  }

  if (/mobile|phone|tablet/.test(userAgent)) {
    return "mobile-web";
  }

  return "desktop";
};

const getLaunchCopy = (profile: DeviceProfile) => {
  switch (profile) {
    case "android":
      return {
        headline:
          "We need access to your camera and motion sensors to display dishes on your table.",
        helper:
          "Chrome on Android will keep this AR flow inside the browser when WebXR is available.",
        launchLabel: "Launch AR Experience",
        error:
          "Chrome on Android gives the best AR result. Check camera permission and try again.",
      };
    case "ios":
      return {
        headline:
          "We need access to your camera to open the dish in Quick Look and place it in your space.",
        helper:
          "Safari on iPhone or iPad gives the best result for Quick Look AR.",
        launchLabel: "Launch AR Experience",
        error:
          "Quick Look did not open. Try Safari on iPhone or iPad and allow camera access.",
      };
    case "mobile-web":
      return {
        headline:
          "This phone can try browser AR, but Chrome on Android and Safari on iPhone are still the most reliable.",
        helper:
          "If the camera does not open here, switch to a supported browser and try again.",
        launchLabel: "Try AR Experience",
        error:
          "This browser could not launch AR directly. Try Chrome on Android or Safari on iPhone.",
      };
    default:
      return {
        headline:
          "This experience opens best on a phone with camera access and AR support.",
        helper:
          "Open this same link on a supported phone to place the dish on your table.",
        launchLabel: "Open On Phone",
        error:
          "Desktop preview cannot launch camera AR directly. Open this link on a phone instead.",
      };
  }
};

export function PublicArViewer({
  publicId,
  initialDishId,
  initialRestaurant = null,
}: PublicArViewerProps) {
  const [restaurant, setRestaurant] = useState<PublicRestaurantPayload | null>(
    initialRestaurant,
  );
  const [isPageLoading, setIsPageLoading] = useState(initialRestaurant === null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [selectedDishId, setSelectedDishId] = useState(initialDishId ?? "");
  const [deviceProfile, setDeviceProfile] = useState<DeviceProfile>("desktop");
  const [scriptState, setScriptState] = useState<ViewerScriptState>("loading");
  const [arStage, setArStage] = useState<ArStage>("gate");
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [isLaunchPending, setIsLaunchPending] = useState(false);

  const viewerRef = useRef<ModelViewerElement | null>(null);

  useEffect(() => {
    setDeviceProfile(detectDeviceProfile());

    if (
      typeof window !== "undefined" &&
      window.customElements?.get("model-viewer")
    ) {
      setScriptState("ready");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const cacheKey = `aroma-public-restaurant:${publicId}`;

    const seedFromCache = () => {
      if (typeof window === "undefined") {
        return false;
      }

      const cachedValue = window.sessionStorage.getItem(cacheKey);
      if (!cachedValue) {
        return false;
      }

      try {
        const parsed = JSON.parse(cachedValue) as PublicRestaurantPayload;
        if (parsed.publicId !== publicId) {
          return false;
        }

        setRestaurant(parsed);
        setPageError(null);
        setIsPageLoading(false);
        return true;
      } catch {
        window.sessionStorage.removeItem(cacheKey);
        return false;
      }
    };

    const seededFromInitial =
      !!initialRestaurant && initialRestaurant.publicId === publicId;

    if (seededFromInitial) {
      setRestaurant(initialRestaurant);
      setPageError(null);
      setIsPageLoading(false);
    } else if (!seedFromCache()) {
      setIsPageLoading(true);
    }

    const load = async () => {
      try {
        const payload = await fetchPublicRestaurant(publicId);
        if (!cancelled) {
          setRestaurant(payload);
          setPageError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          const seededFromStorage = seedFromCache();

          if (!seededFromInitial && !seededFromStorage) {
            setPageError(
              loadError instanceof Error
                ? loadError.message
                : "We could not load this AR experience right now.",
            );
          }
        }
      } finally {
        if (!cancelled) {
          setIsPageLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [initialRestaurant, publicId]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !restaurant ||
      restaurant.publicId !== publicId
    ) {
      return;
    }

    window.sessionStorage.setItem(
      `aroma-public-restaurant:${publicId}`,
      JSON.stringify(restaurant),
    );
  }, [publicId, restaurant]);

  const dishes = useMemo<DishWithMenu[]>(() => {
    if (!restaurant) {
      return [];
    }

    return restaurant.menus.flatMap((menu) =>
      menu.categories.flatMap((category) =>
        category.dishes.map((dish) => ({
          ...dish,
          menuName: menu.name,
          categoryName: category.name,
        })),
      ),
    );
  }, [restaurant]);

  useEffect(() => {
    if (dishes.length === 0) {
      return;
    }

    const requestedDish = initialDishId
      ? dishes.find((dish) => dish.id === initialDishId)
      : null;
    const currentDish = selectedDishId
      ? dishes.find((dish) => dish.id === selectedDishId)
      : null;
    const fallbackDish =
      requestedDish ??
      currentDish ??
      dishes.find((dish) => Boolean(dish.modelUrl)) ??
      dishes[0];

    if (fallbackDish && fallbackDish.id !== selectedDishId) {
      setSelectedDishId(fallbackDish.id);
    }
  }, [dishes, initialDishId, selectedDishId]);

  const selectedDish = useMemo(
    () =>
      dishes.find((dish) => dish.id === selectedDishId) ??
      dishes.find((dish) => Boolean(dish.modelUrl)) ??
      dishes[0] ??
      null,
    [dishes, selectedDishId],
  );

  const launchCopy = useMemo(
    () => getLaunchCopy(deviceProfile),
    [deviceProfile],
  );

  const arModes = useMemo(() => {
    switch (deviceProfile) {
      case "android":
      case "mobile-web":
      case "ios":
        return "webxr";
      default:
        return "webxr";
    }
  }, [deviceProfile]);

  const hasModel = Boolean(selectedDish?.modelUrl);
  const showGateScreen = arStage === "gate" || arStage === "error";

  useEffect(() => {
    setLaunchError(null);
    setArStage("gate");
    setIsLaunchPending(false);
  }, [hasModel, selectedDish?.id]);

  useEffect(() => {
    if (!hasModel || scriptState !== "ready") {
      return;
    }

    const viewer = viewerRef.current;
    if (!viewer) {
      return;
    }

    const handleArStatus = (event: Event) => {
      const status =
        (event as CustomEvent<{ status?: string }>).detail?.status ??
        viewer.getAttribute("ar-status");

      if (!status) {
        return;
      }

      if (status === "session-started") {
        setIsLaunchPending(false);
        setLaunchError(null);
        setArStage("placing");
        return;
      }

      if (status === "object-placed") {
        setIsLaunchPending(false);
        setLaunchError(null);
        setArStage("placed");
        return;
      }

      if (status === "not-presenting") {
        setIsLaunchPending(false);
        setLaunchError(null);
        setArStage("gate");
        return;
      }

      if (status === "failed") {
        setIsLaunchPending(false);
        setLaunchError(
          "AR could not open right now. Check camera permission and try again.",
        );
        setArStage("error");
      }
    };

    viewer.addEventListener("ar-status", handleArStatus as EventListener);

    return () => {
      viewer.removeEventListener(
        "ar-status",
        handleArStatus as EventListener,
      );
    };
  }, [hasModel, scriptState, selectedDish?.id]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const handleVisible = () => {
      if (document.visibilityState === "visible") {
        setIsLaunchPending(false);
        setArStage("gate");
      }
    };

    const handlePageShow = () => {
      setIsLaunchPending(false);
      setArStage("gate");
    };

    document.addEventListener("visibilitychange", handleVisible);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("visibilitychange", handleVisible);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  const handleLaunchAr = useCallback(async () => {
    if (!selectedDish?.modelUrl) {
      setLaunchError("This dish is still waiting for its 3D model.");
      setArStage("error");
      return;
    }

    if (deviceProfile === "desktop") {
      setLaunchError(launchCopy.error);
      setArStage("error");
      return;
    }

    if (scriptState !== "ready") {
      setLaunchError(
        "The AR engine is still loading. Give it a moment and try again.",
      );
      setArStage("error");
      return;
    }

    const viewer = viewerRef.current;
    if (!viewer?.activateAR) {
      setLaunchError(launchCopy.error);
      setArStage("error");
      return;
    }

    setLaunchError(null);
    setIsLaunchPending(true);

    try {
      await viewer.activateAR();
    } catch {
      setIsLaunchPending(false);
      setLaunchError(
        "AR could not open right now. Check camera permission and try again.",
      );
      setArStage("error");
    }
  }, [deviceProfile, launchCopy.error, scriptState, selectedDish]);

  if (pageError || !restaurant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#08090c] px-6">
        <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[rgba(255,255,255,0.08)] px-8 py-10 text-center text-white shadow-[0_18px_48px_rgba(0,0,0,0.35)] backdrop-blur-sm">
          <p className="text-[2.2rem] font-extrabold tracking-[0.1em]">
            AROMA AR
          </p>
          <p className="mt-5 text-[1.1rem] leading-9 text-white/78">
            {isPageLoading
              ? "Preparing the AR launch..."
              : pageError ?? "This AR experience could not be loaded right now."}
          </p>
          {isPageLoading ? (
            <div className="mx-auto mt-6 spinner-sm border-white/25 border-t-primary" />
          ) : null}
          <Link
            href={`/r/${publicId}`}
            className="mt-8 inline-flex w-full items-center justify-center rounded-[1.2rem] bg-primary px-5 py-4 text-base font-bold text-white"
          >
            Back to menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#08090c] public-ar-viewer">
      <Script
        src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.1.0/model-viewer.min.js"
        type="module"
        strategy="afterInteractive"
        onLoad={() => setScriptState("ready")}
        onError={() => {
          setScriptState("failed");
          setLaunchError("The AR engine could not load. Refresh and try again.");
          setArStage("error");
        }}
      />

      {/*
        THE KEY FIX: model-viewer is full-screen with reveal="manual" (shows only poster).
        We use the native slot="ar-button" — NOT programmatic activateAR().
        WebXR requires a DIRECT user gesture (touch → camera permission).
        Calling activateAR() from a React callback chain breaks the gesture chain,
        causing Chrome to silently fall back to Scene Viewer (native app).
        With the native button, the gesture flows directly: tap → WebXR session → in-browser camera.
      */}
      {selectedDish?.modelUrl ? (
        <model-viewer
          ref={(node) => {
            viewerRef.current = node as ModelViewerElement | null;
          }}
          src={selectedDish.modelUrl}
          alt={selectedDish.name}
          poster={
            selectedDish.posterUrl ?? selectedDish.thumbnailUrl ?? undefined
          }
          reveal="manual"
          ar
          ar-modes="webxr scene-viewer quick-look"
          ar-placement="floor"
          xr-environment
          loading="eager"
          className="fixed inset-0 z-0 h-full w-full"
        >
          {/* Native AR button — direct user gesture, no JS indirection */}
          <button
            slot="ar-button"
            disabled={!hasModel || deviceProfile === "desktop"}
            className="ar-launch-btn"
          >
            <span className="ar-launch-icon">view_in_ar</span>
            {hasModel ? launchCopy.launchLabel : "No AR model for this dish"}
          </button>

          {/* "Tap a surface" prompt shown by model-viewer while scanning for surfaces */}
          <div slot="ar-prompt" className="ar-prompt-chip">
            <span>☝️</span>
            <span>Tap a surface to place the dish</span>
          </div>

          {/* Dish name badge shown during active AR session */}
          {selectedDish ? (
            <div className="ar-dish-badge">{selectedDish.name}</div>
          ) : null}
        </model-viewer>
      ) : null}

      {/* AROMA AR info card — sits at top of screen, leaves bottom clear for Launch button.
          Hides automatically when AR session is active (arStage changes to "placing"). */}
      {showGateScreen ? (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-10 flex flex-col items-center px-4 pt-14">
          <div className="pointer-events-auto w-full max-w-[21rem] rounded-[1.75rem] border border-white/10 bg-black/75 px-6 py-6 text-center text-white shadow-[0_22px_44px_rgba(0,0,0,0.6)] backdrop-blur-xl">
            <p className="text-[1.7rem] font-black tracking-[0.12em] md:text-[2.2rem]">
              AROMA AR
            </p>
            <p className="mt-2 text-[0.9rem] leading-relaxed text-white/70">
              {launchCopy.headline}
            </p>

            {arStage === "error" && launchError ? (
              <p className="mt-3 rounded-[0.85rem] border border-white/10 bg-black/30 px-4 py-2.5 text-sm leading-6 text-white/90">
                {launchError}
              </p>
            ) : null}

            {selectedDish ? (
              <div className="mt-4 inline-flex items-center rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold text-white/90">
                {selectedDish.name}
              </div>
            ) : null}

            <p className="mt-3 text-xs leading-5 text-white/50">
              {launchCopy.helper}
            </p>
          </div>

          <Link
            href={`/r/${restaurant.publicId}`}
            className="pointer-events-auto mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/50 px-4 py-2 text-sm font-semibold text-white/80 backdrop-blur-sm transition-colors hover:text-white"
          >
            ← Back to menu
          </Link>
        </div>
      ) : null}

      <style jsx global>{`
        /* ── Native AR launch button ────────────────────────────────────── */
        .public-ar-viewer .ar-launch-btn {
          position: absolute;
          bottom: 40px;
          left: 50%;
          transform: translateX(-50%);
          width: calc(100% - 48px);
          max-width: 320px;
          background: linear-gradient(135deg, #b61722 0%, #8c141f 100%);
          color: white;
          font-weight: 800;
          font-size: 0.95rem;
          padding: 14px 20px;
          border-radius: 16px;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 12px 28px rgba(182, 23, 34, 0.32);
          font-family: inherit;
          letter-spacing: 0.02em;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .public-ar-viewer .ar-launch-btn:active {
          transform: translateX(-50%) scale(0.96);
          box-shadow: 0 6px 14px rgba(182, 23, 34, 0.22);
        }
        .public-ar-viewer .ar-launch-btn:disabled {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.4);
          box-shadow: none;
          cursor: not-allowed;
        }
        .public-ar-viewer .ar-launch-icon {
          font-family: "Material Symbols Outlined";
          font-size: 1.2rem;
          font-weight: 400;
          font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24;
        }

        /* ── "Tap a surface" prompt ─────────────────────────────────────── */
        .public-ar-viewer .ar-prompt-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.65rem;
          border-radius: 999px;
          background: rgba(18, 20, 25, 0.82);
          color: white;
          padding: 0.85rem 1.2rem;
          font-size: 0.95rem;
          font-weight: 600;
          box-shadow: 0 12px 26px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        /* ── Dish name badge (shown during AR session) ──────────────────── */
        .public-ar-viewer .ar-dish-badge {
          position: absolute;
          top: 1.25rem;
          right: 1.25rem;
          display: none;
          align-items: center;
          justify-content: center;
          min-width: 7rem;
          border-radius: 999px;
          background: rgba(18, 20, 25, 0.78);
          color: white;
          padding: 0.7rem 1rem;
          font-size: 0.92rem;
          font-weight: 600;
          text-align: center;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        .public-ar-viewer model-viewer[ar-status="session-started"] .ar-dish-badge,
        .public-ar-viewer model-viewer[ar-status="object-placed"] .ar-dish-badge {
          display: inline-flex;
        }
      `}</style>
    </div>
  );
}




