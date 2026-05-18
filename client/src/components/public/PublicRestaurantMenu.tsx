"use client";

import Link from "next/link";
import Image from "next/image";
import {
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
import Lenis from 'lenis';
import { MenuCard } from "./MenuCard/MenuCard";

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

  // Use refs instead of state for layout values that change on every scroll/resize frame.
  // This prevents React re-renders during scroll, which is the primary cause of jitter.
  const headerHeightRef = useRef(118);

  const headerRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  const deferredSearch = useDeferredValue(search);

  // ── Return-from-AR reload guard ────────────────────────────────────────────
  // The actual reload logic lives in <head> (layout.tsx) as an inline script
  // so it runs before React hydrates. BFCache restores can freeze React state,
  // so client-side checks inside useEffect are not 100 % reliable.

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

  // Scroll Initialization — Lenis smooth scroll
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const isTouchDevice =
      window.matchMedia('(hover: none) and (pointer: coarse)').matches;

    let cachedThreshold = 0;
    let isHidden = false;
    let rafId: number;

    const updateMeasurements = () => {
      const main = mainRef.current;
      const navHeight = header.offsetHeight;
      headerHeightRef.current = navHeight;
      if (main) main.style.paddingTop = `${navHeight + 20}px`;
      if (titleRef.current) {
        const rect = titleRef.current.getBoundingClientRect();
        const absoluteMidpoint = rect.top + window.scrollY + (rect.height / 2);
        cachedThreshold = absoluteMidpoint - navHeight;
      }
    };
    updateMeasurements();
    const resizeObserver = new ResizeObserver(updateMeasurements);
    resizeObserver.observe(header);

    const handleScroll = (scroll: number, direction: number) => {
      if (scroll <= cachedThreshold) {
        if (isHidden) { isHidden = false; header.style.transform = 'translateY(0)'; }
      } else if (direction === 1 && !isHidden) {
        isHidden = true; header.style.transform = 'translateY(-100%)';
      } else if (direction === -1 && isHidden) {
        isHidden = false; header.style.transform = 'translateY(0)';
      }
    };

    const lenis = new Lenis(
      isTouchDevice
        ? {
            duration: 1.0,
            lerp: 0.12,
            smoothWheel: false,
            touchMultiplier: 30,
          }
        : {
            duration: 1.5,
            lerp: 0.08,
            smoothWheel: true,
            wheelMultiplier: 1,
          }
    );

    const raf = (time: number) => { lenis.raf(time); rafId = requestAnimationFrame(raf); };
    rafId = requestAnimationFrame(raf);

    lenis.on('scroll', ({ scroll, direction }: { scroll: number; direction: number }) => {
      handleScroll(scroll, direction);
    });

    // ── BFCache resume ─────────────────────────────────────────────────────
    // Restart the Lenis rAF loop if the page is restored from BFCache.
    // This runs alongside window.location.reload() (from the BFCache guard
    // above) so the page is interactive during the brief reload delay.
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(raf);
        updateMeasurements();
        header.style.transform = 'translateY(0)';
      }
    };
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      lenis.destroy();
      resizeObserver.disconnect();
      cancelAnimationFrame(rafId);
      window.removeEventListener('pageshow', handlePageShow);
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
          className="fixed top-0 left-0 right-0 z-50 border-b border-white/5"
          style={{
            backgroundColor: "rgb(15, 15, 15)",
            transform: 'translateY(0)',
            transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            willChange: "transform",
          }}
        >
          <div className="max-w-4xl mx-auto px-6 py-4 flex flex-col gap-4">

            <div className="flex items-center justify-between">
              <div className="flex-shrink-0">
                <Image
                  src="/logo_aroma-removebg-preview.png"
                  alt="Aroma logo"
                  width={320}
                  height={128}
                  priority
                  unoptimized={true}
                  style={{
                    filter:
                      "drop-shadow(0 0 0.3px white) drop-shadow(0 0 0.3px white) contrast(1.1)",
                  }}
                  className="w-[78px] md:w-[104px] lg:w-[130px] h-auto object-contain"
                />
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
                  Chef&apos;s Special
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
            ref={mainRef}
            className="w-full max-w-screen-2xl mx-auto px-[2vw] md:px-[4%] lg:px-[7%] 2xl:px-[9%] pb-8 md:pb-16"
            style={{ paddingTop: `${headerHeightRef.current + 20}px` }}
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
                      <MenuCard key={dish.id} dish={dish} publicId={publicId} />
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

const DietaryIcon = ({ dietaryType }: { dietaryType: string | null | undefined }) => {
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
      VEG &amp; NON-VEG
    </span>
  );
  return null;
};

const DishMenuRow = memo(function DishMenuRow({ dish }: { dish: PublicDishPayload }) {

  return (
    <article className="group cursor-pointer max-w-3xl mx-auto w-full">
      <div className="flex items-baseline justify-between w-full">
        <h4 className="text-[17px] md:text-[20px] font-bold text-white tracking-wide font-sans flex items-center flex-wrap gap-0">
          {dish.name}
          <DietaryIcon dietaryType={dish.dietaryType} />
        </h4>

        <div className="flex-grow mx-3 md:mx-6 border-b border-dashed border-white/20 relative top-[-4px]" />

        <span className="text-[17px] md:text-[20px] font-bold text-white whitespace-nowrap font-sans">
          {formatPrice(dish.price, dish.currency).replace('.00', '')}
        </span>
      </div>

      {dish.description && (
        <p className="mt-2 text-[10px] md:text-[11px] uppercase tracking-widest text-menu-dish-desc italic leading-relaxed max-w-[85%] font-serif">
          {dish.description}
        </p>
      )}
    </article>
  );
});


