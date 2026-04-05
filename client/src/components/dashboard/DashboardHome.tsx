"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  createRestaurant,
  fetchRestaurant,
  type RestaurantCardData,
  type RestaurantDetails,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthSession } from "@/hooks/use-auth-session";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardTopbar } from "./DashboardTopbar";

type RestaurantBundle = {
  summary: RestaurantCardData;
  details?: RestaurantDetails;
};

const statCards = (
  totalRestaurants: number,
  activeMenus: number,
): Array<{
  label: string;
  value: string;
  icon: string;
  accent?: boolean;
}> => [
  {
    label: "Total Restaurants",
    value: totalRestaurants.toString().padStart(2, "0"),
    icon: "storefront",
  },
  {
    label: "Active Menus",
    value: activeMenus.toString().padStart(2, "0"),
    icon: "restaurant_menu",
  },
  {
    label: "Subscription Plan",
    value: "Professional",
    icon: "verified",
    accent: true,
  },
];

const getCoverTheme = (publicId: string) => {
  const themes = [
    "from-[#5f1310] via-[#7d1f17] to-[#c23726]",
    "from-[#15191f] via-[#2c3138] to-[#40474f]",
    "from-[#3d1e0d] via-[#6d3b18] to-[#b96a2e]",
  ];

  return themes[publicId.length % themes.length];
};

