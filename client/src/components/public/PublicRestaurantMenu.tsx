"use client";

import Link from "next/link";
import {
  useCallback,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
  useEffect,
  memo
} from "react";

import {
  fetchPublicRestaurant,
  type PublicCategoryPayload,
  type PublicDishPayload,
  type PublicRestaurantPayload,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { ensureModelViewerScript } from "@/lib/model-viewer";
import Lenis from 'lenis';
import { useGLTF } from "@react-three/drei";

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
  const [activeViewId, setActiveViewId] = useState<string>("");
  const [currentMainTab, setCurrentMainTab] = useState<"special" | "menu">("special");
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(118);
  const [navbarHidden, setNavbarHidden] = useState(false);
  
  const headerRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);

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
    if (!restaurant || categories.length === 0) return;
    setActiveViewId((current) => {
      const exists = categories.some((c) => c.id === current);
      return exists ? current : categories[0].id;
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





  const selectedCategory = useMemo(() => {
    if (activeViewId === TOP_AR_VIEW) return null;
    return categories.find((c) => c.id === activeViewId) ?? null;
  }, [activeViewId, categories]);

  const filteredMenuCategories = useMemo(() => {
    if (!categories) return [];
    return categories.map(category => ({
      ...category,
      filteredDishes: category.dishes.filter(dish => {
        if (!normalizedSearch) return true;
        return [dish.name, dish.description ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      })
    })).filter(category => category.filteredDishes.length > 0);
  }, [categories, normalizedSearch]);

  const totalDishCount = restaurant?.menus.reduce(
    (count, menu) =>
      count +
      menu.categories.reduce(
        (cc, category) => cc + category.dishes.length,
        0,
      ),
    0,
  );

  // Smooth Scroll Initialization (Slow & Cinematic)
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.5,
      lerp: 0.05,
      smoothWheel: true,
      wheelMultiplier: 1,
    });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }

    rafId = requestAnimationFrame(raf);

    // Performance Optimization: Cache measurements so we don't recalculate on every scroll frame
    let cachedThreshold = 0;
    let isHidden = false; // local sync to avoid React re-render overhead on every frame

    const updateMeasurements = () => {
      if (headerRef.current) {
        const navHeight = headerRef.current.offsetHeight;
        setHeaderHeight(navHeight);
        
        if (titleRef.current) {
          const rect = titleRef.current.getBoundingClientRect();
          // Absolute midpoint from the very top of the document
          const absoluteMidpoint = rect.top + window.scrollY + (rect.height / 2);
          cachedThreshold = absoluteMidpoint - navHeight;
        }
      }
    };
    
    // Initial measurement
    updateMeasurements();
    const resizeObserver = new ResizeObserver(updateMeasurements);
    if (headerRef.current) resizeObserver.observe(headerRef.current);

    // Auto-animate navbar: highly optimized scroll loop
    lenis.on('scroll', ({ scroll, direction }) => {
      if (scroll <= cachedThreshold) {
        // ALWAYS show if we are above the threshold
        if (isHidden) {
          isHidden = false;
          setNavbarHidden(false);
        }
      } else if (direction === 1) {
        // Scrolling DOWN past threshold -> HIDE
        if (!isHidden) {
          isHidden = true;
          setNavbarHidden(true);
        }
      } else if (direction === -1) {
        // Scrolling UP past threshold -> SHOW
        if (isHidden) {
          isHidden = false;
          setNavbarHidden(false);
        }
      }
    });

    return () => {
      lenis.destroy();
      resizeObserver.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background px-4 py-10 flex flex-col items-center justify-center">
        <div className="mx-auto spinner-sm border-primary/30 border-t-primary" />
        <p className="mt-4 text-sm font-semibold text-on-surface-variant">
          Preparing the digital menu...
        </p>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-background px-4 py-10 flex flex-col items-center justify-center text-center">
        <p className="text-lg font-bold text-on-surface">Menu unavailable</p>
        <p className="mt-3 text-sm leading-6 text-on-surface-variant max-w-sm">
          {error ?? "This restaurant menu could not be loaded right now."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-on-background flex flex-col">
      <div className="flex-grow">
        {/* ── TopNavBar ──────────────────────────────────────────────────────── */}
        <header 
          ref={headerRef}
          className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 backdrop-blur-xl"
          style={{
            backgroundColor: "rgba(15, 15, 15, 0.85)",
            transform: navbarHidden ? `translateY(-100%)` : `translateY(0)`,
            transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <div className="max-w-4xl mx-auto px-6 py-4 flex flex-col gap-4">
            
            <div className="flex items-center justify-between">
              <div className="font-sans text-sm md:text-2xl font-black tracking-[0.2em] text-white">
                {restaurant.name.toUpperCase().replace(/ PRIME$/, "")}
              </div>
                
                <div className="relative flex-grow max-w-[200px] ml-4">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">search</span>
                  <input
                    type="text"
                    placeholder="Find dish..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-white/20 transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-center gap-8 overflow-x-auto scrollbar-hide">
                <button
                  onClick={() => setCurrentMainTab("special")}
                  className={cn(
                    "text-[10px] tracking-[0.2em] font-medium uppercase pb-1 transition-all",
                    currentMainTab === "special"
                      ? "text-white border-b border-white"
                      : "text-white/40 border-b border-transparent hover:text-white/60"
                  )}
                >
                  Chef's Special
                </button>
                <button
                  onClick={() => setCurrentMainTab("menu")}
                  className={cn(
                    "text-[10px] tracking-[0.2em] font-medium uppercase pb-1 transition-all",
                    currentMainTab === "menu"
                      ? "text-white border-b border-white"
                      : "text-white/40 border-b border-transparent hover:text-white/60"
                  )}
                >
                  MENU
                </button>
              </div>
            </div>
          </header>

          {/* ── Main Content Canvas ───────────────────────────────────────────── */}
          <main 
            className="w-full max-w-screen-2xl mx-auto px-[2vw] md:px-[4%] lg:px-[7%] 2xl:px-[9%] pb-8 md:pb-16"
            style={{ paddingTop: `${headerHeight + 20}px` }}
          >
            
            {/* Section Header */}
            <div ref={titleRef} className="text-center mb-10 md:mb-16">
              <h1 className="text-[2.6rem] md:text-[3.5rem] text-white leading-tight font-normal" style={{ fontFamily: "'Great Vibes', cursive", letterSpacing: "1px" }}>
                {currentMainTab === "special" ? "Chef's Special" : "The Menu"}
              </h1>
            </div>

            {/* Content Tabs */}
            {currentMainTab === "special" ? (
              topArDishes.length === 0 ? (
                <div className="text-center bg-surface-container-low rounded-xl p-8 border border-outline-variant/10">
                  <p className="text-lg font-bold text-on-surface">No AR dishes ready yet</p>
                  <p className="mt-2 text-sm text-on-surface-variant">Check back later for immersive 3D plates.</p>
                </div>
              ) : (
                <section className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7 md:gap-5">
                    {topArDishes.map((dish) => (
                      <TopArCard key={dish.id} dish={dish} publicId={publicId} />
                    ))}
                  </div>
                </section>
              )
            ) : (
              // Menu Tab Layout
              <div className="space-y-16">
                {filteredMenuCategories.length === 0 ? (
                   <div className="text-center py-10 text-on-surface-variant font-serif italic tracking-wider">
                     No dishes found.
                   </div>
                ) : (
                  filteredMenuCategories.map(category => (
                    <section key={category.id}>
                      <div className="flex items-center justify-center mb-8">
                        <div className="h-[1px] w-8 md:w-16 bg-white/10" />
                        <span className="mx-4 text-on-surface-variant/50 tracking-[0.4em] text-[10px] md:text-[12px] font-serif italic uppercase">
                          • &nbsp; {category.name} &nbsp; •
                        </span>
                        <div className="h-[1px] w-8 md:w-16 bg-white/10" />
                      </div>
                      <div className="flex flex-col gap-8 md:gap-10">
                        {category.filteredDishes.map((dish) => (
                          <DishMenuRow key={dish.id} dish={dish} />
                        ))}
                      </div>
                    </section>
                  ))
                )}
              </div>
            )}
          </main>
        </div>
      </div>
  );
}

// ─── TopArCard ────────────────────────────────────────────────────────────────

const TopArCard = memo(function TopArCard({
  dish,
  publicId,
}: {
  dish: ArDishView;
  publicId: string;
}) {
  const [isPreviewActivated, setIsPreviewActivated] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isArLaunching, setIsArLaunching] = useState(false);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const prefetchedRef = useRef(false);
  const cardRef = useRef<HTMLElement>(null);

  // Intersection Observer to completely deactivate WebGL when off-screen
  useEffect(() => {
    if (!cardRef.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
      
      // If the card is completely off-screen, reset the 3D preview.
      // This forces it to show the poster picture again, requiring another tap to load 3D.
      if (!entry.isIntersecting) {
        setIsPreviewActivated(false);
        setIsModelLoaded(false);
      }
    }, { rootMargin: "0px" }); // Trigger the exact moment it leaves the screen
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  // Highly optimized WebWorker-based prefetching
  // Bypasses main thread entirely and uses Draco/ThreeJS native caching
  const prefetchModel = useCallback(() => {
    if (prefetchedRef.current || !dish.modelUrl) return;
    prefetchedRef.current = true;
    useGLTF.preload(dish.modelUrl, "https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
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
      ref={cardRef}
      onPointerEnter={prefetchModel}
      onTouchStart={() => {
        prefetchModel();
        if (!isPreviewActivated) setIsPreviewActivated(true);
      }}
      className="group relative flex flex-col bg-surface-container-high rounded-2xl transition-all duration-500 hover:bg-surface-bright cursor-pointer"
      onClick={() => {
        if (!isPreviewActivated) setIsPreviewActivated(true);
      }}
    >
      {/* ── 3D Preview / Image Area (Inset Framed) ─────────────────────────────── */}
      <div className="pt-[2.3%] px-[2.3%] md:pt-[4%] md:px-[4%] w-full">
        <div className="relative aspect-square md:aspect-auto md:h-64 w-full overflow-hidden bg-surface-container-lowest rounded-2xl">
        {/* Live 3D model — only mounts if tapped AND visible on screen */}
        {dish.modelUrl && isPreviewActivated && isIntersecting ? (
          <ArPreviewInCard
            modelUrl={dish.modelUrl}
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
              loading="lazy"
              decoding="async"
              className="object-cover w-full h-full transform transition-transform duration-700 group-hover:scale-105 opacity-90"
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

        {/* AR Badge */}
        {!isPreviewActivated && dish.posterUrl ? (
          <div className="absolute top-4 right-4 bg-surface-container-highest/60 backdrop-blur-[24px] px-3 py-1.5 rounded-full flex items-center gap-2 border border-outline-variant/15 shadow-sm">
            <span className="material-symbols-outlined text-primary text-[16px]">view_in_ar</span>
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface">Tap for 3D</span>
          </div>
        ) : null}
      </div>
      </div>

      {/* ── Content Area ──────────────────────────────────────────────────────── */}
      <div className="p-4 md:p-6 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-3">
          <h2 className="text-2xl font-bold tracking-wide text-on-surface">
            {dish.name}
          </h2>
          {/* Dietary Badge - reference site style */}
          {dish.dietaryType === "VEG" && (
            <div className="flex items-center gap-1.5 bg-emerald-500 text-white text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full">
              <span className="flex items-center justify-center w-[11px] h-[11px] border-[1.5px] border-white rounded-[2px]">
                <span className="w-[4px] h-[4px] bg-white rounded-full" />
              </span>
              VEG
            </div>
          )}
          {dish.dietaryType === "NON_VEG" && (
            <div className="flex items-center gap-1.5 bg-red-500 text-white text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full">
              <span className="flex items-center justify-center w-[11px] h-[11px] border-[1.5px] border-white rounded-[2px]">
                <span className="w-[4px] h-[4px] bg-white rounded-full" />
              </span>
              NON-VEG
            </div>
          )}
          {dish.dietaryType === "BOTH" && (
            <div className="flex items-center gap-1.5 bg-white/10 text-white text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full border border-white/20">
              <span className="flex items-center justify-center w-[11px] h-[11px] border-[1.5px] border-emerald-400 rounded-[2px]">
                <span className="w-[4px] h-[4px] bg-emerald-400 rounded-full" />
              </span>
              <span className="flex items-center justify-center w-[11px] h-[11px] border-[1.5px] border-red-400 rounded-[2px]">
                <span className="w-[4px] h-[4px] bg-red-400 rounded-full" />
              </span>
              VEG & NON-VEG
            </div>
          )}
        </div>
        
        <p className="text-sm text-[#a3a3a3] uppercase tracking-wide leading-relaxed mb-6 flex-grow">
          {dish.description || "Experience this dish in your own space before you order."}
        </p>
        
        <div className="flex flex-col gap-5 mt-auto">
          <span className="text-2xl font-bold text-on-surface font-sans">
            {formatPrice(dish.price, dish.currency).replace('.00', '')}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void handleViewInAr();
            }}
            disabled={isArLaunching}
            className="w-full bg-[#fa5555] text-white px-6 py-3.5 rounded-xl font-bold text-base transition-all duration-300 hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isArLaunching ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Wait...
              </span>
            ) : "View on Table"}
          </button>
        </div>
      </div>
    </article>
  );
});

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

const DishMenuRow = memo(function DishMenuRow({ dish }: { dish: PublicDishPayload }) {
  const dietaryType = dish.dietaryType;

  const DietaryIcon = () => {
    if (dietaryType === "VEG") return (
      <span className="inline-flex items-center gap-1 ml-2 bg-emerald-500 text-white text-[9px] font-bold tracking-wide uppercase px-1.5 py-[2px] rounded-full">
        <span className="flex items-center justify-center w-[9px] h-[9px] border border-white rounded-[1px]">
          <span className="w-[4px] h-[4px] bg-white rounded-full" />
        </span>
        VEG
      </span>
    );
    if (dietaryType === "NON_VEG") return (
      <span className="inline-flex items-center gap-1 ml-2 bg-red-500 text-white text-[9px] font-bold tracking-wide uppercase px-1.5 py-[2px] rounded-full">
        <span className="flex items-center justify-center w-[9px] h-[9px] border border-white rounded-[1px]">
          <span className="w-[4px] h-[4px] bg-white rounded-full" />
        </span>
        NON-VEG
      </span>
    );
    if (dietaryType === "BOTH") return (
      <span className="inline-flex items-center gap-1 ml-2 bg-white/10 text-white text-[9px] font-bold tracking-wide uppercase px-1.5 py-[2px] rounded-full border border-white/20">
        <span className="flex items-center justify-center w-[9px] h-[9px] border border-emerald-400 rounded-[1px]">
          <span className="w-[4px] h-[4px] bg-emerald-400 rounded-full" />
        </span>
        <span className="flex items-center justify-center w-[9px] h-[9px] border border-red-400 rounded-[1px]">
          <span className="w-[4px] h-[4px] bg-red-400 rounded-full" />
        </span>
        VEG & NON-VEG
      </span>
    );
    return null;
  };

  return (
    <article className="group cursor-pointer max-w-3xl mx-auto w-full">
      <div className="flex items-baseline justify-between w-full">
        <h4 className="text-[17px] md:text-[20px] font-bold text-white tracking-wide font-sans flex items-center flex-wrap gap-0">
          {dish.name}
          <DietaryIcon />
        </h4>
        
        <div className="flex-grow mx-3 md:mx-6 border-b border-dashed border-white/20 relative top-[-4px]" />
        
        <span className="text-[17px] md:text-[20px] font-bold text-white whitespace-nowrap font-sans">
          {formatPrice(dish.price, dish.currency).replace('.00', '')}
        </span>
      </div>
      
      {dish.description && (
        <p className="mt-2 text-[10px] md:text-[11px] uppercase tracking-widest text-on-surface-variant italic leading-relaxed max-w-[85%] font-serif">
          {dish.description}
        </p>
      )}
    </article>
  );
});
