"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

import {
  fetchPublicRestaurant,
  type PublicDishPayload,
  type PublicRestaurantPayload,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type PublicRestaurantMenuProps = {
  publicId: string;
};

const formatPrice = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);

export function PublicRestaurantMenu({
  publicId,
}: PublicRestaurantMenuProps) {
  const [restaurant, setRestaurant] = useState<PublicRestaurantPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeMenuId, setActiveMenuId] = useState("all");

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

  const filteredMenus = useMemo(() => {
    if (!restaurant) {
      return [];
    }

    const normalizedSearch = deferredSearch.trim().toLowerCase();

    return restaurant.menus
      .filter((menu) => activeMenuId === "all" || menu.id === activeMenuId)
      .map((menu) => ({
        ...menu,
        dishes: menu.dishes.filter((dish) => {
          if (!normalizedSearch) {
            return true;
          }

          return [dish.name, dish.description ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch);
        }),
      }))
      .filter((menu) => menu.dishes.length > 0);
  }, [activeMenuId, deferredSearch, restaurant]);

  const highlightedDish = useMemo(() => {
    if (!filteredMenus[0]?.dishes[0]) {
      return null;
    }

    const firstArDish = filteredMenus
      .flatMap((menu) => menu.dishes)
      .find((dish) => dish.modelUrl);

    return firstArDish ?? filteredMenus[0].dishes[0];
  }, [filteredMenus]);

  const totalDishCount = restaurant?.menus.reduce(
    (count, menu) => count + menu.dishes.length,
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
    <div className="min-h-screen bg-surface pb-28">
      <header className="sticky top-0 z-50 border-b border-white/50 bg-white/80 px-4 py-4 backdrop-blur-xl md:px-6">
        <div className="mx-auto flex max-w-6xl items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-lg font-extrabold tracking-tight text-on-surface">
              Aroma AR
            </p>
          </div>

          <div className="relative hidden min-w-0 flex-1 md:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
              search
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search menu..."
              className="w-full rounded-[1rem] bg-surface-container-low py-2.5 pl-10 pr-4 text-sm font-medium text-on-surface outline-none ring-1 ring-transparent transition-all focus:ring-primary/15"
            />
          </div>

          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant transition-colors hover:text-primary"
          >
            <span className="material-symbols-outlined">account_circle</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <section className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-on-surface md:text-4xl">
            {restaurant.name}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-sm text-primary">
              view_in_ar
            </span>
            {totalDishCount ?? 0} published dishes and immersive AR previews for
            select plates
          </p>
        </section>

        {highlightedDish ? (
          <section className="mb-6 overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-surface-container-low to-white p-4 shadow-[0_16px_36px_rgba(18,28,42,0.05)] md:p-5">
            <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr] md:items-center">
              <div className="order-2 md:order-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                  Signature Preview
                </p>
                <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.03em] text-on-surface">
                  {highlightedDish.name}
                </h2>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant">
                  {highlightedDish.description ??
                    "A featured dish from today’s digital menu."}
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-lg font-extrabold text-primary">
                    {formatPrice(highlightedDish.price)}
                  </span>
                  {highlightedDish.modelUrl ? (
                    <Link
                      href={`/r/${restaurant.publicId}/ar?dish=${highlightedDish.id}`}
                      className="inline-flex items-center gap-2 rounded-[1rem] bg-gradient-to-br from-primary to-primary-container px-5 py-3 text-sm font-bold text-white shadow-[0_14px_28px_rgba(182,23,34,0.18)] transition-transform hover:-translate-y-0.5"
                    >
                      <span className="material-symbols-outlined text-lg">
                        view_in_ar
                      </span>
                      View in AR
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="order-1 overflow-hidden rounded-[1.35rem] bg-surface-container-high md:order-2">
                {highlightedDish.thumbnailUrl ? (
                  <img
                    src={highlightedDish.thumbnailUrl}
                    alt={highlightedDish.name}
                    className="h-60 w-full object-cover md:h-72"
                  />
                ) : (
                  <div className="flex h-60 items-center justify-center text-on-surface-variant md:h-72">
                    <span className="material-symbols-outlined text-5xl">
                      restaurant
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : null}

        <div className="relative mb-6 md:hidden">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">
            search
          </span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search menu..."
            className="w-full rounded-[1rem] bg-surface-container-low py-3 pl-10 pr-4 text-sm font-medium text-on-surface outline-none ring-1 ring-transparent transition-all focus:ring-primary/15"
          />
        </div>

        <nav className="no-scrollbar sticky top-[4.85rem] z-40 mb-6 flex gap-2 overflow-x-auto bg-surface/92 py-1 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setActiveMenuId("all")}
            className={cn(
              "whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition-all",
              activeMenuId === "all"
                ? "bg-primary text-white shadow-[0_8px_18px_rgba(182,23,34,0.18)]"
                : "bg-white text-on-surface-variant",
            )}
          >
            All
          </button>
          {restaurant.menus.map((menu) => (
            <button
              key={menu.id}
              type="button"
              onClick={() => setActiveMenuId(menu.id)}
              className={cn(
                "whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition-all",
                activeMenuId === menu.id
                  ? "bg-primary text-white shadow-[0_8px_18px_rgba(182,23,34,0.18)]"
                  : "bg-white text-on-surface-variant",
              )}
            >
              {menu.name}
            </button>
          ))}
        </nav>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredMenus.length === 0 ? (
            <div className="rounded-[1.5rem] bg-white px-5 py-8 shadow-[0_16px_36px_rgba(18,28,42,0.05)] md:col-span-2 xl:col-span-3">
              <p className="text-lg font-bold text-on-surface">
                No dishes match your search
              </p>
              <p className="mt-2 text-sm text-on-surface-variant">
                Try another keyword or switch to a different category.
              </p>
            </div>
          ) : (
            filteredMenus.flatMap((menu) =>
              menu.dishes.map((dish) => (
                <DishCard
                  key={dish.id}
                  dish={dish}
                  menuName={menu.name}
                  publicId={restaurant.publicId}
                />
              )),
            )
          )}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-100 bg-white/90 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-around">
          <div className="flex flex-col items-center gap-1 rounded-[1rem] bg-primary/8 px-4 py-2 text-primary">
            <span className="material-symbols-outlined">restaurant</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.14em]">
              Menu
            </span>
          </div>

          <Link
            href={
              highlightedDish?.modelUrl
                ? `/r/${restaurant.publicId}/ar?dish=${highlightedDish.id}`
                : `/r/${restaurant.publicId}`
            }
            className="flex flex-col items-center gap-1 px-4 py-2 text-on-surface-variant transition-colors hover:text-primary"
          >
            <span className="material-symbols-outlined">view_in_ar</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.14em]">
              AR View
            </span>
          </Link>

          <button
            type="button"
            className="flex flex-col items-center gap-1 px-4 py-2 text-on-surface-variant"
          >
            <span className="material-symbols-outlined">shopping_bag</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.14em]">
              Bag
            </span>
          </button>

          <button
            type="button"
            className="flex flex-col items-center gap-1 px-4 py-2 text-on-surface-variant"
          >
            <span className="material-symbols-outlined">person</span>
            <span className="text-[11px] font-bold uppercase tracking-[0.14em]">
              Profile
            </span>
          </button>
        </div>
      </nav>

      {highlightedDish?.modelUrl ? (
        <Link
          href={`/r/${restaurant.publicId}/ar?dish=${highlightedDish.id}`}
          className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-container text-white shadow-[0_18px_32px_rgba(182,23,34,0.28)] transition-transform hover:scale-105"
        >
          <span className="material-symbols-outlined text-[1.7rem]">
            view_in_ar
          </span>
        </Link>
      ) : null}
    </div>
  );
}

