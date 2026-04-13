"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  fetchPublicRestaurant,
  type PublicCategoryPayload,
  type PublicDishPayload,
  type PublicRestaurantPayload,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const ArPreviewCanvas = dynamic(
  () =>
    import("@/components/public/ArPreviewCanvas").then(
      (module) => module.ArPreviewCanvas,
    ),
  {
    ssr: false,
  },
);

type PublicRestaurantMenuProps = {
  publicId: string;
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

const TOP_AR_VIEW = "top-ar";
const TOP_AR_BATCH_SIZE = 8;

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

export function PublicRestaurantMenu({
  publicId,
}: PublicRestaurantMenuProps) {
  const [restaurant, setRestaurant] = useState<PublicRestaurantPayload | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeViewId, setActiveViewId] = useState(TOP_AR_VIEW);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [topArVisibleCount, setTopArVisibleCount] = useState(TOP_AR_BATCH_SIZE);

  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
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
  }, [publicId]);

  const categories = useMemo<CategoryView[]>(() => {
    if (!restaurant) {
      return [];
    }

    return restaurant.menus.flatMap((menu) =>
      menu.categories.map((category) => ({
        ...category,
        menuId: menu.id,
        menuName: menu.name,
      })),
    );
  }, [restaurant]);

  useEffect(() => {
    if (!restaurant) {
      return;
    }

    setActiveViewId((current) => {
      if (current === TOP_AR_VIEW) {
        return TOP_AR_VIEW;
      }

      const categoryExists = categories.some((category) => category.id === current);
      if (categoryExists) {
        return current;
      }

      return categories[0]?.id ?? TOP_AR_VIEW;
    });
  }, [categories, restaurant]);

  const normalizedSearch = deferredSearch.trim().toLowerCase();

  const topArDishes = useMemo<ArDishView[]>(() => {
    return categories.flatMap((category) =>
      category.dishes
        .filter((dish) => Boolean(dish.modelUrl))
        .filter((dish) => {
          if (!normalizedSearch) {
            return true;
          }

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

  useEffect(() => {
    setTopArVisibleCount(TOP_AR_BATCH_SIZE);
  }, [publicId, normalizedSearch]);

  const visibleTopArDishes = useMemo(
    () => topArDishes.slice(0, topArVisibleCount),
    [topArDishes, topArVisibleCount],
  );

  const selectedCategory = useMemo(() => {
    if (activeViewId === TOP_AR_VIEW) {
      return null;
    }

    return categories.find((category) => category.id === activeViewId) ?? null;
  }, [activeViewId, categories]);

  const filteredCategoryDishes = useMemo(() => {
    if (!selectedCategory) {
      return [];
    }

    return selectedCategory.dishes.filter((dish) => {
      if (!normalizedSearch) {
        return true;
      }

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
        (categoryCount, category) => categoryCount + category.dishes.length,
        0,
      ),
    0,
  );

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
      <header className="sticky top-0 z-50 border-b border-white/50 bg-white/80 px-4 py-4 backdrop-blur-xl md:px-6">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-lg font-extrabold tracking-tight text-on-surface">
              Aroma AR
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileSearchOpen((current) => !current)}
            aria-label={isMobileSearchOpen ? "Close search" : "Open search"}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface-container-low text-on-surface shadow-[0_10px_22px_rgba(18,28,42,0.08)] transition-all active:scale-95 md:hidden"
          >
            <span className="material-symbols-outlined text-[22px]">
              {isMobileSearchOpen ? "close" : "search"}
            </span>
          </button>

          <div className="relative hidden min-w-0 flex-1 md:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
              search
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                activeViewId === TOP_AR_VIEW
                  ? "Search AR dishes..."
                  : "Search dishes..."
              }
              className="w-full rounded-[1rem] bg-surface-container-low py-2.5 pl-10 pr-4 text-sm font-medium text-on-surface outline-none ring-1 ring-transparent transition-all focus:ring-primary/15"
            />
          </div>
        </div>

        {isMobileSearchOpen ? (
          <div className="mx-auto mt-4 max-w-6xl md:hidden">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
                search
              </span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
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

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <section className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-on-surface md:text-4xl">
            {restaurant.name}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-sm text-primary">
              menu_book
            </span>
            {totalDishCount ?? 0} published dishes arranged under submenu
            categories, with AR previews for selected plates
          </p>
        </section>

        <nav className="no-scrollbar mb-6 flex gap-2 overflow-x-auto py-1 md:sticky md:top-[4.85rem] md:z-40 md:bg-surface/92 md:backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setActiveViewId(TOP_AR_VIEW)}
            className={cn(
              "whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition-all",
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
                "whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition-all",
                activeViewId === category.id
                  ? "bg-primary text-white shadow-[0_8px_18px_rgba(182,23,34,0.18)]"
                  : "bg-white text-on-surface-variant",
              )}
            >
              {category.name}
            </button>
          ))}
        </nav>

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
                  <TopArCard
                    key={dish.id}
                    dish={dish}
                    publicId={restaurant.publicId}
                  />
                ))}
              </div>

              {topArVisibleCount < topArDishes.length ? (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() =>
                      setTopArVisibleCount((current) =>
                        Math.min(current + TOP_AR_BATCH_SIZE, topArDishes.length),
                      )
                    }
                    className="rounded-full bg-white px-5 py-3 text-sm font-bold text-on-surface shadow-[0_10px_20px_rgba(18,28,42,0.08)] transition-all hover:-translate-y-0.5"
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
              <div>
                <h2 className="text-2xl font-extrabold tracking-[-0.03em] text-on-surface">
                  {selectedCategory.name}
                </h2>
              </div>
              <span className="rounded-full bg-surface-container-low px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">
                {filteredCategoryDishes.length} items
              </span>
            </div>

            {filteredCategoryDishes.length === 0 ? (
              <div className="rounded-[1.2rem] border border-dashed border-outline/40 bg-surface-container-low px-4 py-5 text-sm text-on-surface-variant">
                No dishes match this category right now.
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
              Pick a category like Pizza or Chicken to browse dishes and prices.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function TopArCard({
  dish,
  publicId,
}: {
  dish: ArDishView;
  publicId: string;
}) {
  const [cardRef, isNearViewport] = useNearViewport<HTMLDivElement>();
  const [isPreviewActivated, setIsPreviewActivated] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const shouldMountPreview = isNearViewport || isPreviewActivated;

  return (
    <article className="group overflow-hidden rounded-[1.25rem] bg-surface-container-lowest shadow-[0_12px_28px_rgba(18,28,42,0.05)] transition-all hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(18,28,42,0.08)]">
      <div
        ref={cardRef}
        onClick={() => {
          if (!isPreviewActivated) {
            setIsPreviewActivated(true);
          }
        }}
        className="relative h-56 overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.72),transparent_50%),linear-gradient(180deg,#dbe7fb_0%,#cfdcf5_100%)]"
      >
        {dish.modelUrl && shouldMountPreview ? (
          <ArPreviewCanvas
            modelUrl={dish.modelUrl}
            alt={dish.name}
            interactive={isPreviewActivated}
            onLoaded={() => setIsModelLoaded(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
            <div className="flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-5xl text-primary/70">
                view_in_ar
              </span>
              <p className="text-sm font-semibold text-on-surface">
                3D preview loading
              </p>
            </div>
          </div>
        )}

        {!isModelLoaded ? (
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.4),transparent_52%),linear-gradient(180deg,rgba(219,231,251,0.45)_0%,rgba(207,220,245,0.65)_100%)]" />
        ) : null}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(18,28,42,0.24)] via-transparent to-transparent" />

        {!isPreviewActivated ? (
          <div className="pointer-events-none absolute inset-0 cursor-pointer" aria-hidden="true">
            <div className="absolute bottom-4 right-4 rounded-[0.85rem] bg-[rgba(15,20,26,0.82)] px-3 py-2 shadow-[0_8px_18px_rgba(18,28,42,0.12)] backdrop-blur-sm">
              <p className="flex items-center gap-2 text-xs font-semibold text-white">
                <span className="material-symbols-outlined text-base text-primary-container">
                  view_in_ar
                </span>
                {isModelLoaded ? "Tap anywhere for 3D" : "Loading 3D"}
              </p>
            </div>
          </div>
        ) : null}

        {isPreviewActivated ? (
          <div className="pointer-events-none absolute bottom-4 right-4 rounded-[0.85rem] bg-[rgba(15,20,26,0.72)] px-3 py-2 shadow-[0_8px_18px_rgba(18,28,42,0.12)] backdrop-blur-sm">
            <p className="flex items-center gap-2 text-xs font-semibold text-white">
              <span className="material-symbols-outlined text-base text-primary-container">
                touch_app
              </span>
              Drag to rotate
            </p>
          </div>
        ) : null}

        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-[0.8rem] bg-white/90 px-2.5 py-1.5 shadow-sm backdrop-blur-md">
          <span className="material-symbols-outlined text-lg text-primary">
            view_in_ar
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface">
            AR Ready
          </span>
        </div>
      </div>

      <div className="p-5">
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

        <p className="min-h-12 text-sm leading-6 text-on-surface-variant">
          {dish.description ?? "Tap to place this dish in AR on your table."}
        </p>

        <Link
          href={`/r/${publicId}/ar?dish=${dish.id}`}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-[0.95rem] bg-gradient-to-br from-primary to-primary-container px-4 py-3 text-sm font-bold text-white shadow-[0_10px_20px_rgba(182,23,34,0.16)] transition-all hover:-translate-y-0.5"
        >
          <span className="material-symbols-outlined text-lg">view_in_ar</span>
          View in AR
        </Link>
      </div>
    </article>
  );
}

function useNearViewport<T extends Element>() {
  const elementRef = useRef<T | null>(null);
  const [isNearViewport, setIsNearViewport] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || isNearViewport) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsNearViewport(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "240px 0px",
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [isNearViewport]);

  return [elementRef, isNearViewport] as const;
}

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
