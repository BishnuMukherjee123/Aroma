"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  fetchPublicRestaurant,
  type PublicDishPayload,
  type PublicRestaurantPayload,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type PublicArViewerProps = {
  publicId: string;
  initialDishId?: string;
};

type DeviceProfile = "desktop" | "android" | "ios" | "mobile-web";

type ViewerScriptState = "loading" | "ready" | "failed";

type ViewerState = "loading" | "ready" | "error";

type DishWithMenu = PublicDishPayload & {
  menuName: string;
  categoryName: string;
};

type ModelViewerElement = HTMLElement & {
  activateAR?: () => Promise<void> | void;
  canActivateAR?: boolean;
};

const formatPrice = (
  value: number,
  currency: PublicDishPayload["currency"] | string | undefined,
) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency:
      currency &&
      ["USD", "INR", "EUR", "GBP", "AED"].includes(currency)
        ? currency
        : "USD",
    minimumFractionDigits: 2,
  }).format(value);

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

const getDeviceCopy = (profile: DeviceProfile) => {
  switch (profile) {
    case "android":
      return {
        badge: "Android AR",
        action: "Launch AR",
        headline: "Scene Viewer or WebXR should open from this page.",
        helper:
          "Stand over a well-lit flat surface, then move your phone slowly so the browser can detect the table.",
      };
    case "ios":
      return {
        badge: "iPhone AR",
        action: "Launch AR",
        headline: "Quick Look works best in Safari on iPhone and iPad.",
        helper:
          "If AR does not open, try Safari and keep the phone pointed at a clean, bright surface.",
      };
    case "mobile-web":
      return {
        badge: "Mobile Preview",
        action: "Try AR",
        headline: "This phone can still preview the 3D plate in-browser.",
        helper:
          "For the most reliable AR launch, use Chrome on Android or Safari on iPhone.",
      };
    default:
      return {
        badge: "Desktop Preview",
        action: "Open on phone for AR",
        headline: "Desktop shows a live 3D preview instead of table placement.",
        helper:
          "Open this same link on a supported phone when you are ready to place the dish in your space.",
      };
  }
};

