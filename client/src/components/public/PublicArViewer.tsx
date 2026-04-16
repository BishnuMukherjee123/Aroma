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
          "See how your food looks on your table before you order.",
        helper:
          "Scan the floor slowly and look for textures like rugs or patterns for the best stability.",
        launchLabel: "Launch AR Experience",
        error:
          "Chrome on Android gives the best AR result. Check camera permission and try again.",
      };
    case "ios":
      return {
        headline:
          "See how your favorite dishes look on your table in 3D.",
        helper:
          "Aim at a well-lit floor and keep your phone steady to anchor the dish.",
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

  const handleLaunchAr = useCallback(() => {
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

    // THE FIX FOR WEBXR:
    // activateAR() MUST be called synchronously in the click handler!
    // If we trigger React states/awaits before calling it, Chrome loses the 
    // "user gesture" context and silently falls back to Scene Viewer.
    try {
      void viewer.activateAR();
    } catch {
      setLaunchError("AR could not open right now. Check camera permissions.");
      setArStage("error");
      setIsLaunchPending(false);
      return;
    }

    // Update state only after the synchronous call
    setLaunchError(null);
    setIsLaunchPending(true);
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
    <div className="relative min-h-screen overflow-hidden bg-[#08090c] public-ar-viewer">
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
        This is fully transparent because poster is undefined.
        It sits full-screen so WebXR can detect it, but it doesn't block the UI or show the 3D model.
      */}
      {selectedDish?.modelUrl ? (
        <model-viewer
          ref={(node) => {
            viewerRef.current = node as ModelViewerElement | null;
          }}
          src={selectedDish.modelUrl}
          alt={selectedDish.name}
          poster={undefined}
          reveal="auto"
          ar
          ar-modes="webxr scene-viewer quick-look"
          ar-placement="floor"
          ar-scale="auto"
          scale="3 3 3"
          shadow-intensity="1.5"
          disable-zoom
          xr-environment
          touch-action="pan-y"
          loading="eager"
          className={`fixed inset-0 z-0 h-full w-full pointer-events-none ${showGateScreen ? "opacity-0" : "opacity-100"}`}
        >
          <div slot="ar-button" className="hidden" />
          <div slot="ar-prompt" className="ar-prompt-chip">
            <span className="text-lg">☝️</span>
            <span>Tap a surface to place the dish</span>
          </div>
          <button
            slot="ar-button"
            className="hidden"
          />
          <div className="ar-controls-overlay">
            <button 
              type="button"
              className="ar-reset-btn"
              onClick={() => {
                const viewer = viewerRef.current;
                if (viewer) {
                  // Re-trigger the AR activation safely
                  viewer.activateAR?.();
                }
              }}
            >
              <span className="material-symbols-outlined">refresh</span>
              Reset
            </button>
          </div>
          {selectedDish ? (
            <div className="ar-dish-badge">{selectedDish.name}</div>
          ) : null}
        </model-viewer>
      ) : null}

      {showGateScreen ? (
        <div className="relative z-20 flex min-h-[calc(100vh-5rem)] w-full items-center justify-center px-4">
          <div className="w-full max-w-[21rem] rounded-[1.75rem] border border-white/10 bg-white/[0.04] px-6 py-8 text-center text-white shadow-[0_22px_44px_rgba(0,0,0,0.5)] backdrop-blur-xl md:max-w-md md:rounded-[2rem] md:px-8 md:py-10">
            <p className="text-[1.7rem] font-black tracking-[0.12em] text-white md:text-[2.2rem]">
              AROMA AR
            </p>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-white/70 md:mt-5 md:text-[1.1rem]">
              {launchCopy.headline}
            </p>

            {arStage === "error" && launchError ? (
              <p className="mt-5 rounded-[0.85rem] border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-white/90 shadow-inner">
                {launchError}
              </p>
            ) : null}

            <button
              type="button"
              onClick={handleLaunchAr}
              disabled={
                !hasModel || deviceProfile === "desktop" || isLaunchPending
              }
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-[1rem] bg-gradient-to-br from-primary to-primary-container px-4 py-3.5 text-[0.95rem] font-bold text-white shadow-[0_12px_24px_rgba(182,23,34,0.22)] transition-all active:scale-[0.96] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-white/10 disabled:bg-none disabled:text-white/40 disabled:shadow-none md:mt-8 md:rounded-[1.2rem] md:px-5 md:py-4 md:text-[1.05rem]"
            >
              {isLaunchPending ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Preparing AR Menu...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[1.2rem] md:text-lg">
                    view_in_ar
                  </span>
                  {hasModel
                    ? launchCopy.launchLabel
                    : "No AR model for this dish"}
                </>
              )}
            </button>

            {selectedDish ? (
              <div className="mt-6 inline-flex items-center rounded-full bg-white/8 px-4 py-2 text-sm font-semibold text-white/88">
                {selectedDish.name}
              </div>
            ) : null}

            <p className="mt-4 text-sm leading-7 text-white/58">
              {launchCopy.helper}
            </p>

            <Link
              href={`/r/${restaurant.publicId}`}
              className="mt-6 inline-flex text-sm font-semibold text-white/70 transition-colors hover:text-white"
            >
              Back to menu
            </Link>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
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

        /* ── AR Control Overlay (Reset Button) ────────────────────────── */
        .public-ar-viewer .ar-controls-overlay {
          position: absolute;
          bottom: 2rem;
          left: 50%;
          transform: translateX(-50%);
          z-index: 100;
          display: none;
        }

        .public-ar-viewer model-viewer[ar-status="session-started"] .ar-controls-overlay,
        .public-ar-viewer model-viewer[ar-status="object-placed"] .ar-controls-overlay {
          display: block;
        }

        .public-ar-viewer .ar-reset-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.8rem 1.4rem;
          background: rgba(18, 20, 25, 0.85);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 999px;
          font-size: 0.95rem;
          font-weight: 600;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .public-ar-viewer .ar-reset-btn:active {
          scale: 0.95;
          background: rgba(18, 20, 25, 0.95);
        }

        .public-ar-viewer .ar-reset-btn span {
          font-size: 1.2rem;
        }
      `}</style>
    </div>
  );
}