function DishCard({
  dish,
  menuName,
  publicId,
}: {
  dish: PublicDishPayload;
  menuName: string;
  publicId: string;
}) {
  const isArReady = Boolean(dish.modelUrl);

  return (
    <article className="group overflow-hidden rounded-[1.25rem] bg-surface-container-lowest shadow-[0_12px_28px_rgba(18,28,42,0.05)] transition-all hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(18,28,42,0.08)]">
      <div className="relative h-56 overflow-hidden bg-surface-container-high">
        {dish.thumbnailUrl ? (
          <img
            src={dish.thumbnailUrl}
            alt={dish.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-on-surface-variant">
            <span className="material-symbols-outlined text-5xl">image</span>
          </div>
        )}

        {isArReady ? (
          <div className="absolute right-3 top-3 flex items-center gap-1 rounded-[0.8rem] bg-white/90 px-2.5 py-1.5 shadow-sm backdrop-blur-md">
            <span className="material-symbols-outlined text-lg text-primary">
              view_in_ar
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface">
              AR Ready
            </span>
          </div>
        ) : null}
      </div>

      <div className="p-5">
        <div className="mb-2 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
              {menuName}
            </p>
            <h3 className="mt-1 text-lg font-extrabold leading-tight text-on-surface">
              {dish.name}
            </h3>
          </div>
          <span className="text-base font-extrabold text-primary">
            {formatPrice(dish.price)}
          </span>
        </div>

        <p className="min-h-12 text-sm leading-6 text-on-surface-variant">
          {dish.description ?? "A signature dish prepared fresh for this menu."}
        </p>

        {isArReady ? (
          <Link
            href={`/r/${publicId}/ar?dish=${dish.id}`}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-[0.95rem] bg-gradient-to-br from-primary to-primary-container px-4 py-3 text-sm font-bold text-white shadow-[0_10px_20px_rgba(182,23,34,0.16)] transition-all hover:-translate-y-0.5"
          >
            <span className="material-symbols-outlined text-lg">view_in_ar</span>
            View in AR
          </Link>
        ) : (
          <button
            type="button"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-[0.95rem] bg-surface-container-low px-4 py-3 text-sm font-bold text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-lg">
              add_shopping_cart
            </span>
            AR preview coming soon
          </button>
        )}
      </div>
    </article>
  );
}
