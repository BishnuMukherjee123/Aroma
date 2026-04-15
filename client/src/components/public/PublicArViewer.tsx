"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";

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
type ViewerState = "loading" | "ready" | "error";
type ArStage = "gate" | "launching" | "error";

type DishWithMenu = PublicDishPayload & {
  menuName: string;
  categoryName: string;
};

type ModelViewerElement = HTMLElement & {
  activateAR?: () => Promise<void> | void;
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
        headline: "We need access to your camera and motion sensors to display dishes on your table.",
        helper:
          "Chrome on Android will open Scene Viewer or WebXR after you launch the AR experience.",
        launchLabel: "Launch AR Experience",
        error:
          "Chrome on Android gives the best AR result. Check camera permission and try again.",
      };
    case "ios":
      return {
        headline: "We need access to your camera to open the dish in Quick Look and place it in your space.",
        helper:
          "Safari on iPhone or iPad gives the best result for Quick Look AR.",
        launchLabel: "Launch AR Experience",
        error:
          "Quick Look did not open. Try Safari on iPhone or iPad and allow camera access.",
      };
    case "mobile-web":
      return {
        headline: "This phone can try the AR handoff, but Chrome on Android and Safari on iPhone are the most reliable.",
        helper:
          "If the camera does not open, switch to a supported browser and try again.",
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
  const [viewerState, setViewerState] = useState<ViewerState>("loading");
  const [arStage, setArStage] = useState<ArStage>("gate");
  const [launchError, setLaunchError] = useState<string | null>(null);

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
    if (typeof window === "undefined" || !restaurant || restaurant.publicId !== publicId) {
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

  const hasModel = Boolean(selectedDish?.modelUrl);

  useEffect(() => {
    setLaunchError(null);
    setArStage("gate");
    setViewerState(hasModel ? "loading" : "error");
  }, [hasModel, selectedDish?.id]);

  useEffect(() => {
    if (!hasModel || scriptState !== "ready") {
      return;
    }

    const viewer = viewerRef.current;
    if (!viewer) {
      return;
    }

    const handleLoad = () => setViewerState("ready");
    const handleError = () => setViewerState("error");

    viewer.addEventListener("load", handleLoad);
    viewer.addEventListener("error", handleError);

    return () => {
      viewer.removeEventListener("load", handleLoad);
      viewer.removeEventListener("error", handleError);
    };
  }, [hasModel, scriptState, selectedDish?.id]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const handleVisible = () => {
      if (document.visibilityState === "visible") {
        setArStage("gate");
      }
    };

    const handlePageShow = () => {
      setArStage("gate");
    };

    document.addEventListener("visibilitychange", handleVisible);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("visibilitychange", handleVisible);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  const handleLaunchAr = async () => {
    if (!selectedDish || !selectedDish.modelUrl) {
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
    setArStage("launching");

    try {
      await viewer.activateAR();
      // Scene Viewer takes over the screen. When the user returns by tapping the 
      // cross icon, we want the "gate" page to be waiting for them, not the spinner.
      setTimeout(() => {
        // Safe to call, React handles unmounted checks in React 18+
        setArStage("gate");
      }, 1000);
    } catch {
      setLaunchError(
        "AR could not open right now. Check camera permission and try again.",
      );
      setArStage("error");
    }
  };

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
    <div className="relative min-h-screen overflow-hidden bg-[#08090c] px-6 py-10">
      <Script
        src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.1.0/model-viewer.min.js"
        type="module"
        strategy="afterInteractive"
        onLoad={() => setScriptState("ready")}
        onError={() => {
          setScriptState("failed");
          setViewerState("error");
          setLaunchError("The AR engine could not load. Refresh and try again.");
          setArStage("error");
        }}
      />

      {/* Hidden model-viewer element — mounted as soon as we have a model URL.
          This ensures the GLB is always processed before the user taps. */}
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
          ar
          ar-modes="webxr scene-viewer quick-look"
          camera-controls
          interaction-prompt="none"
          touch-action="pan-y"
          loading="eager"
          className="pointer-events-none fixed left-[-9999px] top-0 h-px w-px opacity-0"
        />
      ) : null}

      {arStage === "launching" ? (
        <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center text-white">
            <p className="text-[2.2rem] font-extrabold tracking-[0.1em]">AROMA AR</p>
            <div className="spinner-sm border-white/25 border-t-primary" />
            <p className="text-base font-semibold text-white/80">Preparing AR...</p>
          </div>
        </div>
      ) : (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center">
          <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[rgba(255,255,255,0.08)] px-8 py-10 text-center text-white shadow-[0_22px_56px_rgba(0,0,0,0.38)] backdrop-blur-sm">
            <p className="text-[2.2rem] font-extrabold tracking-[0.1em]">
              AROMA AR
            </p>
            <p className="mt-5 text-[1.1rem] leading-9 text-white/78">
              {launchCopy.headline}
            </p>

            {arStage === "error" && launchError ? (
              <p className="mt-5 rounded-[1rem] border border-white/10 bg-white/8 px-4 py-3 text-sm leading-6 text-white/80">
                {launchError}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void handleLaunchAr()}
              disabled={!hasModel || deviceProfile === "desktop"}
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-[1.2rem] bg-primary px-5 py-4 text-[1.05rem] font-bold text-white shadow-[0_18px_36px_rgba(182,23,34,0.28)] transition-all active:scale-[0.97] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/55 disabled:shadow-none"
            >
              {hasModel ? launchCopy.launchLabel : "No AR model for this dish"}
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
      )}
    </div>
  );
}
