"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  createRestaurant,
  deleteRestaurant,
  fetchRestaurant,
  updateRestaurant,
  uploadRestaurantCoverImage,
  type RestaurantCardData,
  type RestaurantDetails,
} from "@/lib/api";
import {
  filterMembershipsForPortal,
  getPortalDestinationForVariant,
  getPortalHomePath,
  getPortalLoginPath,
  getRoleLabel,
  getWorkspacePath,
  hasOwnerMembership,
  type PortalVariant,
} from "@/lib/portal";
import { cn } from "@/lib/utils";
import { useAuthSession } from "@/hooks/use-auth-session";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardTopbar } from "./DashboardTopbar";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { ProfileSettings } from "./ProfileSettings";
import { TeamView } from "./TeamView";
import { type MeResponse } from "@/lib/api";

type RestaurantBundle = {
  summary: RestaurantCardData;
  details?: RestaurantDetails;
};

type RestaurantLifecycleDialog =
  | {
      kind: "delete";
      restaurantId: string;
      restaurantName: string;
    };

const statCards = (
  portalVariant: PortalVariant,
  totalRestaurants: number,
  activeMenus: number,
): Array<{
  label: string;
  value: string;
  icon: string;
  accent?: boolean;
}> => [
  {
    label:
      portalVariant === "owner" ? "Total Restaurants" : "Managed Restaurants",
    value: totalRestaurants.toString().padStart(2, "0"),
    icon: "storefront",
  },
  {
    label: "Active Menus",
    value: activeMenus.toString().padStart(2, "0"),
    icon: "restaurant_menu",
  },
  {
    label: portalVariant === "owner" ? "Subscription Plan" : "Access Level",
    value: portalVariant === "owner" ? "Professional" : "Manager",
    icon: portalVariant === "owner" ? "verified" : "badge",
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

export function DashboardHome({
  portalVariant = "owner",
}: {
  portalVariant?: PortalVariant;
}) {
  const router = useRouter();
  const session = useAuthSession({
    portalVariant,
    loginPath: getPortalLoginPath(portalVariant),
  });
  const createPanelRef = useRef<HTMLElement | null>(null);
  const [restaurants, setRestaurants] = useState<RestaurantBundle[]>([]);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [createName, setCreateName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, startCreateTransition] = useTransition();
  const [activeCardMenuId, setActiveCardMenuId] = useState<string | null>(null);
  const [lifecycleDialog, setLifecycleDialog] =
    useState<RestaurantLifecycleDialog | null>(null);
  const [lifecycleMessage, setLifecycleMessage] = useState<string | null>(null);
  const [isSubmittingLifecycle, setIsSubmittingLifecycle] = useState(false);
  const [lifecyclePendingRestaurantId, setLifecyclePendingRestaurantId] =
    useState<string | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [sidebarActiveKey, setSidebarActiveKey] = useState<string>("overview");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<MeResponse | null>(null);
  const [uploadingCoverId, setUploadingCoverId] = useState<string | null>(null);
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null);
  const coverInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (session.status === "authenticated") {
      setCurrentUser(session.user);
    }
  }, [session]);

  useEffect(() => {
    if (session.status !== "authenticated") {
      return;
    }

    const isOwnerUser = hasOwnerMembership(session.user.memberships);

    if (portalVariant === "owner" && !isOwnerUser) {
      router.replace(
        getPortalDestinationForVariant(session.user, "manager") ??
          getPortalLoginPath("manager"),
      );
      return;
    }

    if (portalVariant === "manager") {
      if (isOwnerUser) {
        router.replace(getPortalHomePath("owner"));
        return;
      }
      
      const managerMemberships = session.user.memberships.filter(
        (m) => m.role !== "OWNER" && m.restaurant.isActive
      );
      if (managerMemberships.length === 1) {
        router.replace(getWorkspacePath("manager", managerMemberships[0].restaurant.id));
        return;
      }
    }
  }, [portalVariant, router, session]);

  useEffect(() => {
    if (session.status !== "authenticated") {
      return;
    }

    let cancelled = false;

    const bootstrap = async () => {
      setIsBootstrapping(true);

      try {
        const memberships = filterMembershipsForPortal(
          session.user.memberships,
          portalVariant,
        );
        const bundles = await Promise.all(
          memberships.map(async (membership) => ({
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
          setDashboardError(null);
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
  }, [portalVariant, session]);

  useEffect(() => {
    if (!activeCardMenuId) {
      return;
    }

    const closeMenu = () => setActiveCardMenuId(null);
    window.addEventListener("click", closeMenu);

    return () => {
      window.removeEventListener("click", closeMenu);
    };
  }, [activeCardMenuId]);

  if (
    session.status === "authenticated" &&
    ((portalVariant === "owner" &&
      !hasOwnerMembership(session.user.memberships)) ||
      (portalVariant === "manager" &&
        hasOwnerMembership(session.user.memberships)))
  ) {
    return (
      <LoadingScreen
        message="Redirecting to the correct portal..."
        className="dashboard-shell"
      />
    );
  }

  if (session.status === "loading" || isBootstrapping) {
    return (
      <LoadingScreen
        message="Loading control room..."
        className="dashboard-shell"
      />
    );
  }

  if (session.status === "unauthenticated") {
    return (
      <LoadingScreen
        message={session.message ?? "Redirecting you back to the login page."}
        className="dashboard-shell"
        spinnerColor="#dc2626"
        spinnerTrackColor="#fecaca"
        textColor="#dc2626"
      />
    );
  }

  const totalRestaurants = restaurants.length;
  const activeMenus = restaurants.reduce(
    (sum, restaurant) =>
      sum +
      (restaurant.summary.isActive
        ? restaurant.details?.menus.filter((menu) => menu.isPublished).length ?? 0
        : 0),
    0,
  );
  const inactiveManagerAssignments =
    portalVariant === "manager"
      ? session.user.memberships.filter(
          (membership) =>
            membership.role !== "OWNER" && !membership.restaurant.isActive,
        ).length
      : 0;

  const activityItems = restaurants.flatMap((restaurant) => {
    if (!restaurant.details) {
      return [];
    }

    const publishedDishes = restaurant.details.menus.flatMap((menu) =>
      menu.categories.flatMap((category) =>
        category.dishes.filter((dish) => dish.isPublished),
      ),
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
    if (portalVariant !== "owner") {
      return;
    }

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

  const openLifecycleDialog = (
    restaurant: RestaurantBundle,
  ) => {
    setLifecycleMessage(null);
    setActiveCardMenuId(null);
    setLifecycleDialog({
      kind: "delete",
      restaurantId: restaurant.summary.id,
      restaurantName: restaurant.summary.name,
    });
  };

  const closeLifecycleDialog = () => {
    if (isSubmittingLifecycle) {
      return;
    }

    setLifecycleDialog(null);
    setLifecycleMessage(null);
  };

  const handleConfirmLifecycle = async () => {
    if (!lifecycleDialog) {
      return;
    }

    setIsSubmittingLifecycle(true);
    setLifecycleMessage(null);

    try {
      await deleteRestaurant(session.token, lifecycleDialog.restaurantId);
      setRestaurants((current) =>
        current.filter(
          (restaurant) => restaurant.summary.id !== lifecycleDialog.restaurantId,
        ),
      );
      setDashboardError(null);

      setLifecycleDialog(null);
    } catch (error) {
      setLifecycleMessage(
        error instanceof Error
          ? error.message
          : "Unable to update restaurant status.",
      );
    } finally {
      setIsSubmittingLifecycle(false);
    }
  };

  const handleCoverImageUpload = async (
    restaurantId: string,
    file: File,
  ) => {
    setCoverUploadError(null);
    setUploadingCoverId(restaurantId);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Strip data URL prefix: data:image/jpeg;base64,XXXX
          resolve(result.split(",")[1] ?? "");
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const result = await uploadRestaurantCoverImage(
        session.token,
        restaurantId,
        base64,
        file.type,
      );

      // Update local state so card immediately shows the new photo
      setRestaurants((current) =>
        current.map((r) =>
          r.summary.id === restaurantId
            ? {
                ...r,
                summary: { ...r.summary, coverImageUrl: result.coverImageUrl },
              }
            : r,
        ),
      );
    } catch (error) {
      setCoverUploadError(
        error instanceof Error ? error.message : "Upload failed. Please try again.",
      );
    } finally {
      setUploadingCoverId(null);
    }
  };

  const handleToggleRestaurantActive = async (
    restaurant: RestaurantBundle,
    nextActiveState: boolean,
  ) => {
    setActiveCardMenuId(null);
    setDashboardError(null);
    setLifecyclePendingRestaurantId(restaurant.summary.id);

    try {
      const updated = await updateRestaurant(
        session.token,
        restaurant.summary.id,
        {
          isActive: nextActiveState,
        },
      );

      setRestaurants((current) =>
        current.map((currentRestaurant) =>
          currentRestaurant.summary.id === restaurant.summary.id
            ? {
                ...currentRestaurant,
                summary: {
                  ...currentRestaurant.summary,
                  isActive: updated.isActive,
                  isPublished: updated.isPublished,
                },
                details: currentRestaurant.details
                  ? {
                      ...currentRestaurant.details,
                      isActive: updated.isActive,
                      isPublished: updated.isPublished,
                      updatedAt: updated.updatedAt,
                    }
                  : currentRestaurant.details,
              }
            : currentRestaurant,
        ),
      );
    } catch (error) {
      setDashboardError(
        error instanceof Error
          ? error.message
          : "Unable to update kitchen status.",
      );
    } finally {
      setLifecyclePendingRestaurantId(null);
    }
  };

  const lifecycleDialogMeta = lifecycleDialog
    ? {
        eyebrow: "Delete Kitchen",
        title: `Delete ${lifecycleDialog.restaurantName}?`,
        description:
          "This removes the restaurant, its manager login, dishes, menus, assets, and guest access permanently.",
        confirmLabel: "Delete Kitchen",
        tone: "danger" as const,
      }
    : null;

  return (
    <div className="dashboard-shell min-h-screen">
      <DashboardSidebar
        createPanelRef={createPanelRef}
        portalVariant={portalVariant}
        activeKey={sidebarActiveKey}
        onNavChange={(key) => {
          setSidebarActiveKey(key);
          // If clicking "New Location" in sidebar, open the create modal
          if (key === "create") {
            setShowCreateModal(true);
            return;
          }
        }}
      />

      <main className="min-h-screen md:ml-64">
        <DashboardTopbar
          user={(currentUser || session.user) as MeResponse}
          portalVariant={portalVariant}
        />

        <div className="mx-auto max-w-7xl space-y-8 px-6 py-8 md:px-8" key={sidebarActiveKey}>
          {sidebarActiveKey === "restaurants" ? (
            /* ── Restaurants View ─────────────────────────────────────── */
            <section className="dash-fade-up space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="space-y-2">
                  <h1 className="dash-title text-[2.6rem] font-extrabold leading-none tracking-[-0.04em] text-on-surface">
                    Restaurants
                  </h1>
                  <p className="text-sm font-medium leading-6 text-on-surface-variant">
                    Manage all your kitchens: open workspace, deactivate, or remove.
                  </p>
                </div>

                {portalVariant === "owner" ? (
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="dash-cta inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold"
                  >
                    <span className="material-symbols-outlined text-base">
                      add
                    </span>
                    Add Restaurant
                  </button>
                ) : null}
              </div>

              {restaurants.length === 0 ? (
                <div className="dash-panel">
                  <p className="text-sm text-on-surface-variant">
                    No restaurants yet. Create one from the sidebar.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {restaurants.map((restaurant) => {
                    const publishedMenus =
                      restaurant.details?.menus.filter((menu) => menu.isPublished)
                        .length ?? 0;
                    const allDishes =
                      restaurant.details?.menus.flatMap((menu) =>
                        menu.categories.flatMap((category) => category.dishes),
                      ) ?? [];
                    const ready3dAssets = allDishes.flatMap((dish) =>
                      dish.assets.filter(
                        (asset) =>
                          asset.kind === "MODEL_3D" && asset.status === "READY",
                      ),
                    ).length;

                    return (
                      <div
                        key={restaurant.summary.id}
                        className="dash-panel space-y-4"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <h3 className="truncate text-lg font-bold text-on-surface">
                              {restaurant.summary.name}
                            </h3>
                            <p className="text-xs text-on-surface-variant">
                              {restaurant.summary.publicId} ·{" "}
                              {restaurant.summary.isActive
                                ? restaurant.summary.isPublished
                                  ? "Published"
                                  : "Active (Draft)"
                                : "Deactivated"}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={getWorkspacePath(
                                portalVariant,
                                restaurant.summary.id,
                              )}
                              className="dash-cta inline-flex items-center gap-2 px-4 py-2 text-xs font-bold"
                            >
                              <span className="material-symbols-outlined text-[0.9rem]">
                                open_in_new
                              </span>
                              Open workspace
                            </Link>

                            {portalVariant === "owner" && (
                              <>
                                {/* Upload cover photo button */}
                                <input
                                  ref={(el) => { coverInputRefs.current[restaurant.summary.id] = el; }}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) void handleCoverImageUpload(restaurant.summary.id, file);
                                    e.target.value = "";
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => coverInputRefs.current[restaurant.summary.id]?.click()}
                                  disabled={uploadingCoverId === restaurant.summary.id}
                                  className="dash-cta-outline inline-flex items-center gap-2 px-4 py-2 text-xs font-bold"
                                >
                                  {uploadingCoverId === restaurant.summary.id ? (
                                    <span className="spinner-sm" />
                                  ) : (
                                    <span className="material-symbols-outlined text-[0.9rem]">add_photo_alternate</span>
                                  )}
                                  {restaurant.summary.coverImageUrl ? "Change Photo" : "Upload Photo"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleToggleRestaurantActive(
                                      restaurant,
                                      !restaurant.summary.isActive,
                                    )
                                  }
                                  disabled={
                                    lifecyclePendingRestaurantId ===
                                    restaurant.summary.id
                                  }
                                  className="dash-cta-outline inline-flex items-center gap-2 px-4 py-2 text-xs font-bold"
                                >
                                  <span className="material-symbols-outlined text-[0.9rem]">
                                    {restaurant.summary.isActive
                                      ? "pause_circle"
                                      : "play_circle"}
                                  </span>
                                  {restaurant.summary.isActive
                                    ? "Deactivate kitchen"
                                    : "Reactivate kitchen"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openLifecycleDialog(restaurant)}
                                  className="inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-50"
                                >
                                  <span className="material-symbols-outlined text-[0.9rem]">
                                    delete
                                  </span>
                                  Delete kitchen
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {coverUploadError ? (
                          <div className="rounded-[0.75rem] bg-error-container px-3 py-2 text-xs font-semibold text-error">
                            {coverUploadError}
                          </div>
                        ) : null}

                        {/* Stats row — Menus, Dishes, 3D Ready */}
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div className="dash-stat-tile">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">
                              Menus
                            </p>
                            <p className="mt-1 text-lg font-extrabold text-on-surface">
                              {publishedMenus}
                            </p>
                          </div>
                          <div className="dash-stat-tile">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">
                              Dishes
                            </p>
                            <p className="mt-1 text-lg font-extrabold text-on-surface">
                              {allDishes.length}
                            </p>
                          </div>
                          <div className="dash-stat-tile">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant/70">
                              3D Ready
                            </p>
                            <p className="mt-1 text-lg font-extrabold text-on-surface">
                              {ready3dAssets}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {dashboardError ? (
                <div className="rounded-[1rem] bg-error-container px-4 py-3 text-sm font-semibold text-error">
                  {dashboardError}
                </div>
              ) : null}
            </section>
          ) : sidebarActiveKey === "settings" ? (
            /* ── Profile Settings View ────────────────────────────────── */
            session.status === "authenticated" ? (
              <ProfileSettings
                user={(currentUser || session.user) as MeResponse}
                token={session.token}
                onUserUpdate={(updatedUser) => setCurrentUser(updatedUser)}
              />
            ) : null
          ) : sidebarActiveKey === "team" ? (
            /* ── Team Directory View ──────────────────────────────────── */
            session.status === "authenticated" ? (
              <TeamView
                token={session.token}
              />
            ) : null
          ) : (
          /* ── Dashboard Overview (default) ───────────────────────────── */
          <>
          <section className="dash-fade-up flex flex-wrap items-end justify-between gap-6">
            <div className="space-y-2">
              <h1 className="dash-title text-[2.6rem] font-extrabold leading-none tracking-[-0.04em] text-on-surface">
                Dashboard
              </h1>
              <p className="text-sm font-medium leading-6 text-on-surface-variant">
                {portalVariant === "owner"
                  ? "Plan, prioritize, and accomplish your tasks with ease."
                  : "Open assigned restaurants, update menus, and share the public link."}
              </p>
            </div>
          </section>

          <section className="grid gap-4 dash-fade-up delay-1 md:grid-cols-2 lg:grid-cols-4">
            {(() => {
              const draftRestaurants = restaurants.filter(
                (r) => !r.summary.isPublished,
              ).length;
              const publishedRestaurants = restaurants.filter(
                (r) => r.summary.isPublished,
              ).length;
              const totalDishes = restaurants.reduce(
                (sum, r) =>
                  sum +
                  (r.details?.menus.flatMap((m) =>
                    m.categories.flatMap((c) => c.dishes),
                  ).length ?? 0),
                0,
              );

              return (
                <>
                  <div className="dash-stat-card hero">
                    <div className="flex items-start justify-between">
                      <p className="text-base font-semibold">
                        {portalVariant === "owner"
                          ? "Total Restaurants"
                          : "Managed Restaurants"}
                      </p>
                      <span className="dash-arrow-chip">
                        <span className="material-symbols-outlined">
                          arrow_outward
                        </span>
                      </span>
                    </div>
                    <p className="mt-6 text-5xl font-extrabold leading-none tracking-[-0.04em]">
                      {totalRestaurants.toString().padStart(2, "0")}
                    </p>
                    <p className="mt-3 text-xs font-semibold opacity-90">
                      <span className="dash-trend-pill">↑ 5</span> Increased
                      from last month
                    </p>
                  </div>

                  <div className="dash-stat-card">
                    <div className="flex items-start justify-between">
                      <p className="text-base font-semibold">Active Menus</p>
                      <span className="dash-arrow-chip outline">
                        <span className="material-symbols-outlined">
                          arrow_outward
                        </span>
                      </span>
                    </div>
                    <p className="mt-6 text-5xl font-extrabold leading-none tracking-[-0.04em] text-on-surface">
                      {activeMenus.toString().padStart(2, "0")}
                    </p>
                    <p className="mt-3 text-xs font-semibold text-on-surface-variant">
                      <span className="dash-trend-pill outline">↑ 2</span>{" "}
                      Increased from last month
                    </p>
                  </div>

                  <div className="dash-stat-card">
                    <div className="flex items-start justify-between">
                      <p className="text-base font-semibold">
                        Published Restaurants
                      </p>
                      <span className="dash-arrow-chip outline">
                        <span className="material-symbols-outlined">
                          arrow_outward
                        </span>
                      </span>
                    </div>
                    <p className="mt-6 text-5xl font-extrabold leading-none tracking-[-0.04em] text-on-surface">
                      {publishedRestaurants.toString().padStart(2, "0")}
                    </p>
                    <p className="mt-3 text-xs font-semibold text-on-surface-variant">
                      <span className="dash-trend-pill outline">↑ 1</span>{" "}
                      Increased from last month
                    </p>
                  </div>

                  <div className="dash-stat-card">
                    <div className="flex items-start justify-between">
                      <p className="text-base font-semibold">
                        Pending / Drafts
                      </p>
                      <span className="dash-arrow-chip outline">
                        <span className="material-symbols-outlined">
                          arrow_outward
                        </span>
                      </span>
                    </div>
                    <p className="mt-6 text-5xl font-extrabold leading-none tracking-[-0.04em] text-on-surface">
                      {draftRestaurants.toString().padStart(2, "0")}
                    </p>
                    <p className="mt-3 text-xs font-semibold text-on-surface-variant">
                      {totalDishes} total dishes across portfolio
                    </p>
                  </div>
                </>
              );
            })()}
          </section>

          <div className="grid items-start gap-8 lg:grid-cols-12">
            <section
              className="space-y-6 lg:col-span-12"
            >
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold tracking-[-0.04em] text-on-surface">
                  {portalVariant === "owner"
                    ? "Managed Entities"
                    : "Assigned Restaurant"}
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

              {dashboardError ? (
                <div className="rounded-[1rem] bg-error-container px-4 py-3 text-sm font-semibold text-error">
                  {dashboardError}
                </div>
              ) : null}

              <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar">
                {restaurants.length === 0 ? (
                  <div className="rounded-[1.2rem] bg-surface-container-lowest p-8 shadow-[0_18px_40px_rgba(18,28,42,0.06)] md:col-span-2">
                    <h3 className="text-xl font-bold tracking-[-0.03em] text-on-surface">
                      {portalVariant === "owner"
                      ? "No restaurants yet"
                      : "No restaurant has been assigned yet"}
                    </h3>
                    <p className="mt-2 max-w-lg text-sm font-medium text-on-surface-variant">
                      {portalVariant === "owner"
                        ? "Create your first restaurant from the panel on the right to start building menus, dishes, and AR assets."
                        : inactiveManagerAssignments > 0
                          ? "Your assigned restaurant has been deactivated. Contact the owner or admin to restore access."
                          : "Once the owner shares a restaurant with this account, it will appear here for menu updates, QR sharing, and daily operations."}
                    </p>
                  </div>
                ) : (
                  restaurants.map((restaurant) => {
                    const publishedMenus =
                      restaurant.details?.menus.filter((menu) => menu.isPublished)
                        .length ?? 0;
                    const allDishes =
                      restaurant.details?.menus.flatMap((menu) =>
                        menu.categories.flatMap((category) => category.dishes),
                      ) ?? [];
                    const ready3dAssets = allDishes.flatMap((dish) =>
                      dish.assets.filter(
                        (asset) =>
                          asset.kind === "MODEL_3D" && asset.status === "READY",
                      ),
                    ).length;

                    return (
                      <article
                        key={restaurant.summary.id}
                        className="dash-restaurant-card group overflow-hidden rounded-[1.2rem] shadow-[0_18px_42px_rgba(18,28,42,0.06)] min-w-[320px] max-w-[360px] flex-shrink-0"
                      >
                        <div
                          className={cn(
                            "relative h-36 overflow-hidden bg-gradient-to-br",
                            !restaurant.summary.coverImageUrl && getCoverTheme(restaurant.summary.publicId),
                          )}
                          style={
                            restaurant.summary.coverImageUrl
                              ? {
                                  backgroundImage: `url(${restaurant.summary.coverImageUrl})`,
                                  backgroundSize: "cover",
                                  backgroundPosition: "center",
                                }
                              : undefined
                          }
                        >
                          <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                          <div className="absolute bottom-4 left-4 flex items-center gap-2">
                            <span
                              className="dash-status-pill"
                              data-state={
                                !restaurant.summary.isActive
                                  ? "deactivated"
                                  : restaurant.summary.isPublished
                                    ? "published"
                                    : "draft"
                              }
                            >
                              {!restaurant.summary.isActive
                                ? "Deactivated"
                                : restaurant.summary.isPublished
                                  ? "Published"
                                  : "Draft"}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-4 p-5">
                          <div>
                            <h3 className="text-xl font-bold tracking-[-0.03em] text-on-surface">
                              {restaurant.summary.name}
                            </h3>
                            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
                              {restaurant.summary.publicId} -{" "}
                              {getRoleLabel(restaurant.summary.role)} access
                            </p>
                          </div>

                          <Link
                            href={getWorkspacePath(
                              portalVariant,
                              restaurant.summary.id,
                            )}
                            className="dash-cta flex w-full items-center justify-center gap-2 rounded-[0.95rem] px-4 py-3 text-sm font-bold text-white"
                          >
                            Open Workspace
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
                  <div className="rounded-[1rem] bg-white p-4 text-sm font-medium text-on-surface-variant">
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
          </>
          )}
        </div>
      </main>

      {/* ── Create Restaurant Modal (Expand Brand) ─────────────────── */}
      {showCreateModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-md"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="dash-create-panel relative w-full max-w-md overflow-hidden rounded-[1.5rem] p-8 animate-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-low"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>

            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold tracking-[-0.04em] text-on-surface">
                  Expand Brand
                </h2>
                <p className="mt-2 text-sm font-medium text-on-surface-variant">
                  Register a new physical location or digital storefront.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="create-restaurant-name" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                    Restaurant Name
                  </label>
                  <input
                    id="create-restaurant-name"
                    type="text"
                    aria-label="Restaurant name"
                    value={createName}
                    onChange={(event) => setCreateName(event.target.value)}
                    placeholder="e.g. The Golden Truffle"
                    className="dash-create-input w-full rounded-[0.95rem] px-4 py-3 text-sm font-medium"
                  />
                </div>

                <div>
                  <label htmlFor="create-restaurant-slug" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                    Unique URL Slug
                  </label>
                  <div className="flex overflow-hidden rounded-[0.95rem] ring-1 ring-outline-variant/12">
                    <span className="flex items-center bg-surface-container-low px-3 text-xs font-semibold text-on-surface-variant">
                      aroma.app/
                    </span>
                    <input
                      id="create-restaurant-slug"
                      type="text"
                      aria-label="Restaurant URL slug"
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
                  onClick={() => {
                    handleCreateRestaurant();
                    if (!createError && createName.trim()) {
                      setShowCreateModal(false);
                    }
                  }}
                  disabled={isCreating}
                  className="dash-cta flex w-full items-center justify-center gap-2 rounded-[1rem] px-5 py-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-75"
                >
                  {isCreating ? <span className="spinner-sm" /> : null}
                  <span className="material-symbols-outlined text-base">
                    add_business
                  </span>
                  Add New Restaurant
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {lifecycleDialog && lifecycleDialogMeta ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(18,28,42,0.36)] p-4 backdrop-blur-md"
          onClick={closeLifecycleDialog}
        >
          <section
            className="w-full max-w-xl rounded-[1.6rem] bg-white p-6 shadow-[0_30px_80px_rgba(18,28,42,0.22)]"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
              {lifecycleDialogMeta.eyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-on-surface">
              {lifecycleDialogMeta.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-on-surface-variant">
              {lifecycleDialogMeta.description}
            </p>

            {lifecycleMessage ? (
              <div className="mt-5 rounded-[1rem] bg-error-container px-4 py-3 text-sm font-semibold text-error">
                {lifecycleMessage}
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeLifecycleDialog}
                disabled={isSubmittingLifecycle}
                className="rounded-[1rem] border border-slate-200 px-5 py-3 text-sm font-bold text-on-surface-variant transition-colors hover:border-primary/25 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmLifecycle()}
                disabled={isSubmittingLifecycle}
                className={cn(
                  "flex items-center gap-2 rounded-[1rem] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_28px_rgba(182,23,34,0.2)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70",
                  lifecycleDialogMeta.tone === "danger"
                    ? "bg-gradient-to-br from-[#9d1321] to-[#cf2334]"
                    : "bg-gradient-to-br from-primary to-primary-container",
                )}
              >
                {isSubmittingLifecycle ? <span className="spinner-sm" /> : null}
                {lifecycleDialogMeta.confirmLabel}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
