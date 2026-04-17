"use client";

import Link from "next/link";
import {
  useCallback,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
  useEffect
} from "react";

import {
  fetchPublicRestaurant,
  type PublicCategoryPayload,
  type PublicDishPayload,
  type PublicRestaurantPayload,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { ensureModelViewerScript } from "@/lib/model-viewer";

// ─── Types ────────────────────────────────────────────────────────────────────

type PublicRestaurantMenuProps = {
  publicId: string;
  initialRestaurant?: PublicRestaurantPayload | null;
};

type CategoryView = PublicCategoryPayload & {
  menuId: string;
  menuName: string;
};

type ArDishView = PublicDishPayload & {
  categoryId: string;
  categoryName: string;
  menuId: string;
  menuName: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const TOP_AR_VIEW = "top-ar";
const TOP_AR_BATCH_SIZE = 8;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatPrice = (
  value: number,
  currency: PublicDishPayload["currency"] | string | undefined,
) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency:
      currency && ["USD", "INR", "EUR", "GBP", "AED"].includes(currency)
        ? currency
        : "USD",
    minimumFractionDigits: 2,
  }).format(value);

// ─── Main Component ───────────────────────────────────────────────────────────

export function PublicRestaurantMenu({
  publicId,
  initialRestaurant = null,
}: PublicRestaurantMenuProps) {
  const [restaurant, setRestaurant] = useState<PublicRestaurantPayload | null>(
    initialRestaurant,
  );
  const [isLoading, setIsLoading] = useState(initialRestaurant === null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeViewId, setActiveViewId] = useState(TOP_AR_VIEW);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [topArVisibleCount, setTopArVisibleCount] = useState(TOP_AR_BATCH_SIZE);

  const deferredSearch = useDeferredValue(search);

  // Load restaurant data — skip fetch if SSR already provided it
  useEffect(() => {
    if (initialRestaurant && initialRestaurant.publicId === publicId) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const payload = await fetchPublicRestaurant(publicId);
        if (!cancelled) {
          setRestaurant(payload);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load this restaurant menu.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [initialRestaurant, publicId]);

  // Cache restaurant in sessionStorage so the AR page loads instantly
  useEffect(() => {
    if (typeof window === "undefined" || !restaurant) return;
    window.sessionStorage.setItem(
      `aroma-public-restaurant:${publicId}`,
      JSON.stringify(restaurant),
    );
  }, [publicId, restaurant]);

  // ── Derived data ────────────────────────────────────────────────────────────

  const categories = useMemo<CategoryView[]>(() => {
    if (!restaurant) return [];
    return restaurant.menus.flatMap((menu) =>
      menu.categories.map((category) => ({
        ...category,
        menuId: menu.id,
        menuName: menu.name,
      })),
    );
  }, [restaurant]);

  // Keep activeViewId valid when data changes
  useEffect(() => {
    if (!restaurant) return;
    setActiveViewId((current) => {
      if (current === TOP_AR_VIEW) return TOP_AR_VIEW;
      const exists = categories.some((c) => c.id === current);
      return exists ? current : (categories[0]?.id ?? TOP_AR_VIEW);
    });
  }, [categories, restaurant]);

  const normalizedSearch = deferredSearch.trim().toLowerCase();

  const topArDishes = useMemo<ArDishView[]>(() => {
    return categories.flatMap((category) =>
      category.dishes
        .filter((dish) => Boolean(dish.modelUrl))
        .filter((dish) => {
          if (!normalizedSearch) return true;
          return [dish.name, dish.description ?? "", category.name]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch);
        })
        .map((dish) => ({
          ...dish,
          categoryId: category.id,
          categoryName: category.name,
          menuId: category.menuId,
          menuName: category.menuName,
        })),
    );
  }, [categories, normalizedSearch]);

  // Reset "load more" on search or restaurant change
  useEffect(() => {
    setTopArVisibleCount(TOP_AR_BATCH_SIZE);
  }, [publicId, normalizedSearch]);

  const visibleTopArDishes = useMemo(
    () => topArDishes.slice(0, topArVisibleCount),
    [topArDishes, topArVisibleCount],
  );

  const selectedCategory = useMemo(() => {
    if (activeViewId === TOP_AR_VIEW) return null;
    return categories.find((c) => c.id === activeViewId) ?? null;
  }, [activeViewId, categories]);

  const filteredCategoryDishes = useMemo(() => {
    if (!selectedCategory) return [];
    return selectedCategory.dishes.filter((dish) => {
      if (!normalizedSearch) return true;
      return [dish.name, dish.description ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [normalizedSearch, selectedCategory]);

  const totalDishCount = restaurant?.menus.reduce(
    (count, menu) =>
      count +
      menu.categories.reduce(
        (cc, category) => cc + category.dishes.length,
        0,
      ),
    0,
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface px-4 py-10">
        <div className="mx-auto max-w-md rounded-[2rem] bg-white/90 px-6 py-12 text-center shadow-[0_18px_40px_rgba(18,28,42,0.08)]">
          <div className="mx-auto spinner-sm border-primary/30 border-t-primary" />
          <p className="mt-4 text-sm font-semibold text-on-surface-variant">
            Preparing the digital menu...
          </p>
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-surface px-4 py-10">
        <div className="mx-auto max-w-md rounded-[2rem] bg-white/90 px-6 py-10 text-center shadow-[0_18px_40px_rgba(18,28,42,0.08)]">
          <p className="text-lg font-bold text-on-surface">Menu unavailable</p>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">
            {error ?? "This restaurant menu could not be loaded right now."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/50 bg-white/80 px-4 py-4 backdrop-blur-xl md:px-6">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-lg font-extrabold tracking-tight text-on-surface">
              Aroma AR
            </p>
          </div>

          {/* Mobile search toggle */}
          <button
            type="button"
            onClick={() => setIsMobileSearchOpen((c) => !c)}
            aria-label={isMobileSearchOpen ? "Close search" : "Open search"}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface-container-low text-on-surface shadow-[0_10px_22px_rgba(18,28,42,0.08)] transition-all active:scale-95 md:hidden"
          >
            <span className="material-symbols-outlined text-[22px]">
              {isMobileSearchOpen ? "close" : "search"}
            </span>
          </button>

          {/* Desktop search */}
          <div className="relative hidden min-w-0 flex-1 md:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
              search
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                activeViewId === TOP_AR_VIEW
                  ? "Search AR dishes..."
                  : "Search dishes..."
              }
              className="w-full rounded-[1rem] bg-surface-container-low py-2.5 pl-10 pr-4 text-sm font-medium text-on-surface outline-none ring-1 ring-transparent transition-all focus:ring-primary/15"
            />
          </div>
        </div>

        {/* Mobile search drawer */}
        {isMobileSearchOpen ? (
          <div className="mx-auto mt-4 max-w-6xl md:hidden">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
                search
              </span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  activeViewId === TOP_AR_VIEW
                    ? "Search AR dishes..."
                    : "Search dishes..."
                }
                className="w-full rounded-[1rem] bg-surface-container-low py-3 pl-10 pr-4 text-sm font-medium text-on-surface outline-none ring-1 ring-transparent transition-all focus:ring-primary/15"
              />
            </div>
          </div>
        ) : null}
      </header>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        {/* Restaurant title */}
        <section className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-on-surface md:text-4xl">
            {restaurant.name}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-sm text-primary">
              menu_book
            </span>
            {totalDishCount ?? 0} published dishes, with AR previews for
            selected plates
          </p>
        </section>

        {/* Category nav */}
        <nav className="no-scrollbar mb-6 flex gap-2 overflow-x-auto py-1 md:sticky md:top-[4.85rem] md:z-40 md:bg-surface/92 md:backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setActiveViewId(TOP_AR_VIEW)}
            className={cn(
              "whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition-all active:scale-95",
              activeViewId === TOP_AR_VIEW
                ? "bg-primary text-white shadow-[0_8px_18px_rgba(182,23,34,0.18)]"
                : "bg-white text-on-surface-variant",
            )}
          >
            Top AR
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveViewId(category.id)}
              className={cn(
                "whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition-all active:scale-95",
                activeViewId === category.id
                  ? "bg-primary text-white shadow-[0_8px_18px_rgba(182,23,34,0.18)]"
                  : "bg-white text-on-surface-variant",
              )}
            >
              {category.name}
            </button>
          ))}
        </nav>

        {/* Content */}
        {activeViewId === TOP_AR_VIEW ? (
          topArDishes.length === 0 ? (
            <div className="rounded-[1.5rem] bg-white px-5 py-8 shadow-[0_16px_36px_rgba(18,28,42,0.05)]">
              <p className="text-lg font-bold text-on-surface">
                No AR dishes ready yet
              </p>
              <p className="mt-2 text-sm text-on-surface-variant">
                Upload a 3D model to a dish and it will appear here as a quick
                launch AR card.
              </p>
            </div>
          ) : (
            <section className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {visibleTopArDishes.map((dish) => (
                  <TopArCard key={dish.id} dish={dish} publicId={publicId} />
                ))}
              </div>

              {topArVisibleCount < topArDishes.length ? (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() =>
                      setTopArVisibleCount((c) =>
                        Math.min(c + TOP_AR_BATCH_SIZE, topArDishes.length),
                      )
                    }
                    className="rounded-full bg-white px-5 py-3 text-sm font-bold text-on-surface shadow-[0_10px_20px_rgba(18,28,42,0.08)] transition-all active:scale-95 hover:-translate-y-0.5"
                  >
                    Load more AR dishes
                  </button>
                </div>
              ) : null}
            </section>
          )
        ) : selectedCategory ? (
          <section className="rounded-[1.75rem] bg-white p-5 shadow-[0_16px_36px_rgba(18,28,42,0.05)] md:p-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-surface-container-low pb-4">
              <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-on-surface">
                {selectedCategory.name}
              </h2>
              <span className="rounded-full bg-surface-container-low px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">
                {filteredCategoryDishes.length} items
              </span>
            </div>

            {filteredCategoryDishes.length === 0 ? (
              <div className="rounded-[1.2rem] border border-dashed border-outline/40 bg-surface-container-low px-4 py-5 text-sm text-on-surface-variant">
                No dishes match this search.
              </div>
            ) : (
              <div className="overflow-hidden rounded-[1.2rem] border border-surface-container-low bg-surface-container-lowest">
                <div className="divide-y divide-surface-container-low">
                  {filteredCategoryDishes.map((dish) => (
                    <DishMenuRow key={dish.id} dish={dish} />
                  ))}
                </div>
              </div>
            )}
          </section>
        ) : (
          <div className="rounded-[1.5rem] bg-white px-5 py-8 shadow-[0_16px_36px_rgba(18,28,42,0.05)]">
            <p className="text-lg font-bold text-on-surface">
              No submenu selected
            </p>
            <p className="mt-2 text-sm text-on-surface-variant">
              Pick a category to browse dishes and prices.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── TopArCard ────────────────────────────────────────────────────────────────

function TopArCard({
  dish,
  publicId,
}: {
  dish: ArDishView;
  publicId: string;
}) {
  const [isPreviewActivated, setIsPreviewActivated] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [arError, setArError] = useState<string | null>(null);
  const [isArLaunching, setIsArLaunching] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const prefetchedRef = useRef(false);

  // Starts the GLB download into the browser HTTP cache.
  // Only fires once (guarded by prefetchedRef).
  // Triggered by: touch, hover, or tap — never automatically on page load.
  const prefetchModel = useCallback(() => {
    if (prefetchedRef.current || !dish.modelUrl) return;
    prefetchedRef.current = true;
    
    // Download into RAM bypassing any 304 network round-trips
    fetch(dish.modelUrl)
      .then((res) => res.blob())
      .then((blob) => {
        setBlobUrl(URL.createObjectURL(blob));
      })
      .catch(() => {});
  }, [dish.modelUrl]);

  // Reset launching state when returning to this page via the browser back button (BFCache)
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      // event.persisted is true if the page was restored from the back/forward cache
      if (event.persisted) {
        setIsArLaunching(false);
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  // "View in AR" — navigates to the dedicated AR setup page.
  const handleViewInAr = useCallback(() => {
    if (!dish.modelUrl) return;
    setIsArLaunching(true);
    window.location.href = `/r/${publicId}/ar?dish=${dish.id}`;
    // Fallback reset in case navigation is blocked or delayed
    setTimeout(() => setIsArLaunching(false), 1500);
  }, [dish.modelUrl, dish.id, publicId]);

  return (
    <article
      onPointerEnter={prefetchModel}
      onTouchStart={() => {
        prefetchModel();
        if (!isPreviewActivated) setIsPreviewActivated(true);
      }}
      className="group flex flex-col overflow-hidden rounded-[1.25rem] bg-surface-container-lowest shadow-[0_12px_28px_rgba(18,28,42,0.05)] transition-all hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(18,28,42,0.08)]"
    >
      {/* ── 3D Preview Area ─────────────────────────────────────────────── */}
      <div
        onClick={() => {
          if (!isPreviewActivated) setIsPreviewActivated(true);
        }}
        className="relative h-56 cursor-pointer overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.72),transparent_50%),linear-gradient(180deg,#dbe7fb_0%,#cfdcf5_100%)]"
      >
        {/* Live 3D model — only mounts after first tap */}
        {dish.modelUrl && isPreviewActivated ? (
          <ArPreviewInCard
            modelUrl={blobUrl || dish.modelUrl}
            alt={dish.name}
            onLoaded={() => setIsModelLoaded(true)}
          />
        ) : null}

        {/* Poster overlay — fades out once GLB finishes loading */}
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-500",
            isPreviewActivated && isModelLoaded
              ? "pointer-events-none opacity-0"
              : "opacity-100",
          )}
        >
          {dish.posterUrl ? (
            <img
              src={dish.posterUrl}
              alt={dish.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <span className="material-symbols-outlined text-5xl text-primary/70">
                  view_in_ar
                </span>
                {!isPreviewActivated ? (
                  <p className="text-sm font-semibold text-on-surface">
                    Tap to load 3D
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Subtle gradient at bottom for text legibility */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(18,28,42,0.22)] via-transparent to-transparent" />

        {/* "Tap for 3D" badge — hidden after tap */}
        {!isPreviewActivated ? (
          <div className="pointer-events-none absolute bottom-4 right-4 rounded-[0.85rem] bg-[rgba(15,20,26,0.82)] px-3 py-2 shadow-[0_8px_18px_rgba(18,28,42,0.12)] backdrop-blur-sm">
            <p className="flex items-center gap-2 text-xs font-semibold text-white">
              <span className="material-symbols-outlined text-base text-primary-container">
                view_in_ar
              </span>
              {dish.posterUrl ? "Tap for 3D" : "Tap to load 3D"}
            </p>
          </div>
        ) : null}


      </div>

      {/* ── Card Info ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
              {dish.categoryName}
            </p>
            <h3 className="mt-1 text-lg font-extrabold leading-tight text-on-surface">
              {dish.name}
            </h3>
          </div>
          <span className="text-base font-extrabold text-primary">
            {formatPrice(dish.price, dish.currency)}
          </span>
        </div>

        <p className="line-clamp-3 text-sm leading-6 text-on-surface-variant">
          {dish.description ?? "Tap to place this dish in AR on your table."}
        </p>

        {arError ? (
          <p className="mb-2 rounded-[0.75rem] bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
            {arError}
          </p>
        ) : null}

        {/* "View in AR" — triggers native camera directly on mobile */}
        <div className="mt-auto pt-2">
          <button
            type="button"
            onClick={() => void handleViewInAr()}
            disabled={isArLaunching}
            className="flex w-full items-center justify-center gap-2 rounded-[0.95rem] bg-gradient-to-br from-primary to-primary-container px-4 py-3 text-sm font-bold text-white shadow-[0_10px_20px_rgba(182,23,34,0.16)] transition-all active:scale-[0.97] hover:-translate-y-0.5 disabled:opacity-70"
          >
            {isArLaunching ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Opening AR...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">
                  view_in_ar
                </span>
                View in AR
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

// ─── ArPreviewInCard ─────────────────────────────────────────────────────────
// Thin inline wrapper — avoids the broken dynamic() self-import pattern.

function ArPreviewInCard({
  modelUrl,
  alt,
  onLoaded,
}: {
  modelUrl: string;
  alt: string;
  onLoaded: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let mv: HTMLElement | null = null;

    // Load the model-viewer library first — without this the custom element
    // is just an unknown HTML tag and won't render anything.
    void ensureModelViewerScript().then(() => {
      if (!container.isConnected) return; // unmounted while script was loading

      mv = document.createElement("model-viewer");
      mv.setAttribute("src", modelUrl);
      mv.setAttribute("alt", alt);
      mv.setAttribute("camera-orbit", "0deg 82deg auto");
      mv.setAttribute("field-of-view", "28deg");
      mv.setAttribute("environment-image", "neutral");
      mv.setAttribute("exposure", "1");
      mv.setAttribute("shadow-intensity", "1");
      mv.setAttribute("camera-controls", "");
      mv.setAttribute("auto-rotate", "");
      mv.setAttribute("auto-rotate-delay", "0");
      mv.setAttribute("rotation-per-second", "25deg");
      mv.setAttribute("interaction-prompt", "none");
      mv.setAttribute("disable-zoom", "");
      mv.setAttribute("autoplay", ""); // play any animations embedded in the GLB
      mv.style.width = "100%";
      mv.style.height = "100%";
      mv.style.setProperty("--poster-color", "transparent");
      mv.style.setProperty("--progress-bar-height", "0px");
      mv.style.background = "transparent";
      mv.setAttribute("reveal", "auto"); // Ensure it renders immediately

      const handleLoad = () => onLoadedRef.current();
      mv.addEventListener("load", handleLoad, { once: true });
      container.appendChild(mv);
    });

    return () => {
      if (mv) {
        mv.removeEventListener("load", onLoadedRef.current);
        if (container.contains(mv)) container.removeChild(mv);
      }
    };
  }, [modelUrl, alt]);

  return <div ref={containerRef} className="h-full w-full" />;
}

// ─── DishMenuRow ──────────────────────────────────────────────────────────────

function DishMenuRow({ dish }: { dish: PublicDishPayload }) {
  return (
    <article className="px-4 py-4 md:px-5">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <h4 className="text-lg font-bold leading-tight text-on-surface md:text-xl">
            {dish.name}
          </h4>

          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className="text-base font-extrabold text-primary md:text-lg">
              {formatPrice(dish.price, dish.currency)}
            </span>
          </div>

          {dish.description ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
              {dish.description}
            </p>
          ) : null}
        </div>

        <div className="h-22 w-22 shrink-0 overflow-hidden rounded-[1.15rem] bg-surface-container-high shadow-[0_8px_18px_rgba(18,28,42,0.06)] md:h-24 md:w-24">
          {dish.thumbnailUrl ? (
            <img
              src={dish.thumbnailUrl}
              alt={dish.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined text-3xl">
                restaurant
              </span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