export function PublicArViewer({
  publicId,
  initialDishId,
}: PublicArViewerProps) {
  const [restaurant, setRestaurant] = useState<PublicRestaurantPayload | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [selectedDishId, setSelectedDishId] = useState(initialDishId ?? "");
  const [deviceProfile, setDeviceProfile] = useState<DeviceProfile>("desktop");
  const [scriptState, setScriptState] = useState<ViewerScriptState>("loading");
  const [viewerState, setViewerState] = useState<ViewerState>("loading");
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [launchFeedback, setLaunchFeedback] = useState<string | null>(null);

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

    const load = async () => {
      setIsPageLoading(true);
      setPageError(null);

      try {
        const payload = await fetchPublicRestaurant(publicId);
        if (!cancelled) {
          setRestaurant(payload);
        }
      } catch (loadError) {
        if (!cancelled) {
          setPageError(
            loadError instanceof Error
              ? loadError.message
              : "We could not load this AR experience right now.",
          );
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
  }, [publicId]);

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

  const deviceCopy = useMemo(
    () => getDeviceCopy(deviceProfile),
    [deviceProfile],
  );

  const arReadyCount = useMemo(
    () => dishes.filter((dish) => Boolean(dish.modelUrl)).length,
    [dishes],
  );

  const hasModel = Boolean(selectedDish?.modelUrl);

  useEffect(() => {
    if (typeof window === "undefined" || !selectedDishId) {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("dish", selectedDishId);
    window.history.replaceState({}, "", url.toString());
  }, [selectedDishId]);

  useEffect(() => {
    setLaunchFeedback(null);
    setViewerError(null);
    setViewerState(hasModel ? "loading" : "ready");
  }, [hasModel, selectedDish?.id]);

  useEffect(() => {
    if (!hasModel || scriptState !== "ready") {
      return;
    }

    const viewer = viewerRef.current;
    if (!viewer) {
      return;
    }

    const handleLoad = () => {
      setViewerState("ready");
      setViewerError(null);
    };

    const handleError = () => {
      setViewerState("error");
      setViewerError(
        "This 3D model could not be prepared. Try another dish or refresh the page.",
      );
    };

    viewer.addEventListener("load", handleLoad);
    viewer.addEventListener("error", handleError);

    return () => {
      viewer.removeEventListener("load", handleLoad);
      viewer.removeEventListener("error", handleError);
    };
  }, [hasModel, scriptState, selectedDish?.id]);

  const handleLaunchAr = async () => {
    if (!selectedDish) {
      return;
    }

    setLaunchFeedback(null);

    if (!selectedDish.modelUrl) {
      setLaunchFeedback(
        "This dish has not been prepared for AR yet. Pick one of the AR-ready dishes below.",
      );
      return;
    }

    if (deviceProfile === "desktop") {
      setLaunchFeedback(
        "You are on desktop right now, so this page shows a 3D preview. Open the same link on a supported phone to place it on your table.",
      );
      return;
    }

    if (scriptState !== "ready") {
      setLaunchFeedback(
        "The AR viewer is still loading. Give it a moment, then try again.",
      );
      return;
    }

    if (viewerState === "error") {
      setLaunchFeedback(
        viewerError ??
          "The 3D model is not ready for AR yet. Try another dish or reload the page.",
      );
      return;
    }

    const viewer = viewerRef.current;

    if (!viewer?.activateAR) {
      setLaunchFeedback(
        "This browser cannot open AR directly. Chrome on Android and Safari on iPhone give the best results.",
      );
      return;
    }

    try {
      await viewer.activateAR();
    } catch {
      setLaunchFeedback(
        deviceProfile === "ios"
          ? "Quick Look did not open. Make sure you are in Safari and try again."
          : "AR launch was interrupted. Try again after camera permission is granted.",
      );
    }
  };

  if (isPageLoading) {
    return (
      <div className="min-h-screen bg-surface px-4 py-10">
        <div className="mx-auto max-w-lg rounded-[2rem] bg-white/90 px-6 py-12 text-center shadow-[0_18px_40px_rgba(18,28,42,0.08)]">
          <div className="mx-auto spinner-sm border-primary/30 border-t-primary" />
          <p className="mt-4 text-sm font-semibold text-on-surface-variant">
            Preparing the AR viewer...
          </p>
        </div>
      </div>
    );
  }

  if (pageError || !restaurant) {
    return (
      <div className="min-h-screen bg-surface px-4 py-10">
        <div className="mx-auto max-w-lg rounded-[2rem] bg-white/90 px-6 py-10 text-center shadow-[0_18px_40px_rgba(18,28,42,0.08)]">
          <p className="text-lg font-bold text-on-surface">AR view unavailable</p>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">
            {pageError ?? "This AR experience could not be loaded right now."}
          </p>
          <Link
            href={`/r/${publicId}`}
            className="mt-6 inline-flex items-center justify-center rounded-[1rem] bg-primary px-5 py-3 text-sm font-bold text-white"
          >
            Back to menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(182,23,34,0.08),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(217,227,246,0.88),transparent_34%),var(--color-background)] pb-16">
      <Script
        src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.1.0/model-viewer.min.js"
        type="module"
        strategy="afterInteractive"
        onLoad={() => setScriptState("ready")}
        onError={() => {
          setScriptState("failed");
          setViewerState("error");
          setViewerError(
            "The AR viewer library could not be loaded. Refresh the page and try again.",
          );
        }}
      />

      <header className="sticky top-0 z-50 border-b border-white/60 bg-white/84 px-4 py-4 backdrop-blur-xl md:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="min-w-0">
            <Link
              href={`/r/${restaurant.publicId}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-on-surface-variant transition-colors hover:text-primary"
            >
              <span className="material-symbols-outlined text-lg">west</span>
              Back to menu
            </Link>
            <p className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-on-surface">
              {restaurant.name}
            </p>
          </div>

          <div className="rounded-full bg-primary/8 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
            {deviceCopy.badge}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <div className="overflow-hidden rounded-[2rem] bg-white/80 p-3 shadow-[0_18px_40px_rgba(18,28,42,0.07)] backdrop-blur-sm">
            <div className="relative min-h-[430px] overflow-hidden rounded-[1.6rem] bg-[linear-gradient(180deg,#111827_0%,#1f2937_56%,#e5edf9_100%)]">
              {hasModel && scriptState !== "failed" ? (
                <>
                  <model-viewer
                    key={selectedDish?.id}
                    ref={(node) => {
                      viewerRef.current = node as ModelViewerElement | null;
                    }}
                    src={selectedDish?.modelUrl ?? undefined}
                    alt={selectedDish?.name ?? "Dish preview"}
                    poster={selectedDish?.posterUrl ?? selectedDish?.thumbnailUrl ?? undefined}
                    ar
                    ar-modes="webxr scene-viewer quick-look"
                    camera-controls
                    auto-rotate
                    shadow-intensity="1"
                    exposure="1"
                    touch-action="pan-y"
                    loading="eager"
                    className="h-[min(72vh,620px)] w-full bg-transparent"
                  />

                  {viewerState === "loading" ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/36 px-6 text-center text-white backdrop-blur-sm">
                      <div className="spinner-sm border-white/35 border-t-white" />
                      <p className="mt-4 text-sm font-semibold">
                        Loading the 3D plating preview...
                      </p>
                      <p className="mt-2 max-w-sm text-xs leading-6 text-white/78">
                        Heavy restaurant models can take a moment on mobile data.
                      </p>
                    </div>
                  ) : null}

                  {viewerState === "error" ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/72 px-6">
                      <div className="max-w-sm rounded-[1.4rem] bg-white/95 px-5 py-5 text-center text-on-surface shadow-[0_18px_36px_rgba(0,0,0,0.28)]">
                        <p className="text-base font-bold">Model unavailable</p>
                        <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                          {viewerError}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="flex h-[min(72vh,620px)] w-full items-center justify-center px-6">
                  <div className="max-w-md rounded-[1.6rem] bg-white/12 px-6 py-7 text-center text-white shadow-[0_12px_26px_rgba(0,0,0,0.16)] backdrop-blur-md">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/16">
                      <span className="material-symbols-outlined text-[1.9rem]">
                        view_in_ar
                      </span>
                    </div>
                    <p className="mt-4 text-lg font-bold">
                      {scriptState === "failed"
                        ? "Viewer could not start"
                        : "This dish is still waiting for AR assets"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/78">
                      {scriptState === "failed"
                        ? viewerError
                        : "Choose another plate below that already has a 3D model attached."}
                    </p>
                  </div>
                </div>
              )}

              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/72 via-slate-950/28 to-transparent px-5 pb-5 pt-14 text-white">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/68">
                      {selectedDish
                        ? `${selectedDish.menuName} / ${selectedDish.categoryName}`
                        : "Restaurant Preview"}
                    </p>
                    <p className="mt-2 text-2xl font-extrabold tracking-[-0.03em]">
                      {selectedDish?.name ?? "Select a dish"}
                    </p>
                  </div>
                  {selectedDish ? (
                    <span className="text-base font-extrabold text-white">
                      {formatPrice(selectedDish.price, selectedDish.currency)}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <section className="rounded-[2rem] bg-white/82 p-6 shadow-[0_18px_40px_rgba(18,28,42,0.07)] backdrop-blur-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                  AR-ready dishes {arReadyCount}
                </span>
                <span className="rounded-full bg-surface-container-low px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                  Published dishes {dishes.length}
                </span>
              </div>

              <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.04em] text-on-surface">
                {selectedDish?.name ?? "Browse the dishes below"}
              </h1>
              <p className="mt-3 text-sm leading-7 text-on-surface-variant">
                {selectedDish?.description ??
                  "Inspect the plating in 3D, then launch AR on a compatible phone to see how it feels on the table."}
              </p>

              <div className="mt-5 rounded-[1.35rem] bg-surface-container-low px-4 py-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                  {deviceCopy.badge}
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-on-surface">
                  {deviceCopy.headline}
                </p>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  {deviceCopy.helper}
                </p>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void handleLaunchAr()}
                  className={cn(
                    "inline-flex flex-1 items-center justify-center gap-2 rounded-[1rem] px-5 py-3.5 text-sm font-bold transition-all",
                    hasModel
                      ? "bg-gradient-to-br from-primary to-primary-container text-white shadow-[0_14px_28px_rgba(182,23,34,0.2)] hover:-translate-y-0.5"
                      : "bg-surface-container-low text-on-surface-variant",
                  )}
                >
                  <span className="material-symbols-outlined text-lg">
                    view_in_ar
                  </span>
                  {hasModel ? deviceCopy.action : "No AR model for this dish"}
                </button>

                <Link
                  href={`/r/${restaurant.publicId}`}
                  className="inline-flex items-center justify-center gap-2 rounded-[1rem] border border-outline-variant bg-white px-5 py-3.5 text-sm font-bold text-on-surface transition-colors hover:border-primary/25 hover:text-primary"
                >
                  <span className="material-symbols-outlined text-lg">
                    menu_book
                  </span>
                  Back to menu
                </Link>
              </div>

              <div className="mt-4 min-h-11 rounded-[1rem] border border-primary/10 bg-primary/5 px-4 py-3 text-sm leading-6 text-on-surface-variant">
                {launchFeedback ??
                  (hasModel
                    ? "Tip: pinch to zoom, drag to rotate, then launch AR when you are ready to place the plate."
                    : "This dish can still be explored from the menu, but it needs a 3D upload before AR can open.")}
              </div>
            </section>

            <section className="rounded-[2rem] bg-white/82 p-6 shadow-[0_18px_40px_rgba(18,28,42,0.07)] backdrop-blur-sm">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                Best results
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-on-surface-variant">
                <li className="flex gap-3">
                  <span className="material-symbols-outlined mt-0.5 text-primary">
                    wb_sunny
                  </span>
                  Use a bright, flat surface so the camera can lock onto the table quickly.
                </li>
                <li className="flex gap-3">
                  <span className="material-symbols-outlined mt-0.5 text-primary">
                    gesture
                  </span>
                  Move the phone slowly in a small circle before placing the dish.
                </li>
                <li className="flex gap-3">
                  <span className="material-symbols-outlined mt-0.5 text-primary">
                    network_check
                  </span>
                  Larger restaurant models load best on strong Wi-Fi or stable 5G.
                </li>
              </ul>
            </section>
          </div>
        </section>

        <section className="mt-6 rounded-[2rem] bg-white/82 p-5 shadow-[0_18px_40px_rgba(18,28,42,0.07)] backdrop-blur-sm md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                Switch dishes
              </p>
              <h2 className="mt-2 text-xl font-extrabold tracking-[-0.03em] text-on-surface">
                Try another plate from the same restaurant
              </h2>
            </div>
            <p className="text-sm font-medium text-on-surface-variant">
              AR-ready dishes are highlighted first
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {dishes
              .slice()
              .sort((left, right) => Number(Boolean(right.modelUrl)) - Number(Boolean(left.modelUrl)))
              .map((dish) => {
                const isActive = dish.id === selectedDish?.id;

                return (
                  <button
                    key={dish.id}
                    type="button"
                    onClick={() => setSelectedDishId(dish.id)}
                    className={cn(
                      "flex items-center gap-4 rounded-[1.3rem] border px-3 py-3 text-left transition-all",
                      isActive
                        ? "border-primary/40 bg-primary/8 shadow-[0_12px_24px_rgba(182,23,34,0.08)]"
                        : "border-transparent bg-surface-container-low hover:border-primary/18 hover:bg-white",
                    )}
                  >
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-[1rem] bg-surface-container-high">
                      {dish.thumbnailUrl ? (
                        <img
                          src={dish.thumbnailUrl}
                          alt={dish.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-on-surface-variant">
                          <span className="material-symbols-outlined">image</span>
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-base font-bold text-on-surface">
                          {dish.name}
                        </p>
                        {dish.modelUrl ? (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                            AR Ready
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                        {dish.menuName} / {dish.categoryName}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-primary">
                        {formatPrice(dish.price, dish.currency)}
                      </p>
                    </div>
                  </button>
                );
              })}
          </div>
        </section>
      </main>
    </div>
  );
}