export function DashboardHome() {
  const session = useAuthSession();
  const createPanelRef = useRef<HTMLElement | null>(null);
  const [restaurants, setRestaurants] = useState<RestaurantBundle[]>([]);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [createName, setCreateName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, startCreateTransition] = useTransition();

  useEffect(() => {
    if (session.status !== "authenticated") {
      return;
    }

    let cancelled = false;

    const bootstrap = async () => {
      setIsBootstrapping(true);

      try {
        const bundles = await Promise.all(
          session.user.memberships.map(async (membership) => ({
            summary: {
              ...membership.restaurant,
              role: membership.role,
            },
            details: await fetchRestaurant(
              session.token,
              membership.restaurant.id,
            ).catch(() => undefined),
          })),
        );

        if (!cancelled) {
          setRestaurants(bundles);
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [session]);

  if (session.status === "loading" || isBootstrapping) {
    return (
      <div className="auth-grid flex min-h-screen items-center justify-center">
        <div className="rounded-[1.35rem] bg-white/90 px-8 py-7 shadow-[0_18px_40px_rgba(18,28,42,0.08)]">
          <div className="mx-auto spinner-sm border-primary/30 border-t-primary" />
          <p className="mt-4 text-sm font-semibold text-on-surface-variant">
            Loading control room...
          </p>
        </div>
      </div>
    );
  }

  if (session.status === "unauthenticated") {
    return (
      <div className="auth-grid flex min-h-screen items-center justify-center">
        <div className="rounded-[1.35rem] bg-white/90 px-8 py-7 shadow-[0_18px_40px_rgba(18,28,42,0.08)]">
          <p className="text-sm font-semibold text-error">{session.message}</p>
          <p className="mt-2 text-sm text-on-surface-variant">
            Redirecting you back to the login page.
          </p>
        </div>
      </div>
    );
  }

  const totalRestaurants = restaurants.length;
  const activeMenus = restaurants.reduce(
    (sum, restaurant) =>
      sum +
      (restaurant.details?.menus.filter((menu) => menu.isPublished).length ?? 0),
    0,
  );

  const activityItems = restaurants.flatMap((restaurant) => {
    if (!restaurant.details) {
      return [];
    }

    const publishedDishes = restaurant.details.menus.flatMap((menu) =>
      menu.dishes.filter((dish) => dish.isPublished),
    );

    return [
      {
        key: `${restaurant.summary.id}-updated`,
        icon: "check_circle",
        iconClass: "text-tertiary",
        text: `${restaurant.summary.name} synced its workspace data`,
        meta: new Date(restaurant.details.updatedAt).toLocaleDateString(),
      },
      {
        key: `${restaurant.summary.id}-dishes`,
        icon: "visibility",
        iconClass: "text-primary",
        text: `${publishedDishes.length} published dish${
          publishedDishes.length === 1 ? "" : "es"
        } ready for guests`,
        meta: restaurant.summary.isPublished ? "Live" : "Draft",
      },
    ];
  });

  const limitedActivityItems = activityItems.slice(0, 4);

  const handleCreateRestaurant = () => {
    const trimmedName = createName.trim();
    if (!trimmedName) {
      setCreateError("Restaurant name is required.");
      return;
    }

    setCreateError(null);

    startCreateTransition(async () => {
      try {
        const created = await createRestaurant(session.token, { name: trimmedName });
        const details = await fetchRestaurant(session.token, created.id).catch(
          () => undefined,
        );

        setRestaurants((current) => [
          { summary: { ...created, role: "OWNER" }, details },
          ...current,
        ]);
        setCreateName("");
      } catch (error) {
        setCreateError(
          error instanceof Error ? error.message : "Unable to create restaurant.",
        );
      }
    });
  };

  return (
    <div className="min-h-screen bg-surface">
      <DashboardSidebar createPanelRef={createPanelRef} />

      <main className="min-h-screen md:ml-64">
        <DashboardTopbar user={session.user} />

        <div className="mx-auto max-w-7xl space-y-10 px-6 py-8 md:px-8">
          <section className="space-y-3 animate-auth-fade-up">
            <h1 className="text-[3.4rem] font-extrabold leading-none tracking-[-0.06em] text-on-surface">
              Control Room
            </h1>
            <p className="max-w-2xl text-lg font-medium leading-8 text-on-surface-variant">
              Manage your hospitality ecosystem, monitor active menus, and
              orchestrate brand growth from a single pane of glass.
            </p>
          </section>

          <section className="grid gap-6 md:grid-cols-3">
            {statCards(totalRestaurants, activeMenus).map((card) => (
              <div
                key={card.label}
                className="rounded-[1.1rem] border-l-4 border-primary bg-surface-container-low p-6 shadow-[0_12px_28px_rgba(18,28,42,0.04)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-on-surface-variant/80">
                      {card.label}
                    </p>
                    <p
                      className={cn(
                        "mt-2 text-4xl font-extrabold tracking-[-0.05em]",
                        card.accent ? "text-primary" : "text-on-surface",
                      )}
                    >
                      {card.value}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-4xl text-primary/20">
                    {card.icon}
                  </span>
                </div>
              </div>
            ))}
          </section>

          <div className="grid items-start gap-8 lg:grid-cols-12">
            <section className="space-y-6 lg:col-span-8">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold tracking-[-0.04em] text-on-surface">
                  Managed Entities
                </h2>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-sm font-bold text-primary transition-colors hover:text-primary-container"
                >
                  View All
                  <span className="material-symbols-outlined text-base">
                    arrow_forward
                  </span>
                </button>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {restaurants.length === 0 ? (
                  <div className="rounded-[1.2rem] bg-surface-container-lowest p-8 shadow-[0_18px_40px_rgba(18,28,42,0.06)] md:col-span-2">
                    <h3 className="text-xl font-bold tracking-[-0.03em] text-on-surface">
                      No restaurants yet
                    </h3>
                    <p className="mt-2 max-w-lg text-sm font-medium text-on-surface-variant">
                      Create your first restaurant from the panel on the right to
                      start building menus, dishes, and AR assets.
                    </p>
                  </div>
                ) : (
                  restaurants.map((restaurant) => {
                    const publishedMenus =
                      restaurant.details?.menus.filter((menu) => menu.isPublished)
                        .length ?? 0;
                    const allDishes =
                      restaurant.details?.menus.flatMap((menu) => menu.dishes) ?? [];
                    const ready3dAssets = allDishes.flatMap((dish) =>
                      dish.assets.filter(
                        (asset) =>
                          asset.kind === "MODEL_3D" && asset.status === "READY",
                      ),
                    ).length;

                    return (
                      <article
                        key={restaurant.summary.id}
                        className="group overflow-hidden rounded-[1.2rem] bg-surface-container-lowest shadow-[0_18px_42px_rgba(18,28,42,0.06)] transition-all hover:-translate-y-1 hover:shadow-[0_24px_54px_rgba(18,28,42,0.08)]"
                      >
                        <div
                          className={cn(
                            "relative h-36 overflow-hidden bg-gradient-to-br",
                            getCoverTheme(restaurant.summary.publicId),
                          )}
                        >
                          <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                          <div className="absolute bottom-4 left-4 flex items-center gap-2">
                            <span
                              className={cn(
                                "rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em]",
                                restaurant.summary.isPublished
                                  ? "bg-tertiary text-white"
                                  : "bg-white/18 text-white",
                              )}
                            >
                              {restaurant.summary.isPublished ? "Published" : "Draft"}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-4 p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-xl font-bold tracking-[-0.03em] text-on-surface">
                                {restaurant.summary.name}
                              </h3>
                              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
                                {restaurant.summary.publicId} • {restaurant.summary.role} role
                              </p>
                            </div>

                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
                              <span className="material-symbols-outlined text-base">
                                more_vert
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="rounded-[0.9rem] bg-surface-container-low px-3 py-3">
                              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">
                                Menus
                              </p>
                              <p className="mt-1 text-lg font-extrabold text-on-surface">
                                {publishedMenus}
                              </p>
                            </div>
                            <div className="rounded-[0.9rem] bg-surface-container-low px-3 py-3">
                              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">
                                Dishes
                              </p>
                              <p className="mt-1 text-lg font-extrabold text-on-surface">
                                {allDishes.length}
                              </p>
                            </div>
                            <div className="rounded-[0.9rem] bg-surface-container-low px-3 py-3">
                              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">
                                3D Ready
                              </p>
                              <p className="mt-1 text-lg font-extrabold text-on-surface">
                                {ready3dAssets}
                              </p>
                            </div>
                          </div>

                          <Link
                            href={`/dashboard/restaurants/${restaurant.summary.id}`}
                            className={cn(
                              "flex w-full items-center justify-center gap-2 rounded-[0.95rem] px-4 py-3 text-sm font-bold transition-all",
                              restaurant.summary.isPublished
                                ? "bg-gradient-to-br from-primary to-primary-container text-white shadow-[0_12px_26px_rgba(182,23,34,0.18)]"
                                : "bg-surface-container-high text-on-surface hover:bg-surface-container-highest",
                            )}
                          >
                            {restaurant.summary.isPublished
                              ? "View Dashboard"
                              : "Continue Setup"}
                            <span className="material-symbols-outlined text-base">
                              arrow_forward
                            </span>
                          </Link>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>

            <aside
              ref={createPanelRef}
              className="lg:sticky lg:top-24 lg:col-span-4"
            >
              <div className="relative overflow-hidden rounded-[1.5rem] bg-surface-container-low p-8 shadow-[0_18px_40px_rgba(18,28,42,0.06)]">
                <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/8 blur-3xl" />
                <div className="relative z-10 space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold tracking-[-0.04em] text-on-surface">
                      Expand Brand
                    </h2>
                    <p className="mt-2 text-sm font-medium text-on-surface-variant">
                      Register a new physical location or digital storefront.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                        Restaurant Name
                      </label>
                      <input
                        type="text"
                        value={createName}
                        onChange={(event) => setCreateName(event.target.value)}
                        placeholder="e.g. The Golden Truffle"
                        className="w-full rounded-[0.95rem] bg-white px-4 py-3 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/12 transition-all placeholder:text-on-surface-variant/55 focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                        Unique URL Slug
                      </label>
                      <div className="flex overflow-hidden rounded-[0.95rem] ring-1 ring-outline-variant/12">
                        <span className="flex items-center bg-surface-container-low px-3 text-xs font-semibold text-on-surface-variant">
                          aroma.app/
                        </span>
                        <input
                          type="text"
                          value={createName
                            .trim()
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, "-")
                            .replace(/^-+|-+$/g, "")}
                          readOnly
                          className="w-full bg-white px-4 py-3 text-sm font-medium text-on-surface outline-none"
                        />
                      </div>
                    </div>

                    {createError ? (
                      <div className="rounded-[0.95rem] bg-error-container px-4 py-3 text-sm font-semibold text-error">
                        {createError}
                      </div>
                    ) : null}

                    <button
                      type="button"
                      onClick={handleCreateRestaurant}
                      disabled={isCreating}
                      className="flex w-full items-center justify-center gap-2 rounded-[1rem] bg-gradient-to-br from-primary to-primary-container px-5 py-4 text-sm font-bold text-white shadow-[0_14px_28px_rgba(182,23,34,0.2)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-75"
                    >
                      {isCreating ? <span className="spinner-sm" /> : null}
                      <span className="material-symbols-outlined text-base">
                        add_business
                      </span>
                      Add New Restaurant
                    </button>
                  </div>

                  <div className="rounded-[1rem] bg-white/56 p-4 ring-1 ring-white/55">
                    <p className="text-[11px] italic leading-5 text-on-surface-variant/75">
                      Each new restaurant is linked to your account immediately.
                      Public IDs are generated by the backend after creation, so
                      your routes stay unique and production-safe.
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <section className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-[1.2rem] bg-surface-container-low p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold tracking-[-0.03em] text-on-surface">
                  Platform Activity
                </h2>
                <span className="rounded-md bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                  Live
                </span>
              </div>

              <div className="space-y-4">
                {limitedActivityItems.length === 0 ? (
                  <div className="rounded-[1rem] bg-white px-4 py-4 text-sm font-medium text-on-surface-variant">
                    Activity will appear here once you create restaurants and
                    publish menus.
                  </div>
                ) : (
                  limitedActivityItems.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between gap-4 rounded-[1rem] bg-white px-4 py-3 shadow-[0_8px_24px_rgba(18,28,42,0.04)]"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "material-symbols-outlined text-[1.1rem]",
                            item.iconClass,
                          )}
                        >
                          {item.icon}
                        </span>
                        <span className="text-sm font-semibold text-on-surface">
                          {item.text}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-on-surface-variant">
                        {item.meta}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[1.2rem] bg-surface-container-low p-6">
              <div className="absolute right-[-2rem] top-[-2rem] text-primary/6">
                <span
                  className="material-symbols-outlined text-[10rem]"
                  style={{ fontVariationSettings: '"FILL" 1' }}
                >
                  insights
                </span>
              </div>

              <div className="relative z-10 max-w-sm">
                <h2 className="text-2xl font-bold tracking-[-0.03em] text-on-surface">
                  Upgrade for Advanced Insights
                </h2>
                <p className="mt-3 text-sm font-medium leading-6 text-on-surface-variant">
                  Unlock richer analytics, workflow automation, and better menu
                  optimization once your restaurant operations are live.
                </p>
                <button
                  type="button"
                  className="mt-6 rounded-[0.9rem] border-2 border-primary px-5 py-2.5 text-sm font-bold text-primary transition-all hover:bg-primary hover:text-white"
                >
                  Compare Plans
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
