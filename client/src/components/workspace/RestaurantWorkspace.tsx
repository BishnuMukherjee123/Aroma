"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  completeAssetUpload,
  createCategory,
  createAssetUpload,
  createDish,
  createRestaurantManagerAccount,
  createMenu,
  deleteCategory,
  deleteDish,
  deleteMenu,
  fetchRestaurant,
  generateRestaurantQr,
  updateCategory,
  updateDish,
  updateMenu,
  updateRestaurant,
  uploadFileToSignedUrl,
  type AssetSummary,
  type CategorySummary,
  type CrossSellItem,
  type CurrencyCode,
  type DishSummary,
  type RestaurantDetails,
  type RestaurantQrPayload,
} from "@/lib/api";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  getPortalLoginPath,
  getPortalHomePath,
  getRoleLabel,
  getWorkspacePath,
  type PortalVariant,
} from "@/lib/portal";
import { cn } from "@/lib/utils";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { ReadinessCard } from "./ReadinessCard";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { WorkspaceSidebar } from "./WorkspaceSidebar";

type RestaurantWorkspaceProps = {
  restaurantId: string;
  portalVariant?: PortalVariant;
};

type WorkspaceTab = "dishes" | "menus" | "team" | "settings";

type ComposerState = {
  mode: "create" | "edit";
  dishId: string | null;
  name: string;
  price: string;
  currency: CurrencyCode;
  description: string;
  badgeLabel: string;
  servingSize: string;
  sortOrder: string;
  detailsPanelEnabled: boolean;
  crossSellItems: CrossSellComposerItem[];
  isPublished: boolean;
  dietaryType: "VEG" | "NON_VEG" | "BOTH" | null;
};

type CrossSellComposerItem = CrossSellItem & {
  imageFile?: File | null;
  imagePreviewUrl?: string | null;
};

type DishRow = DishSummary & {
  mainMenuId: string;
  mainMenuName: string;
  menuId: string;
  menuName: string;
};

type TeamComposerState = {
  email: string;
  password: string;
  name: string;
  mobile: string;
  profilePic: string;
  restaurantAddress: string;
  isOpen: boolean;
  mode: "create" | "edit";
};

type MenuComposerState = {
  mode: "create" | "edit";
  menuId: string | null;
  name: string;
  isPublished: boolean;
  sortOrder: string;
};

type SettingsFormState = {
  name: string;
  publicId: string;
  isPublished: boolean;
};

type WorkspaceToast = {
  id: string;
  tone: "success" | "error" | "info";
  message: string;
};

type WorkspaceActionDialog =
  | {
      kind: "createMainMenu";
      value: string;
    }
  | {
      kind: "renameMainMenu";
      menuId: string;
      currentName: string;
      value: string;
    }
  | {
      kind: "deleteMainMenu";
      menuId: string;
      name: string;
    }
  | {
      kind: "deleteCategory";
      categoryId: string;
      name: string;
    }
  | {
      kind: "deleteDish";
      dishId: string;
      name: string;
    };

const emptyComposerState: ComposerState = {
  mode: "create",
  dishId: null,
  name: "",
  price: "",
  currency: "USD",
  description: "",
  badgeLabel: "",
  servingSize: "2",
  sortOrder: "0",
  detailsPanelEnabled: true,
  crossSellItems: [],
  isPublished: false,
  dietaryType: null,
};

const emptyMenuComposerState: MenuComposerState = {
  mode: "create",
  menuId: null,
  name: "",
  isPublished: true,
  sortOrder: "0",
};

const emptyTeamComposerState: TeamComposerState = {
  email: "",
  password: "",
  name: "",
  mobile: "",
  profilePic: "",
  restaurantAddress: "",
  isOpen: false,
  mode: "create",
};

const emptySettingsFormState: SettingsFormState = {
  name: "",
  publicId: "",
  isPublished: false,
};

const ownerWorkspaceTabs: Array<{ id: WorkspaceTab; label: string }> = [
  { id: "dishes", label: "All Dishes" },
  { id: "menus", label: "Menus & Categories" },
];

const managerWorkspaceTabs: Array<{ id: WorkspaceTab; label: string }> = [
  { id: "dishes", label: "All Dishes" },
  { id: "menus", label: "Menus & Categories" },
];

type CategorySection = CategorySummary & {
  mainMenuId: string;
  mainMenuName: string;
};

const getMainMenuCategories = (
  menu: { categories?: CategorySummary[] } | null | undefined,
): CategorySummary[] => (Array.isArray(menu?.categories) ? menu.categories : []);

const sanitizePublicId = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

const flattenDishes = (menus: CategorySection[]): DishRow[] =>
  menus.flatMap((menu) =>
    menu.dishes.map((dish) => ({
      ...dish,
      mainMenuId: menu.mainMenuId,
      mainMenuName: menu.mainMenuName,
      menuId: menu.id,
      menuName: menu.name,
    })),
  );

const getAssetByKind = (
  assets: AssetSummary[],
  kind: AssetSummary["kind"],
): AssetSummary | undefined => assets.find((asset) => asset.kind === kind);

const currencyOptions: Array<{ value: CurrencyCode; label: string }> = [
  { value: "USD", label: "USD ($)" },
  { value: "INR", label: "INR (₹)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "AED", label: "AED (د.إ)" },
];

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const inrFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const eurFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const gbpFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const aedFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "AED",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const formatPrice = (value: number, currency: CurrencyCode) => {
  switch (currency) {
    case "INR":
      return inrFormatter.format(value);
    case "EUR":
      return eurFormatter.format(value);
    case "GBP":
      return gbpFormatter.format(value);
    case "AED":
      return aedFormatter.format(value);
    default:
      return usdFormatter.format(value);
  }
};

const buildReadinessPercent = (checks: boolean[]) =>
  Math.round((checks.filter(Boolean).length / checks.length) * 100);

const resolveOwnerLabel = (restaurant: RestaurantDetails) =>
  restaurant.members.find((member) => member.role === "OWNER")?.user.email ??
  restaurant.members[0]?.user.email ??
  "Workspace Owner";

const getMimeTypeForModel = (file: File) =>
  file.type ||
  (file.name.toLowerCase().endsWith(".gltf")
    ? "model/gltf+json"
    : "model/gltf-binary");

const createCrossSellItemId = () =>
  `cross-sell-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const toCrossSellPayload = (
  items: CrossSellComposerItem[],
): CrossSellItem[] =>
  items.reduce<CrossSellItem[]>((acc, item) => {
    const name = item.name.trim();
    if (name.length > 0) {
      acc.push({
        id: item.id || createCrossSellItemId(),
        name,
        price: Math.max(0, Math.round(Number(item.price))),
        imageUrl: item.imageUrl || item.imagePreviewUrl || null,
        imageStorageKey: item.imageStorageKey || null,
      });
    }
    return acc;
  }, []);

export function RestaurantWorkspace({
  restaurantId,
  portalVariant = "owner",
}: RestaurantWorkspaceProps) {
  const COMPOSER_CLOSE_ANIMATION_MS = 240;
  const router = useRouter();
  const session = useAuthSession({
    portalVariant,
    loginPath: getPortalLoginPath(portalVariant),
  });
  const [restaurant, setRestaurant] = useState<RestaurantDetails | null>(null);
  const [isLoadingRestaurant, setIsLoadingRestaurant] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("dishes");
  const [selectedMainMenuId, setSelectedMainMenuId] = useState("");
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);
  const [selectedMenuId, setSelectedMenuId] = useState("");
  const [isComposerVisible, setIsComposerVisible] = useState(false);
  const [isComposerClosing, setIsComposerClosing] = useState(false);
  const [composerState, setComposerState] =
    useState<ComposerState>(emptyComposerState);
  const [composerMessage, setComposerMessage] = useState<string | null>(null);
  const [isSavingDish, setIsSavingDish] = useState(false);
  const [qrState, setQrState] = useState<string | null>(null);
  const [isCopyingQr, setIsCopyingQr] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [settingsFormState, setSettingsFormState] =
    useState<SettingsFormState>(emptySettingsFormState);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [qrPreview, setQrPreview] = useState<RestaurantQrPayload | null>(null);
  const [isLoadingQrPreview, setIsLoadingQrPreview] = useState(false);
  const [menuComposerState, setMenuComposerState] = useState<MenuComposerState>(
    emptyMenuComposerState,
  );
  const [menuMessage, setMenuMessage] = useState<string | null>(null);
  const [isSavingMenu, setIsSavingMenu] = useState(false);
  const [teamComposerState, setTeamComposerState] = useState<TeamComposerState>(
    emptyTeamComposerState,
  );
  const [teamMessage, setTeamMessage] = useState<string | null>(null);
  const [isSavingMember, setIsSavingMember] = useState(false);
  const [composerModelFile, setComposerModelFile] = useState<File | null>(null);
  const [composerThumbnailFile, setComposerThumbnailFile] =
    useState<File | null>(null);
  const [composerAutoOptimize, setComposerAutoOptimize] = useState(true);
  const [composerProgress, setComposerProgress] = useState<string | null>(null);
  const [pendingDishActionId, setPendingDishActionId] = useState<string | null>(
    null,
  );
  const [pendingMenuActionId, setPendingMenuActionId] = useState<string | null>(
    null,
  );
  const [toasts, setToasts] = useState<WorkspaceToast[]>([]);
  const [dishSearchQuery, setDishSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [actionDialog, setActionDialog] = useState<WorkspaceActionDialog | null>(
    null,
  );
  const [isSubmittingActionDialog, setIsSubmittingActionDialog] = useState(false);

  useEffect(() => {
    if (session.status !== "authenticated") {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoadingRestaurant(true);
      setLoadError(null);

      try {
        const details = await fetchRestaurant(session.token, restaurantId);
        if (!cancelled) {
          setRestaurant(details);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load this workspace.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingRestaurant(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [restaurantId, session]);

  const refreshRestaurant = async (): Promise<RestaurantDetails | null> => {
    if (session.status !== "authenticated") {
      return null;
    }

    const details = await fetchRestaurant(session.token, restaurantId);
    setRestaurant(details);
    return details;
  };

  const sortedMainMenus = useMemo(
    () =>
      restaurant
        ? restaurant.menus.toSorted(
            (left, right) =>
              left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
          )
        : [],
    [restaurant],
  );

  const selectedMainMenu =
    sortedMainMenus.find((menu) => menu.id === selectedMainMenuId) ??
    sortedMainMenus[0] ??
    null;

  const sortedMenus = useMemo(
    () =>
      selectedMainMenu
        ? getMainMenuCategories(selectedMainMenu).toSorted(
            (left, right) =>
              left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
          )
        : [],
    [selectedMainMenu],
  );

  const menuSections = useMemo(
    () =>
      sortedMenus.map((menu) => ({
        ...menu,
        mainMenuId: selectedMainMenu?.id ?? "",
        mainMenuName: selectedMainMenu?.name ?? "Main Menu",
        dishes: menu.dishes.toSorted(
          (left, right) =>
            left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
        ),
      })),
    [selectedMainMenu, sortedMenus],
  );

  const allCategorySections = useMemo(
    () =>
      sortedMainMenus.flatMap((menu) =>
        getMainMenuCategories(menu)
          .toSorted(
            (left, right) =>
              left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
          )
          .map((category) => ({
            ...category,
            mainMenuId: menu.id,
            mainMenuName: menu.name,
            dishes: category.dishes.toSorted(
              (left, right) =>
                left.sortOrder - right.sortOrder ||
                left.name.localeCompare(right.name),
            ),
          })),
      ),
    [sortedMainMenus],
  );

  const dishRows = useMemo(() => flattenDishes(allCategorySections), [allCategorySections]);

  const selectedDish =
    dishRows.find((dish) => dish.id === selectedDishId) ?? dishRows[0] ?? null;

  useEffect(() => {
    if (!selectedDish && dishRows.length > 0) {
      setSelectedDishId(dishRows[0].id);
    }
  }, [dishRows, selectedDish]);

  useEffect(() => {
    if (sortedMainMenus.length === 0) {
      setSelectedMainMenuId("");
      return;
    }

    if (
      !selectedMainMenuId ||
      !sortedMainMenus.some((menu) => menu.id === selectedMainMenuId)
    ) {
      setSelectedMainMenuId(sortedMainMenus[0].id);
    }
  }, [selectedMainMenuId, sortedMainMenus]);

  useEffect(() => {
    if (sortedMenus.length === 0) {
      setSelectedMenuId("");
      return;
    }

    if (
      !selectedMenuId ||
      !sortedMenus.some((menu) => menu.id === selectedMenuId)
    ) {
      setSelectedMenuId(sortedMenus[0].id);
    }
  }, [selectedMenuId, sortedMenus]);

  useEffect(() => {
    if (!restaurant) {
      return;
    }

    setSettingsFormState({
      name: restaurant.name,
      publicId: sanitizePublicId(restaurant.publicId),
      isPublished: restaurant.isPublished,
    });
  }, [restaurant]);

  useEffect(() => {
    if (
      activeTab !== "settings" ||
      session.status !== "authenticated" ||
      !restaurant
    ) {
      return;
    }

    if (qrPreview?.publicId === restaurant.publicId) {
      return;
    }

    let cancelled = false;

    const loadQrPreview = async () => {
      setIsLoadingQrPreview(true);

      try {
        const payload = await generateRestaurantQr(session.token, restaurant.id);
        if (!cancelled) {
          setQrPreview(payload);
        }
      } catch (error) {
        if (!cancelled) {
          setSettingsMessage(
            error instanceof Error
              ? error.message
              : "Unable to load QR preview.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingQrPreview(false);
        }
      }
    };

    void loadQrPreview();

    return () => {
      cancelled = true;
    };
  }, [activeTab, qrPreview?.publicId, restaurant, session]);

  const openComposer = () => {
    setIsComposerClosing(false);
    setIsComposerVisible(true);
  };

  const closeComposer = () => {
    if (!isComposerVisible || isComposerClosing) {
      return;
    }

    setIsComposerClosing(true);
  };

  useEffect(() => {
    if (!isComposerClosing) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsComposerVisible(false);
      setIsComposerClosing(false);
    }, COMPOSER_CLOSE_ANIMATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [COMPOSER_CLOSE_ANIMATION_MS, isComposerClosing]);

  useEffect(() => {
    if (isComposerVisible) {
      return;
    }

    setComposerModelFile(null);
    setComposerThumbnailFile(null);
    setComposerAutoOptimize(true);
  }, [isComposerVisible]);

  useEffect(() => {
    if (!isComposerVisible && !actionDialog) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isComposerVisible) {
          closeComposer();
          return;
        }

        closeActionDialog();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [actionDialog, isComposerVisible, isSubmittingActionDialog]);

  const currentMembership =
    session.status === "authenticated"
      ? restaurant?.members.find((member) => member.user.id === session.user.id) ??
        null
      : null;
  const currentRole = currentMembership?.role ?? null;
  const isOwnerUser = currentRole === "OWNER";
  const effectivePortalVariant = portalVariant;
  const canManageMembers = isOwnerUser;
  const canManageSettings = isOwnerUser;
  const canUseShareTools = currentMembership !== null;
  const availableWorkspaceTabs =
    effectivePortalVariant === "owner"
      ? ownerWorkspaceTabs
      : managerWorkspaceTabs;

  useEffect(() => {
    if (activeTab === "team" && !isOwnerUser) {
      setActiveTab("settings");
    }
  }, [activeTab, isOwnerUser]);

  useEffect(() => {
    if (session.status !== "authenticated" || !restaurant) {
      return;
    }

    if (portalVariant === "owner" && !isOwnerUser) {
      router.replace(getWorkspacePath("manager", restaurantId));
      return;
    }

    if (portalVariant === "manager" && isOwnerUser) {
      router.replace(getWorkspacePath("owner", restaurantId));
    }
  }, [isOwnerUser, portalVariant, restaurant, restaurantId, router, session.status]);

  if (
    session.status === "authenticated" &&
    restaurant &&
    ((portalVariant === "owner" && !isOwnerUser) ||
      (portalVariant === "manager" && isOwnerUser))
  ) {
    return (
      <LoadingScreen
        message="Redirecting to the correct portal..."
        className="dashboard-shell"
      />
    );
  }

  if (session.status === "loading" || isLoadingRestaurant) {
    return (
      <LoadingScreen
        message="Loading workspace..."
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

  if (!restaurant || loadError) {
    return (
      <div className="dashboard-shell flex min-h-screen items-center justify-center">
        <div className="max-w-lg text-center">
          <p className="text-sm font-semibold text-red-600">
            {loadError ?? "Workspace data is unavailable."}
          </p>
          <p className="mt-2 text-sm text-[var(--dash-text-muted,#5a6660)]">
            Make sure this restaurant belongs to the logged-in account and try
            again from the dashboard.
          </p>
        </div>
      </div>
    );
  }

  const publishedDishesCount = dishRows.filter((dish) => dish.isPublished).length;
  const readyModelCount = dishRows.filter(
    (dish) => getAssetByKind(dish.assets, "MODEL_3D")?.status === "READY",
  ).length;
  const readinessPercent = buildReadinessPercent([
    allCategorySections.length > 0,
    publishedDishesCount > 0,
    readyModelCount > 0,
  ]);
  const editingDish =
    composerState.mode === "edit" && composerState.dishId
      ? dishRows.find((dish) => dish.id === composerState.dishId) ?? null
      : null;
  const editingModelAsset = editingDish
    ? getAssetByKind(editingDish.assets, "MODEL_3D")
    : undefined;
  const editingThumbnailAsset = editingDish
    ? getAssetByKind(editingDish.assets, "THUMBNAIL")
    : undefined;
  const editingPosterAsset = editingDish
    ? getAssetByKind(editingDish.assets, "POSTER")
    : undefined;
  const selectedMenu =
    menuSections.find((menu) => menu.id === selectedMenuId) ?? menuSections[0] ?? null;
  const ownerMember =
    restaurant.members.find((member) => member.role === "OWNER") ?? null;
  const assignedManager =
    restaurant.members.find((member) => member.role === "MANAGER") ?? null;

  const removeToast = (toastId: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== toastId));
  };

  const pushToast = (
    message: string,
    tone: WorkspaceToast["tone"] = "info",
  ) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => [...current, { id, tone, message }]);
    window.setTimeout(() => {
      removeToast(id);
    }, 4200);
  };

  const uploadPosterAssetForDish = async (
    dishId: string,
    posterFile: File,
  ): Promise<void> => {
    if (session.status !== "authenticated") {
      return;
    }

    const posterUpload = await createAssetUpload(session.token, {
      dishId,
      kind: "POSTER",
      fileName: posterFile.name,
      mimeType: posterFile.type || "image/webp",
      sizeBytes: posterFile.size,
    });

    await uploadFileToSignedUrl({
      signedUrl: posterUpload.upload.signedUrl,
      file: posterFile,
      mimeType: posterUpload.upload.headers["Content-Type"],
    });

    await completeAssetUpload(session.token, posterUpload.asset.id);
  };

  async function generateMissingPosters(
    dishes: DishRow[],
    options: { silent?: boolean } = {},
  ): Promise<void> {
    // Feature disabled — poster generation is now strictly server-side
    // or through the npm run posters:backfill command script.
    return;
  }

  const closeActionDialog = () => {
    if (isSubmittingActionDialog) {
      return;
    }

    setActionDialog(null);
  };

  const updateActionDialogValue = (value: string) => {
    setActionDialog((current) => {
      if (!current) {
        return current;
      }

      if (current.kind === "createMainMenu" || current.kind === "renameMainMenu") {
        return {
          ...current,
          value,
        };
      }

      return current;
    });
  };

  const handleSubmitActionDialog = async () => {
    if (session.status !== "authenticated" || !actionDialog) {
      return;
    }

    setIsSubmittingActionDialog(true);

    try {
      if (actionDialog.kind === "createMainMenu") {
        const name = actionDialog.value.trim();
        if (!name) {
          setMenuMessage("Main menu name is required.");
          return;
        }

        setMenuMessage(null);
        setPendingMenuActionId("main-menu:create");

        const createdMenu = await createMenu(session.token, restaurant.id, {
          name,
          isPublished: true,
          sortOrder: sortedMainMenus.length,
        });
        await refreshRestaurant();
        setSelectedMainMenuId(createdMenu.id);
        setSelectedMenuId("");
        pushToast(`${name} created as a main menu.`, "success");
        setActionDialog(null);
        return;
      }

      if (actionDialog.kind === "renameMainMenu") {
        const name = actionDialog.value.trim();
        if (!name || name === actionDialog.currentName) {
          setActionDialog(null);
          return;
        }

        setPendingMenuActionId(`${actionDialog.menuId}:rename`);
        setMenuMessage(null);

        await updateMenu(session.token, actionDialog.menuId, { name });
        await refreshRestaurant();
        pushToast("Main menu renamed.", "success");
        setActionDialog(null);
        return;
      }

      if (actionDialog.kind === "deleteMainMenu") {
        setPendingMenuActionId(`${actionDialog.menuId}:delete-main`);
        setMenuMessage(null);

        await deleteMenu(session.token, actionDialog.menuId);
        await refreshRestaurant();
        setSelectedMenuId("");
        pushToast(`${actionDialog.name} deleted.`, "success");
        setActionDialog(null);
        return;
      }

      if (actionDialog.kind === "deleteCategory") {
        setPendingMenuActionId(`${actionDialog.categoryId}:delete`);
        setMenuMessage(null);

        await deleteCategory(session.token, actionDialog.categoryId);
        await refreshRestaurant();

        if (menuComposerState.menuId === actionDialog.categoryId) {
          handleResetMenuComposer();
        }

        const successMessage = `${actionDialog.name} deleted.`;
        setMenuMessage(successMessage);
        pushToast(successMessage, "success");
        setActionDialog(null);
        return;
      }

      if (actionDialog.kind === "deleteDish") {
        setPendingDishActionId(`${actionDialog.dishId}:delete`);
        setComposerMessage(null);

        await deleteDish(session.token, actionDialog.dishId);
        await refreshRestaurant();

        if (composerState.dishId === actionDialog.dishId) {
          setComposerState(emptyComposerState);
          closeComposer();
        }

        const successMessage = `${actionDialog.name} deleted.`;
        setComposerMessage(successMessage);
        pushToast(successMessage, "success");
        setActionDialog(null);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to complete this action.";

      if (
        actionDialog.kind === "createMainMenu" ||
        actionDialog.kind === "renameMainMenu" ||
        actionDialog.kind === "deleteMainMenu" ||
        actionDialog.kind === "deleteCategory"
      ) {
        setMenuMessage(message);
      } else {
        setComposerMessage(message);
      }

      pushToast(message, "error");
    } finally {
      setPendingDishActionId((current) =>
        current && current.includes(":delete") ? null : current,
      );
      setPendingMenuActionId((current) =>
        current &&
        (current === "main-menu:create" ||
          current.includes(":rename") ||
          current.includes(":delete"))
          ? null
          : current,
      );
      setIsSubmittingActionDialog(false);
    }
  };

  const handleStartCreate = () => {
    setComposerState({
      ...emptyComposerState,
      sortOrder: (selectedMenu?.dishes.length ?? 0).toString(),
    });
    setComposerMessage(null);
    setComposerModelFile(null);
    setComposerThumbnailFile(null);
    setComposerAutoOptimize(true);
    openComposer();
  };

  const handleStartEdit = (dish: DishRow) => {
    setSelectedDishId(dish.id);
    setSelectedMainMenuId(dish.mainMenuId);
    setSelectedMenuId(dish.menuId);
    setComposerState({
      mode: "edit",
      dishId: dish.id,
      name: dish.name,
      price: dish.price.toString(),
      currency: dish.currency,
      description: dish.description ?? "",
      badgeLabel: dish.badgeLabel ?? "",
      servingSize: dish.servingSize?.toString() ?? "2",
      sortOrder: dish.sortOrder.toString(),
      detailsPanelEnabled: dish.detailsPanelEnabled ?? true,
      crossSellItems: (dish.crossSellItems ?? []).map((item) => ({
        ...item,
        imageFile: null,
        imagePreviewUrl: item.imageUrl,
      })),
      isPublished: dish.isPublished,
      dietaryType: dish.dietaryType ?? null,
    });
    setComposerMessage(null);
    setComposerModelFile(null);
    setComposerThumbnailFile(null);
    setComposerAutoOptimize(true);
    openComposer();
  };

  const uploadComposerAssets = async (dishId: string) => {
    if (session.status !== "authenticated") {
      return;
    }

    if (composerModelFile) {
      setComposerProgress("Uploading 3D model...");
      const modelUpload = await createAssetUpload(session.token, {
        dishId,
        kind: "MODEL_3D",
        fileName: composerModelFile.name,
        mimeType: getMimeTypeForModel(composerModelFile),
        sizeBytes: composerModelFile.size,
      });

      await uploadFileToSignedUrl({
        signedUrl: modelUpload.upload.signedUrl,
        file: composerModelFile,
        mimeType: modelUpload.upload.headers["Content-Type"],
      });
      await completeAssetUpload(session.token, modelUpload.asset.id);
    }

    if (composerThumbnailFile) {
      setComposerProgress("Uploading thumbnail...");
      const thumbnailUpload = await createAssetUpload(session.token, {
        dishId,
        kind: "THUMBNAIL",
        fileName: composerThumbnailFile.name,
        mimeType: composerThumbnailFile.type || "image/png",
        sizeBytes: composerThumbnailFile.size,
      });

      await uploadFileToSignedUrl({
        signedUrl: thumbnailUpload.upload.signedUrl,
        file: composerThumbnailFile,
        mimeType: thumbnailUpload.upload.headers["Content-Type"],
      });
      await completeAssetUpload(session.token, thumbnailUpload.asset.id);
    }
  };

  const uploadCrossSellItemImages = async (
    dishId: string,
  ): Promise<CrossSellItem[]> => {
    if (session.status !== "authenticated") {
      return toCrossSellPayload(composerState.crossSellItems);
    }

    const uploadedItems: CrossSellComposerItem[] = [];

    for (const item of composerState.crossSellItems) {
      if (!item.name.trim()) {
        continue;
      }

      let imageUrl = item.imageUrl;
      let imageStorageKey = item.imageStorageKey;

      if (item.imageFile) {
        setComposerProgress(`Uploading ${item.name.trim()} image...`);
        const upload = await createAssetUpload(session.token, {
          dishId,
          kind: "CROSS_SELL_IMAGE",
          fileName: item.imageFile.name,
          mimeType: item.imageFile.type || "image/png",
          sizeBytes: item.imageFile.size,
        });

        await uploadFileToSignedUrl({
          signedUrl: upload.upload.signedUrl,
          file: item.imageFile,
          mimeType: upload.upload.headers["Content-Type"],
        });

        const completed = await completeAssetUpload(session.token, upload.asset.id);
        imageUrl = completed.asset.publicUrl;
        imageStorageKey = upload.upload.storageKey;
      }

      uploadedItems.push({
        ...item,
        imageUrl: imageUrl ?? null,
        imageStorageKey: imageStorageKey ?? null,
        imageFile: null,
        imagePreviewUrl: imageUrl ?? null,
      });
    }

    return toCrossSellPayload(uploadedItems);
  };

  const handleSubmitDish = async () => {
    if (session.status !== "authenticated") {
      return;
    }

    const name = composerState.name.trim();
    const priceValue = Number(composerState.price);
    const servingSizeValue = Number(composerState.servingSize);
    const sortOrderValue = Number(composerState.sortOrder);

    if (!name) {
      setComposerMessage("Dish name is required.");
      return;
    }

    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      setComposerMessage("Price must be a valid number.");
      return;
    }

    if (!Number.isInteger(servingSizeValue) || servingSizeValue < 1) {
      setComposerMessage("Good for must be at least 1 person.");
      return;
    }

    if (!Number.isInteger(sortOrderValue) || sortOrderValue < 0) {
      setComposerMessage("Public display order must be 0 or higher.");
      return;
    }

    const invalidCrossSellItem = composerState.crossSellItems.find(
      (item) =>
        item.name.trim() &&
        (!Number.isFinite(Number(item.price)) || Number(item.price) < 0),
    );
    if (invalidCrossSellItem) {
      setComposerMessage("Serve-with item prices must be valid numbers.");
      return;
    }

    setIsSavingDish(true);
    setComposerMessage(null);
    setComposerProgress("Saving dish details...");

    try {
      let menuId = selectedMenuId;
      let dishId = composerState.dishId;

      if (!selectedMainMenu) {
        setComposerMessage("Create a main menu first.");
        return;
      }

      if (!menuId) {
        const createdMenu = await createCategory(session.token, selectedMainMenu.id, {
          name: "General",
          isPublished: true,
          sortOrder: 0,
        });
        menuId = createdMenu.id;
        setSelectedMenuId(menuId);
      }

      if (composerState.mode === "edit" && composerState.dishId) {
        const updatedDish = await updateDish(session.token, composerState.dishId, {
          menuId,
          name,
          price: Math.round(priceValue),
          currency: composerState.currency,
          description: composerState.description.trim() || undefined,
          badgeLabel: composerState.badgeLabel.trim() || null,
          servingSize: servingSizeValue,
          detailsPanelEnabled: composerState.detailsPanelEnabled,
          isPublished: composerState.isPublished,
          sortOrder: sortOrderValue,
          dietaryType: composerState.dietaryType,
        });
        if (updatedDish.servingSize !== servingSizeValue) {
          throw new Error("Serving size was not saved. Restart the backend and try again.");
        }
        if (updatedDish.detailsPanelEnabled !== composerState.detailsPanelEnabled) {
          throw new Error("Card details toggle was not saved. Restart the backend and try again.");
        }
        setSelectedDishId(composerState.dishId);
      } else {
        const createdDish = await createDish(session.token, menuId, {
          name,
          price: Math.round(priceValue),
          currency: composerState.currency,
          description: composerState.description.trim() || undefined,
          badgeLabel: composerState.badgeLabel.trim() || undefined,
          servingSize: servingSizeValue,
          detailsPanelEnabled: composerState.detailsPanelEnabled,
          isPublished: composerState.isPublished,
          sortOrder: sortOrderValue,
          dietaryType: composerState.dietaryType,
        });
        if (createdDish.servingSize !== servingSizeValue) {
          throw new Error("Serving size was not saved. Restart the backend and try again.");
        }
        if (createdDish.detailsPanelEnabled !== composerState.detailsPanelEnabled) {
          throw new Error("Card details toggle was not saved. Restart the backend and try again.");
        }
        dishId = createdDish.id;
        setSelectedDishId(createdDish.id);
      }

      if (dishId) {
        await uploadComposerAssets(dishId);
        const crossSellItems = await uploadCrossSellItemImages(dishId);
        await updateDish(session.token, dishId, {
          crossSellItems,
        });
      }

      setComposerProgress("Refreshing workspace...");
      await refreshRestaurant();
      setComposerState(emptyComposerState);
      closeComposer();
      const successMessage = composerAutoOptimize
        ? "Dish saved and files processed successfully."
        : "Dish saved successfully.";
      setComposerMessage(successMessage);
      pushToast(successMessage, "success");
    } catch (error) {
      await refreshRestaurant().catch(() => undefined);
      const message =
        error instanceof Error ? error.message : "Unable to save dish.";
      setComposerMessage(message);
      pushToast(message, "error");
    } finally {
      setIsSavingDish(false);
      setComposerProgress(null);
    }
  };

  const handleToggleDishStatus = async (dish: DishRow) => {
    if (session.status !== "authenticated") {
      return;
    }

    setComposerMessage(null);
    setPendingDishActionId(`${dish.id}:status`);

    try {
      await updateDish(session.token, dish.id, {
        isPublished: !dish.isPublished,
      });
      await refreshRestaurant();
      const successMessage = dish.isPublished
        ? `${dish.name} moved to draft.`
        : `${dish.name} is now live.`;
      setComposerMessage(successMessage);
      pushToast(successMessage, "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update dish status.";
      setComposerMessage(message);
      pushToast(message, "error");
    } finally {
      setPendingDishActionId(null);
    }
  };

  const handleDeleteDish = async (dish: DishRow) => {
    setActionDialog({
      kind: "deleteDish",
      dishId: dish.id,
      name: dish.name,
    });
  };

  const loadQrPayload = async (): Promise<RestaurantQrPayload | null> => {
    if (session.status !== "authenticated") {
      return null;
    }

    setIsLoadingQrPreview(true);

    try {
      const payload = await generateRestaurantQr(session.token, restaurant.id);
      setQrPreview(payload);
      return payload;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load QR preview.";
      setSettingsMessage(message);
      setQrState(message);
      return null;
    } finally {
      setIsLoadingQrPreview(false);
    }
  };

  const triggerDownload = (
    href: string,
    fileName: string,
    options: { downloadAttribute?: boolean } = {},
  ) => {
    const anchor = document.createElement("a");
    anchor.href = href;
    if (options.downloadAttribute ?? true) {
      anchor.download = fileName;
    } else {
      anchor.target = "_blank";
      anchor.rel = "noreferrer";
    }
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  };

  const downloadSvg = (svgContent: string, fileName: string) => {
    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    triggerDownload(objectUrl, fileName);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  };

  const handleCopyQr = async () => {
    if (session.status !== "authenticated") {
      return;
    }

    setIsCopyingQr(true);
    setQrState(null);

    try {
      const qr = (await loadQrPayload()) ?? qrPreview;
      if (!qr) {
        return;
      }
      await navigator.clipboard.writeText(qr.publicUrl);
      const message = "Public URL copied. Share it with guests or print the QR.";
      setQrState(message);
      pushToast(message, "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to copy the QR link.";
      setQrState(message);
      pushToast(message, "error");
    } finally {
      setIsCopyingQr(false);
    }
  };

  const handleDownloadQr = async (format: "png" | "svg") => {
    const qr = qrPreview ?? (await loadQrPayload());
    if (!qr) {
      return;
    }

    const fileBaseName = `${settingsFormState.publicId || restaurant.publicId}-qr`;

    if (format === "png") {
      triggerDownload(qr.qrCodeDataUrl, `${fileBaseName}.png`);
      setSettingsMessage("QR downloaded as PNG.");
      pushToast("QR downloaded as PNG.", "success");
      return;
    }

    downloadSvg(qr.qrCodeSvg, `${fileBaseName}.svg`);
    setSettingsMessage("QR downloaded as SVG.");
    pushToast("QR downloaded as SVG.", "success");
  };

  const handleOpenPublicPage = async () => {
    const qr = qrPreview ?? (await loadQrPayload());
    if (!qr) {
      return;
    }

    triggerDownload(qr.publicUrl, "", { downloadAttribute: false });
  };

  const handlePublishWorkspace = async () => {
    if (session.status !== "authenticated") {
      return;
    }

    if (!isOwnerUser) {
      const message = "Only the top-level owner can publish the workspace.";
      setPublishMessage(message);
      pushToast(message, "error");
      return;
    }

    setIsPublishing(true);
    setPublishMessage(null);

    try {
      await updateRestaurant(session.token, restaurant.id, {
        isPublished: true,
      });
      await refreshRestaurant();
      const successMessage = "Workspace is now live for public QR access.";
      setPublishMessage(successMessage);
      pushToast(successMessage, "success");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to publish this workspace.";
      setPublishMessage(message);
      pushToast(message, "error");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSubmitSettings = async () => {
    if (session.status !== "authenticated") {
      return;
    }

    if (!canManageSettings) {
      setSettingsMessage("Only the top-level owner can update workspace settings.");
      return;
    }

    const name = settingsFormState.name.trim();
    const publicId = sanitizePublicId(settingsFormState.publicId);

    if (!name) {
      setSettingsMessage("Restaurant name is required.");
      return;
    }

    if (!publicId) {
      setSettingsMessage("Public slug is required.");
      return;
    }

    setIsSavingSettings(true);
    setSettingsMessage(null);

    try {
      await updateRestaurant(session.token, restaurant.id, {
        name,
        publicId,
        isPublished: settingsFormState.isPublished,
      });
      setSettingsFormState((current) => ({
        ...current,
        publicId,
      }));
      await refreshRestaurant();
      setQrPreview(null);
      setSettingsMessage("Workspace settings updated.");
      pushToast("Workspace settings updated.", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save workspace settings.";
      setSettingsMessage(message);
      pushToast(message, "error");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleCreateMainMenu = async () => {
    if (sortedMainMenus.length > 0) {
      const message =
        "This workspace already has a main menu. Rename the existing main menu instead.";
      setMenuMessage(message);
      pushToast(message, "info");
      return;
    }

    setActionDialog({
      kind: "createMainMenu",
      value: "Main Menu",
    });
  };

  const handleRenameMainMenu = async () => {
    if (!selectedMainMenu) {
      return;
    }

    setActionDialog({
      kind: "renameMainMenu",
      menuId: selectedMainMenu.id,
      currentName: selectedMainMenu.name,
      value: selectedMainMenu.name,
    });
  };

  const handleDeleteMainMenu = async () => {
    if (!selectedMainMenu) {
      return;
    }

    if (getMainMenuCategories(selectedMainMenu).length > 0) {
      const message =
        "Delete or move categories out of this main menu before removing it.";
      setMenuMessage(message);
      pushToast(message, "error");
      return;
    }

    setActionDialog({
      kind: "deleteMainMenu",
      menuId: selectedMainMenu.id,
      name: selectedMainMenu.name,
    });
  };

  const handleStartCreateMenu = () => {
    setActiveTab("menus");
    setMenuComposerState({
      ...emptyMenuComposerState,
      sortOrder: sortedMenus.length.toString(),
    });
    setMenuMessage(null);
  };

  const handleStartEditMenu = (menu: CategorySummary) => {
    setActiveTab("menus");
    setSelectedMenuId(menu.id);
    setMenuComposerState({
      mode: "edit",
      menuId: menu.id,
      name: menu.name,
      isPublished: menu.isPublished,
      sortOrder: menu.sortOrder.toString(),
    });
    setMenuMessage(null);
  };

  const handleResetMenuComposer = () => {
    setMenuComposerState({
      ...emptyMenuComposerState,
      sortOrder: sortedMenus.length.toString(),
    });
    setMenuMessage(null);
  };

  const handleSubmitMenu = async () => {
    if (session.status !== "authenticated") {
      return;
    }

    const name = menuComposerState.name.trim();
    const sortOrderValue = Number(menuComposerState.sortOrder);

    if (!name) {
      setMenuMessage("Category name is required.");
      return;
    }

    if (!Number.isInteger(sortOrderValue) || sortOrderValue < 0) {
      setMenuMessage("Sort order must be a whole number.");
      return;
    }

    setIsSavingMenu(true);
    setMenuMessage(null);

    try {
      const successMessage =
        menuComposerState.mode === "edit"
          ? "Category updated."
          : "Category created.";

      if (menuComposerState.mode === "edit" && menuComposerState.menuId) {
        await updateCategory(session.token, menuComposerState.menuId, {
          name,
          isPublished: menuComposerState.isPublished,
          sortOrder: sortOrderValue,
        });
      } else {
        if (!selectedMainMenu) {
          setMenuMessage("Create a main menu first.");
          return;
        }

        const createdMenu = await createCategory(session.token, selectedMainMenu.id, {
          name,
          isPublished: menuComposerState.isPublished,
          sortOrder: sortOrderValue,
        });
        setSelectedMenuId(createdMenu.id);
      }

      await refreshRestaurant();
      handleResetMenuComposer();
      setMenuMessage(successMessage);
      pushToast(successMessage, "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save this category.";
      setMenuMessage(message);
      pushToast(message, "error");
    } finally {
      setIsSavingMenu(false);
    }
  };

  const handleToggleMenuStatus = async (menu: CategorySummary) => {
    if (session.status !== "authenticated") {
      return;
    }

    setMenuMessage(null);
    setPendingMenuActionId(`${menu.id}:status`);

    try {
      await updateCategory(session.token, menu.id, {
        isPublished: !menu.isPublished,
      });
      await refreshRestaurant();
      const successMessage = menu.isPublished
        ? `${menu.name} moved to draft.`
        : `${menu.name} published.`;
      setMenuMessage(successMessage);
      pushToast(successMessage, "success");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to update this category.";
      setMenuMessage(message);
      pushToast(message, "error");
    } finally {
      setPendingMenuActionId(null);
    }
  };

  const handleMoveMenu = async (menuId: string, direction: "up" | "down") => {
    if (session.status !== "authenticated") {
      return;
    }

    const currentIndex = sortedMenus.findIndex((menu) => menu.id === menuId);
    if (currentIndex < 0) {
      return;
    }

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sortedMenus.length) {
      return;
    }

    const currentMenu = sortedMenus[currentIndex];
    const targetMenu = sortedMenus[targetIndex];

    setMenuMessage(null);
    setPendingMenuActionId(`${menuId}:${direction}`);

    try {
      await updateCategory(session.token, currentMenu.id, {
        sortOrder: targetMenu.sortOrder,
      });
      await updateCategory(session.token, targetMenu.id, {
        sortOrder: currentMenu.sortOrder,
      });
      await refreshRestaurant();
      pushToast("Menu order updated.", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to reorder categories.";
      setMenuMessage(message);
      pushToast(message, "error");
    } finally {
      setPendingMenuActionId(null);
    }
  };

  const handleDeleteMenu = async (menu: CategorySummary) => {
    if (menu.dishes.length > 0) {
      const message =
        "Delete or move dishes out of this category before removing it.";
      setMenuMessage(message);
      pushToast(message, "error");
      return;
    }

    setActionDialog({
      kind: "deleteCategory",
      categoryId: menu.id,
      name: menu.name,
    });
  };

  const handleStartManagerAccess = (
    member?: RestaurantDetails["members"][number],
  ) => {
    setActiveTab("team");
    setTeamComposerState(
      member
        ? {
            email: member.user.email,
            password: "",
            name: member.user.name || "",
            mobile: member.user.mobile || "",
            profilePic: member.user.profilePicUrl || "",
            restaurantAddress: restaurant.address || "",
            isOpen: true,
            mode: "edit",
          }
        : {
            ...emptyTeamComposerState,
            restaurantAddress: restaurant.address || "",
            isOpen: true,
          },
    );
    setTeamMessage(null);
  };

  const handleSubmitMember = async () => {
    if (session.status !== "authenticated") {
      return;
    }

    if (!canManageMembers) {
      setTeamMessage(
        "Only the company owner can create or update manager credentials.",
      );
      return;
    }

    const email = teamComposerState.email.trim().toLowerCase();
    if (!email) {
      setTeamMessage("Manager email is required.");
      return;
    }

    const password = teamComposerState.password.trim();
    if (!password) {
      setTeamMessage("Manager password is required.");
      return;
    }

    setIsSavingMember(true);
    setTeamMessage(null);

    try {
      await updateRestaurant(session.token, restaurant.id, {
        address: teamComposerState.restaurantAddress.trim() || undefined,
      });

      const payload = await createRestaurantManagerAccount(
        session.token,
        restaurant.id,
        {
          email,
          password,
          name: teamComposerState.name.trim() || undefined,
          mobile: teamComposerState.mobile.trim() || undefined,
          profilePic: teamComposerState.profilePic.trim() || undefined,
        },
      );
      await refreshRestaurant();
      setTeamComposerState({
        email: payload.membership.user.email,
        password: "",
        name: payload.membership.user.name || "",
        mobile: payload.membership.user.mobile || "",
        profilePic: payload.membership.user.profilePicUrl || "",
        restaurantAddress: teamComposerState.restaurantAddress,
        isOpen: false,
        mode: "edit",
      });
      const successMessage = payload.createdUser
        ? "Manager account created. The manager can now sign in from the manager portal."
        : "Manager credentials updated. The latest password is now active.";
      setTeamMessage(successMessage);
      pushToast(successMessage, "success");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to save manager access.";
      setTeamMessage(message);
      pushToast(message, "error");
    } finally {
      setIsSavingMember(false);
    }
  };

  const renderTeamSection = () => (
    <section className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
      <div className="rounded-[1.7rem] border border-slate-100 bg-white p-6 shadow-[0_16px_36px_rgba(18,28,42,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-[-0.03em] text-on-surface">
              Restaurant Access
            </h2>
            <p className="mt-1 text-sm font-medium text-on-surface-variant">
              The company owner controls this restaurant and creates one manager
              login for daily menu operations.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleStartManagerAccess(assignedManager ?? undefined)}
            disabled={!canManageMembers}
            className="rounded-[1rem] bg-gradient-to-br from-primary to-primary-container px-5 py-3 text-sm font-bold text-white shadow-[0_14px_28px_rgba(182,23,34,0.18)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {assignedManager ? "Reset Manager Login" : "Create Manager Login"}
          </button>
        </div>

        <div className="mt-6 grid gap-4">
          {ownerMember ? (
            <div className="rounded-[1.3rem] border border-slate-100 bg-surface-container-low p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-surface-container-high text-sm font-bold text-primary">
                    {ownerMember.user.email.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-on-surface">
                      {ownerMember.user.email}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                        Company Owner
                      </span>
                      {ownerMember.user.id === session.user.id ? (
                        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">
                          You
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <span className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">
                  Full Access
                </span>
              </div>

              {editingPosterAsset ? (
                <div className="md:col-span-2 rounded-[1rem] border border-primary/12 bg-primary/4 px-4 py-3 text-xs font-semibold text-on-surface-variant">
                  Poster asset status:
                  <span className="ml-2 inline-flex rounded-full bg-success/12 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.22em] text-success">
                    {editingPosterAsset.status}
                  </span>
                </div>
              ) : composerModelFile ? (
                <div className="md:col-span-2 rounded-[1rem] border border-primary/12 bg-primary/4 px-4 py-3 text-xs font-semibold text-on-surface-variant">
                  A poster will be generated automatically from this 3D model when
                  you save the dish.
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-[1.3rem] border border-slate-100 bg-surface-container-low p-5">
            {assignedManager ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-sky-100 to-sky-50 text-sm font-bold text-sky-700">
                    {assignedManager.user.email.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-on-surface">
                      {assignedManager.user.email}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-sky-700">
                        Restaurant Manager
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">
                        1 restaurant assigned
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleStartManagerAccess(assignedManager)}
                  disabled={!canManageMembers}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant transition-colors hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Edit Login
                </button>
              </div>
            ) : (
              <div className="rounded-[1rem] border border-dashed border-slate-200 bg-white/65 p-4">
                <p className="text-sm font-bold text-on-surface">
                  No manager account assigned yet
                </p>
                <p className="mt-1 text-sm text-on-surface-variant">
                  Create one manager login for this restaurant. That manager
                  will only use the restaurant manager portal.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

    </section>
  );

  const renderQrAccessCard = () => (
    <div className="rounded-[1.7rem] border border-slate-100 bg-white p-6 shadow-[0_16px_36px_rgba(18,28,42,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
            QR Access
          </p>
          <h3 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-on-surface">
            Guest entry tools
          </h3>
        </div>

        <button
          type="button"
          onClick={() => void loadQrPayload()}
          className="text-sm font-bold text-on-surface-variant transition-colors hover:text-primary"
        >
          Refresh
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-[1.5rem] bg-surface-container-low p-5">
        <div className="flex min-h-64 items-center justify-center rounded-[1.25rem] bg-white p-4">
          {isLoadingQrPreview ? (
            <div className="spinner-sm border-primary/30 border-t-primary" />
          ) : qrPreview?.qrCodeDataUrl ? (
            <img
              src={qrPreview.qrCodeDataUrl}
              alt={`QR code for ${restaurant.name}`}
              className="h-52 w-52 rounded-[1rem]"
            />
          ) : (
            <div className="text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-5xl">
                qr_code_2
              </span>
              <p className="mt-3 text-sm font-medium">QR preview loads here</p>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-[1rem] bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
            Public Destination
          </p>
          <p className="mt-2 break-all text-sm font-semibold text-on-surface">
            {qrPreview?.publicUrl ?? `/r/${settingsFormState.publicId}`}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={handleCopyQr}
          disabled={isCopyingQr || !canUseShareTools}
          className="rounded-[1rem] bg-surface-container-low px-4 py-3 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isCopyingQr ? "Copying..." : "Copy Public Link"}
        </button>
        <button
          type="button"
          onClick={() => void handleDownloadQr("png")}
          disabled={!canUseShareTools}
          className="rounded-[1rem] bg-surface-container-low px-4 py-3 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-70"
        >
          Download PNG
        </button>
        <button
          type="button"
          onClick={() => void handleDownloadQr("svg")}
          disabled={!canUseShareTools}
          className="rounded-[1rem] bg-surface-container-low px-4 py-3 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-70"
        >
          Download SVG
        </button>
        <button
          type="button"
          onClick={() => void handleOpenPublicPage()}
          disabled={!canUseShareTools}
          className="rounded-[1rem] bg-gradient-to-br from-primary to-primary-container px-4 py-3 text-sm font-bold text-white shadow-[0_14px_28px_rgba(182,23,34,0.18)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
        >
          Open Public Page
        </button>
      </div>
    </div>
  );

  const renderMainContent = () => {
    if (activeTab === "menus") {
      const hasMainMenu = sortedMainMenus.length > 0;

      return (
        <section className="grid items-start gap-6 xl:grid-cols-[1.55fr_1fr_auto]">
          <div className="rounded-[1.7rem] border border-slate-100 bg-white p-6 shadow-[0_16px_36px_rgba(18,28,42,0.05)]">
            <div className="rounded-[1.35rem] bg-surface-container-low p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                Main Menu Layer
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {sortedMainMenus.length === 0 ? (
                  <span className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-on-surface-variant shadow-[0_8px_20px_rgba(18,28,42,0.04)]">
                    No main menus yet
                  </span>
                ) : (
                  sortedMainMenus.map((menu) => (
                    <button
                      key={menu.id}
                      type="button"
                      onClick={() => setSelectedMainMenuId(menu.id)}
                      className={cn(
                        "rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] transition-all",
                        selectedMainMenu?.id === menu.id
                          ? "bg-primary text-white shadow-[0_10px_20px_rgba(182,23,34,0.18)]"
                          : "bg-white text-on-surface-variant shadow-[0_8px_20px_rgba(18,28,42,0.04)]",
                      )}
                    >
                      {menu.name}
                    </button>
                  ))
                )}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold tracking-[-0.03em] text-on-surface">
                    {selectedMainMenu?.name ?? "Create a main menu"}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-on-surface-variant">
                    Main menus hold categories like Pizza, Chicken, Drinks, or
                    Desserts. Each category then holds the actual dish items and prices.
                  </p>
                </div>

                <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant shadow-[0_8px_20px_rgba(18,28,42,0.04)]">
                  {menuSections.length} categor{menuSections.length === 1 ? "y" : "ies"}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {!hasMainMenu ? (
                  <button
                    type="button"
                    onClick={() => void handleCreateMainMenu()}
                    className="rounded-[1rem] bg-gradient-to-br from-primary to-primary-container px-5 py-3 text-sm font-bold text-white shadow-[0_14px_28px_rgba(182,23,34,0.18)] transition-transform hover:-translate-y-0.5"
                  >
                    Create Main Menu
                  </button>
                ) : (
                  <div className="rounded-[1rem] bg-white px-5 py-3 text-sm font-bold text-on-surface-variant shadow-[0_8px_20px_rgba(18,28,42,0.04)]">
                    One main menu per workspace
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => void handleRenameMainMenu()}
                  disabled={!selectedMainMenu || pendingMenuActionId !== null}
                  className="rounded-[1rem] border border-slate-200 px-5 py-3 text-sm font-bold text-on-surface-variant transition-colors hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Rename Main Menu
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteMainMenu()}
                  disabled={!selectedMainMenu || pendingMenuActionId !== null}
                  className="rounded-[1rem] border border-slate-200 px-5 py-3 text-sm font-bold text-on-surface-variant transition-colors hover:border-red-300 hover:text-error disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Delete Main Menu
                </button>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-[-0.03em] text-on-surface">
                  Category Builder
                </h2>
                <p className="mt-1 text-sm font-medium text-on-surface-variant">
                  Add sub categories inside the selected main menu, then place
                  dish items under each one.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleStartCreateMenu}
                  disabled={!selectedMainMenu}
                  className="rounded-[1rem] bg-gradient-to-br from-primary to-primary-container px-5 py-3 text-sm font-bold text-white shadow-[0_14px_28px_rgba(182,23,34,0.18)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                >
                  Add Category
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedMenuId || menuSections.length > 0) {
                      if (!selectedMenuId && menuSections.length > 0) {
                        setSelectedMenuId(menuSections[0].id);
                      }
                      handleStartCreate();
                    }
                  }}
                  disabled={!selectedMainMenu || menuSections.length === 0}
                  className="rounded-[1rem] border border-slate-200 px-5 py-3 text-sm font-bold text-on-surface-variant transition-all hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
                >
                  + Add New Dish
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              {menuSections.length === 0 ? (
                <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-surface-container-low px-5 py-8 text-center">
                  <p className="text-sm font-bold text-on-surface">
                    {selectedMainMenu
                      ? "No categories inside this main menu yet"
                      : "Create a main menu first"}
                  </p>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    {selectedMainMenu
                      ? "Create your first category, like Pizza or Drinks, to start structuring this menu."
                      : "Once a main menu exists, you can add sub categories like Pizza, Chicken, Drinks, or Desserts."}
                  </p>
                </div>
              ) : (
                menuSections.map((menu, index) => (
                  <div
                    key={menu.id}
                    className={cn(
                      "rounded-[1.35rem] border p-5 transition-all",
                      selectedMenuId === menu.id
                        ? "border-primary/18 bg-primary/4"
                        : "border-slate-100 bg-white",
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-on-surface">
                            {menu.name}
                          </h3>
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]",
                              menu.isPublished
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-slate-100 text-slate-500",
                            )}
                          >
                            {menu.isPublished ? "Published" : "Draft"}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-on-surface-variant">
                          {menu.dishes.length} dish{menu.dishes.length === 1 ? "" : "es"} assigned
                          {" · "}order slot {menu.sortOrder}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleMoveMenu(menu.id, "up")}
                          disabled={index === 0 || pendingMenuActionId !== null}
                          className="material-symbols-outlined rounded-full border border-slate-200 p-2 text-on-surface-variant transition-colors hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          arrow_upward
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveMenu(menu.id, "down")}
                          disabled={
                            index === menuSections.length - 1 ||
                            pendingMenuActionId !== null
                          }
                          className="material-symbols-outlined rounded-full border border-slate-200 p-2 text-on-surface-variant transition-colors hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          arrow_downward
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEditMenu(menu)}
                          disabled={pendingMenuActionId === `${menu.id}:delete`}
                          className="material-symbols-outlined rounded-full border border-slate-200 p-2 text-on-surface-variant transition-colors hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-35"
                          title="Edit category"
                        >
                          edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteMenu(menu)}
                          disabled={pendingMenuActionId === `${menu.id}:delete`}
                          className="material-symbols-outlined rounded-full border border-slate-200 p-2 text-on-surface-variant transition-colors hover:border-red-300 hover:text-error disabled:cursor-not-allowed disabled:opacity-35"
                          title="Delete category"
                        >
                          delete
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setExpandedCategories((prev) => {
                              const next = new Set(prev);
                              if (next.has(menu.id)) {
                                next.delete(menu.id);
                              } else {
                                next.add(menu.id);
                              }
                              return next;
                            });
                          }}
                          className="material-symbols-outlined rounded-full border border-slate-200 p-2 text-on-surface-variant transition-colors hover:border-primary/30 hover:text-primary"
                          title={expandedCategories.has(menu.id) ? "Collapse" : "Expand"}
                        >
                          {expandedCategories.has(menu.id) ? "expand_less" : "expand_more"}
                        </button>
                      </div>
                    </div>

                    {expandedCategories.has(menu.id) && (
                    <>
                    <div className="mt-4 overflow-hidden rounded-[1.15rem] border border-slate-100 bg-surface-container-lowest">
                      <div className="grid grid-cols-[minmax(0,1.5fr)_auto_auto_auto] gap-3 border-b border-slate-100 px-4 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                        <span>Item</span>
                        <span>Price</span>
                        <span>Status</span>
                        <span></span>
                      </div>

                      {menu.dishes.length === 0 ? (
                        <div className="p-4 text-sm text-on-surface-variant">
                          No items in this category yet.
                        </div>
                      ) : (
                        menu.dishes.map((dish) => (
                          <div
                            key={dish.id}
                            className="grid w-full grid-cols-[minmax(0,1.5fr)_auto_auto_auto] items-center gap-3 border-t border-slate-100 px-4 py-3 text-left transition-colors first:border-t-0 hover:bg-slate-50"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                handleStartEdit({
                                  ...dish,
                                  mainMenuId: menu.mainMenuId,
                                  mainMenuName: menu.mainMenuName,
                                  menuId: menu.id,
                                  menuName: menu.name,
                                })
                              }
                              className="min-w-0 text-left"
                            >
                              <span className="block truncate text-sm font-semibold text-on-surface">
                                {dish.name}
                              </span>
                              <span className="mt-1 block truncate text-xs text-on-surface-variant">
                                {dish.description || "No description yet"}
                              </span>
                            </button>
                            <span className="self-center text-sm font-bold text-on-surface">
                              {formatPrice(dish.price, dish.currency)}
                            </span>
                            <span
                              className={cn(
                                "self-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]",
                                dish.isPublished
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-slate-100 text-slate-500",
                              )}
                            >
                              {dish.isPublished ? "Live" : "Draft"}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                void handleDeleteDish({
                                  ...dish,
                                  mainMenuId: menu.mainMenuId,
                                  mainMenuName: menu.mainMenuName,
                                  menuId: menu.id,
                                  menuName: menu.name,
                                })
                              }
                              disabled={pendingDishActionId === `${dish.id}:delete`}
                              className="material-symbols-outlined self-center rounded-full p-2 text-on-surface-variant transition-colors hover:bg-red-50 hover:text-error disabled:cursor-not-allowed disabled:opacity-40"
                              title="Delete dish"
                            >
                              delete
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMenuId(menu.id);
                          handleStartCreate();
                        }}
                        className="rounded-full bg-surface-container-low px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-on-surface transition-colors hover:bg-surface-container"
                      >
                        Add Item
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleToggleMenuStatus(menu)}
                        disabled={pendingMenuActionId === `${menu.id}:status`}
                        className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant transition-colors hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {menu.isPublished ? "Move to Draft" : "Publish Category"}
                      </button>
                    </div>
                    </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="self-start rounded-[1.7rem] border border-slate-100 bg-white p-6 shadow-[0_16px_36px_rgba(18,28,42,0.05)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  {menuComposerState.mode === "edit" ? "Edit Category" : "Create Category"}
                </p>
                <h3 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-on-surface">
                  {!selectedMainMenu
                    ? "Create a main menu first"
                    : menuComposerState.mode === "edit"
                      ? `Refine this category inside ${selectedMainMenu.name}`
                      : `Add a new category to ${selectedMainMenu.name}`}
                </h3>
              </div>

              {menuComposerState.mode === "edit" ? (
                <button
                  type="button"
                  onClick={handleResetMenuComposer}
                  className="text-sm font-bold text-on-surface-variant transition-colors hover:text-primary"
                >
                  Cancel
                </button>
              ) : null}
            </div>

            <div className="mt-6 grid gap-5">
              <div>
                <label htmlFor="category-name" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Category Name
                </label>
                <input
                  id="category-name"
                  type="text"
                  aria-label="Category name"
                  value={menuComposerState.name}
                  onChange={(event) =>
                    setMenuComposerState((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  disabled={!selectedMainMenu}
                  className="w-full rounded-[1.1rem] bg-surface-container-lowest px-4 py-3.5 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/12 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label htmlFor="category-sort-order" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Sort Order
                </label>
                <input
                  id="category-sort-order"
                  type="number"
                  min="0"
                  aria-label="Category sort order"
                  value={menuComposerState.sortOrder}
                  onChange={(event) =>
                    setMenuComposerState((current) => ({
                      ...current,
                      sortOrder: event.target.value,
                    }))
                  }
                  disabled={!selectedMainMenu}
                  className="w-full rounded-[1.1rem] bg-surface-container-lowest px-4 py-3.5 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/12 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <label className="flex items-center justify-between gap-4 rounded-[1.1rem] bg-surface-container-low px-4 py-3.5">
                <div>
                  <p className="text-sm font-semibold text-on-surface">
                    Publish this category
                  </p>
                  <p className="text-[11px] font-medium text-on-surface-variant">
                    Published categories can appear on the guest-facing menu.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={menuComposerState.isPublished}
                  onChange={(event) =>
                    setMenuComposerState((current) => ({
                      ...current,
                      isPublished: event.target.checked,
                    }))
                  }
                  disabled={!selectedMainMenu}
                  className="h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary"
                />
              </label>
            </div>

            <div className="mt-6 rounded-[1.2rem] bg-surface-container-low p-4 text-sm text-on-surface-variant">
              <p className="font-semibold text-on-surface">Current selection</p>
              <p className="mt-1">
                {!selectedMainMenu
                  ? "Create the main menu first, then you can add categories like Pizza, Chicken, Drinks, or Desserts."
                  : selectedMenu
                  ? `${selectedMenu.name} currently holds ${selectedMenu.dishes.length} item${selectedMenu.dishes.length === 1 ? "" : "s"} inside ${selectedMainMenu?.name ?? "this main menu"}.`
                  : "Choose a category to make it the default destination for new items."}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              {menuMessage ? (
                <p className="text-sm font-medium text-on-surface-variant">
                  {menuMessage}
                </p>
              ) : (
                <p className="text-sm font-medium text-on-surface-variant">
                  {selectedMainMenu
                    ? "Main menus hold categories, and categories hold the actual dish items guests will see."
                    : "The category builder stays locked until the main menu exists."}
                </p>
              )}

              <button
                type="button"
                onClick={() => void handleSubmitMenu()}
                disabled={isSavingMenu || !selectedMainMenu}
                className="flex items-center gap-2 rounded-[1rem] bg-gradient-to-br from-primary to-primary-container px-6 py-3.5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(182,23,34,0.2)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSavingMenu ? <span className="spinner-sm" /> : null}
                {menuComposerState.mode === "edit" ? "Save Category" : "Create Category"}
              </button>
            </div>
          </div>

          {/* Main Menu Summary — third column */}
          <div className="rounded-[1.4rem] border border-slate-100 bg-white p-5 shadow-[0_16px_36px_rgba(18,28,42,0.05)] self-start xl:w-[16rem]">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
              Main Menu Summary
            </p>
            <h3 className="mt-2 text-xl font-bold tracking-[-0.03em] text-on-surface">
              {selectedMainMenu?.name ?? "No main menu selected"}
            </h3>
            <p className="mt-1 text-sm font-medium text-on-surface-variant">
              {selectedMainMenu
                ? `${menuSections.length} categor${menuSections.length === 1 ? "y" : "ies"} inside this menu`
                : "Create a main menu to start organizing categories and items."}
            </p>

            <div className="mt-5 grid gap-3">
              <div className="rounded-[1rem] bg-surface-container-low px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                  Total Main Menus
                </p>
                <p className="mt-1 text-sm font-semibold text-on-surface">
                  {sortedMainMenus.length}
                </p>
              </div>

              <div className="rounded-[1rem] bg-surface-container-low px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                  Total Categories
                </p>
                <p className="mt-1 text-sm font-semibold text-on-surface">
                  {menuSections.length}
                </p>
              </div>

              <div className="rounded-[1rem] bg-surface-container-low px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                  Published Categories
                </p>
                <p className="mt-1 text-sm font-semibold text-on-surface">
                  {menuSections.filter((menu) => menu.isPublished).length}
                </p>
              </div>
            </div>
          </div>
        </section>
      );
    }

    if (activeTab === "team") {
      return renderTeamSection();
    }

    if (activeTab === "settings") {
      if (!isOwnerUser) {
        return (
          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[1.7rem] border border-slate-100 bg-white p-6 shadow-[0_16px_36px_rgba(18,28,42,0.05)]">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                Manager Share Tools
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-on-surface">
                Share the public menu and QR
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-on-surface-variant">
                Managers can open the public restaurant page, copy the guest
                link, and download the QR code for this assigned workspace.
              </p>

              <div className="mt-8 grid gap-5">
                <div className="rounded-[1.2rem] bg-surface-container-low p-4 text-sm text-on-surface-variant">
                  <p className="font-semibold text-on-surface">Assigned role</p>
                  <p className="mt-1">
                    You are signed in as{" "}
                    <span className="font-bold text-on-surface">
                      {currentRole ? getRoleLabel(currentRole) : "Manager"}
                    </span>
                    . Menu and dish updates stay available in this workspace.
                  </p>
                </div>

                <div>
                  <p className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                    Public Slug
                  </p>
                  <div className="flex overflow-hidden rounded-[1.1rem] bg-surface-container-lowest ring-1 ring-outline-variant/12">
                    <span className="border-r border-slate-100 px-4 py-3.5 text-sm font-semibold text-on-surface-variant">
                      /r/
                    </span>
                    <div className="min-w-0 flex-1 px-4 py-3.5 text-sm font-medium text-on-surface">
                      {settingsFormState.publicId}
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.2rem] bg-surface-container-low p-4 text-sm text-on-surface-variant">
                  <p className="font-semibold text-on-surface">Access scope</p>
                  <p className="mt-1">
                    Owners keep full control over restaurant identity and team
                    permissions. Managers focus on menu operations and guest
                    sharing tools.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                {settingsMessage ? (
                  <p className="text-sm font-medium text-on-surface-variant">
                    {settingsMessage}
                  </p>
                ) : (
                  <p className="text-sm font-medium text-on-surface-variant">
                    Share tools are ready whenever guests need the live QR.
                  </p>
                )}
              </div>
            </div>

            {renderQrAccessCard()}
          </section>
        );
      }

      return (
        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.7rem] border border-slate-100 bg-white p-6 shadow-[0_16px_36px_rgba(18,28,42,0.05)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
              Workspace Settings
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-on-surface">
              Control your public identity and launch state
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-on-surface-variant">
              Update the restaurant identity guests see, manage the public URL,
              and control whether this workspace is live for QR visitors.
            </p>

            <div className="mt-8 grid gap-5">
              <div>
                <label htmlFor="settings-restaurant-name" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Restaurant Name
                </label>
                <input
                  id="settings-restaurant-name"
                  type="text"
                  value={settingsFormState.name}
                  onChange={(event) =>
                    setSettingsFormState((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  disabled={!canManageSettings}
                  className="w-full rounded-[1.1rem] bg-surface-container-lowest px-4 py-3.5 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/12 focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div>
                <label htmlFor="settings-public-slug" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Public Slug
                </label>
                <div className="flex overflow-hidden rounded-[1.1rem] bg-surface-container-lowest ring-1 ring-outline-variant/12 focus-within:ring-2 focus-within:ring-primary/20">
                  <span className="border-r border-slate-100 px-4 py-3.5 text-sm font-semibold text-on-surface-variant">
                    /r/
                  </span>
                  <input
                    id="settings-public-slug"
                    type="text"
                    value={settingsFormState.publicId}
                    onChange={(event) =>
                      setSettingsFormState((current) => ({
                        ...current,
                        publicId: sanitizePublicId(event.target.value),
                      }))
                    }
                    disabled={!canManageSettings}
                    className="min-w-0 flex-1 border-none bg-transparent px-4 py-3.5 text-sm font-medium text-on-surface outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
                <p className="mt-2 text-[11px] font-medium text-on-surface-variant">
                  Use lowercase letters, numbers, and hyphens only.
                </p>
              </div>

              <label className="flex items-center justify-between gap-4 rounded-[1.15rem] bg-surface-container-low p-4">
                <div>
                  <p className="text-sm font-semibold text-on-surface">
                    Publish this workspace
                  </p>
                  <p className="text-[11px] font-medium text-on-surface-variant">
                    When enabled, QR visitors can open the public menu and AR
                    preview.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settingsFormState.isPublished}
                  onChange={(event) =>
                    setSettingsFormState((current) => ({
                      ...current,
                      isPublished: event.target.checked,
                    }))
                  }
                  disabled={!canManageSettings}
                  className="h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary disabled:cursor-not-allowed"
                />
              </label>

              <div className="rounded-[1.2rem] bg-surface-container-low p-4 text-sm text-on-surface-variant">
                <p className="font-semibold text-on-surface">Permissions</p>
                <p className="mt-1">
                  Only the top-level owner can update restaurant identity and
                  launch settings. Managers still use the QR tools from this
                  workspace.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              {settingsMessage ? (
                <p className="text-sm font-medium text-on-surface-variant">
                  {settingsMessage}
                </p>
              ) : (
                <p className="text-sm font-medium text-on-surface-variant">
                  Saving settings also refreshes the public QR destination.
                </p>
              )}

              <button
                type="button"
                onClick={() => void handleSubmitSettings()}
                disabled={isSavingSettings || !canManageSettings}
                className="flex items-center gap-2 rounded-[1rem] bg-gradient-to-br from-primary to-primary-container px-6 py-3.5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(182,23,34,0.2)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSavingSettings ? <span className="spinner-sm" /> : null}
                Save Settings
              </button>
            </div>
          </div>

          {renderQrAccessCard()}
        </section>
      );
    }

    return (
      <>
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4 px-1">
            <div>
              <h2 className="text-2xl font-bold tracking-[-0.03em] text-on-surface">
                All Dishes
              </h2>
              <p className="mt-1 text-sm font-medium text-on-surface-variant">
                Every dish across all categories in one flat list.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant shadow-[0_8px_20px_rgba(18,28,42,0.04)]">
                {dishRows.length} Item{dishRows.length === 1 ? "" : "s"}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[1.7rem] border border-slate-100 bg-white shadow-[0_16px_36px_rgba(18,28,42,0.05)]">
            {/* Search */}
            <div className="px-5 pt-5 pb-2">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[1.3rem] text-on-surface-variant/40">
                  search
                </span>
                <input
                  type="text"
                  value={dishSearchQuery}
                  onChange={(e) => setDishSearchQuery(e.target.value)}
                  placeholder="Search menu"
                  aria-label="Search dishes"
                  className="w-full rounded-xl bg-[#f0f0f0] py-3.5 pl-12 pr-5 text-sm text-on-surface outline-none placeholder:text-on-surface-variant/50"
                />
              </div>
            </div>

            <div className="px-4 pt-4">
              <table className="w-full border-collapse">
              <thead>
                <tr className="hidden md:table-row" style={{ borderBottom: '2px solid #E1E1E2' }}>
                  <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant bg-[#f9f4f2] rounded-tl-[1rem]">
                    <span className="inline-flex items-center gap-2"><span className="material-symbols-outlined text-[1rem] text-[#C2E66E]">restaurant</span> Dish Name</span>
                  </th>
                  <th className="px-4 py-4 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant bg-[#f9f4f2]">
                    <span className="inline-flex items-center gap-2"><span className="material-symbols-outlined text-[1rem] text-[#C2E66E]">view_in_ar</span> 3D Model</span>
                  </th>
                  <th className="px-4 py-4 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant bg-[#f9f4f2]">
                    <span className="inline-flex items-center gap-2"><span className="material-symbols-outlined text-[1rem] text-[#C2E66E]">payments</span> Price</span>
                  </th>
                  <th className="px-4 py-4 text-left text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant bg-[#f9f4f2]">
                    <span className="inline-flex items-center gap-2"><span className="material-symbols-outlined text-[1rem] text-[#C2E66E]">toggle_on</span> Status</span>
                  </th>
                  <th className="px-4 py-4 text-right text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant bg-[#f9f4f2] rounded-tr-[1rem]">
                    <span className="inline-flex items-center gap-2"><span className="material-symbols-outlined text-[1rem] text-[#C2E66E]">more_horiz</span> Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="[&>tr+tr]:border-t-[2px] [&>tr+tr]:border-[#E1E1E2]">
              {(() => {
                const query = dishSearchQuery.toLowerCase().trim();
                const filteredDishes = query
                  ? dishRows.filter(
                      (dish) =>
                        dish.name.toLowerCase().includes(query) ||
                        (dish.description ?? "").toLowerCase().includes(query) ||
                        dish.menuName.toLowerCase().includes(query),
                    )
                  : dishRows;

                if (filteredDishes.length === 0) {
                  return (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center">
                        <p className="text-sm font-semibold text-on-surface">
                          {dishRows.length === 0 ? "No dishes yet." : "No dishes match your search."}
                        </p>
                        <p className="mt-2 text-sm text-on-surface-variant">
                          {dishRows.length === 0
                            ? "Go to Menus & Categories to create categories and add dishes."
                            : "Try a different keyword or clear the search."}
                        </p>
                      </td>
                    </tr>
                  );
                }

                return filteredDishes.map((dish) => {
                  const modelAsset = getAssetByKind(dish.assets, "MODEL_3D");
                  const thumbnailAsset = getAssetByKind(dish.assets, "THUMBNAIL");

                  return (
                    <tr
                      key={dish.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedDishId(dish.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedDishId(dish.id);
                        }
                      }}
                      className={cn(
                        "cursor-pointer transition-colors",
                        selectedDish?.id === dish.id
                          ? "bg-primary/4"
                          : "hover:bg-slate-50/60",
                      )}
                    >
                      <td className="px-6 py-4 align-middle">
                        <p className="truncate text-sm font-bold text-on-surface">
                          {dish.name}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-on-surface-variant">
                          {dish.description || "No description added yet."}
                        </p>
                        <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">
                          {dish.menuName} · Order {dish.sortOrder} · Good for {dish.servingSize ?? 2}
                        </p>
                      </td>
                      <td className="px-4 py-4 align-middle text-xs font-medium text-on-surface-variant whitespace-nowrap">
                        {modelAsset?.status === "READY"
                          ? "3D model ready"
                          : "No 3D model"}
                      </td>
                      <td className="px-4 py-4 align-middle text-base font-bold text-on-surface whitespace-nowrap">
                        {formatPrice(dish.price, dish.currency)}
                      </td>
                      <td className="px-4 py-4 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]",
                              dish.isPublished
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-slate-100 text-slate-500",
                            )}
                          >
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                dish.isPublished ? "bg-emerald-500" : "bg-slate-300",
                              )}
                            />
                            {dish.isPublished ? "Live" : "Draft"}
                          </span>
                          <span className="group relative cursor-help">
                            <span className="material-symbols-outlined text-[1rem] text-on-surface-variant/50 transition-colors group-hover:text-primary">
                              info
                            </span>
                            <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-48 -translate-x-1/2 rounded-xl bg-[#14201a] px-3 py-2.5 text-[11px] font-medium leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                              <span className="block font-bold">Category:</span> {dish.menuName}
                              <br />
                              <span className="block mt-1 font-bold">3D Model:</span> {modelAsset?.status ?? "Not attached"}
                              <br />
                              <span className="block mt-1 font-bold">Thumbnail:</span> {thumbnailAsset?.status ?? "Not attached"}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-middle">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleStartEdit(dish);
                            }}
                            disabled={pendingDishActionId === `${dish.id}:delete`}
                            className="material-symbols-outlined rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                            title="Edit dish"
                          >
                            edit
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleToggleDishStatus(dish);
                            }}
                            disabled={pendingDishActionId === `${dish.id}:status`}
                            className="material-symbols-outlined rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                            title={dish.isPublished ? "Move dish to draft" : "Publish dish"}
                          >
                            published_with_changes
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleDeleteDish(dish);
                            }}
                            disabled={pendingDishActionId === `${dish.id}:delete`}
                            className="material-symbols-outlined rounded-full p-2 text-on-surface-variant transition-colors hover:bg-red-50 hover:text-error disabled:cursor-not-allowed disabled:opacity-40"
                            title="Delete dish"
                          >
                            delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                });
              })()}
              </tbody>
            </table>
            </div>
          </div>
        </section>
      </>
    );
  };

  const renderAsideCard = () => {
    if (activeTab === "menus") {
      return null;
    }

    if (activeTab === "team") {
      return (
        <div className="rounded-[1.4rem] border border-slate-100 bg-white p-5 shadow-[0_16px_36px_rgba(18,28,42,0.05)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
            Team Snapshot
          </p>
          <h3 className="mt-2 text-xl font-bold tracking-[-0.03em] text-on-surface">
            {restaurant.members.length} active member
            {restaurant.members.length === 1 ? "" : "s"}
          </h3>
          <p className="mt-1 text-sm font-medium text-on-surface-variant">
            Current access level:{" "}
            {currentRole ? getRoleLabel(currentRole) : "Unknown"}.
          </p>

          <div className="mt-5 grid gap-3">
            <div className="rounded-[1rem] bg-surface-container-low px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                Admins
              </p>
              <p className="mt-1 text-sm font-semibold text-on-surface">
                {restaurant.members.filter((member) => member.role === "ADMIN").length}
              </p>
            </div>

            <div className="rounded-[1rem] bg-surface-container-low px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                Managers
              </p>
              <p className="mt-1 text-sm font-semibold text-on-surface">
                {restaurant.members.filter((member) => member.role === "MANAGER").length}
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === "settings") {
      return (
        <div className="rounded-[1.4rem] border border-slate-100 bg-white p-5 shadow-[0_16px_36px_rgba(18,28,42,0.05)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
            Launch State
          </p>
          <h3 className="mt-2 text-xl font-bold tracking-[-0.03em] text-on-surface">
            {!restaurant.isActive
              ? "Kitchen deactivated"
              : restaurant.isPublished
                ? "Publicly live"
                : "Private draft"}
          </h3>
          <p className="mt-1 text-sm font-medium text-on-surface-variant">
            Current slug: /r/{restaurant.publicId}
          </p>

          <div className="mt-5 grid gap-3">
            <div className="rounded-[1rem] bg-surface-container-low px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                Snapshot Updated
              </p>
              <p className="mt-1 text-sm font-semibold text-on-surface">
                {restaurant.publicMenuSnapshotUpdatedAt
                  ? new Date(restaurant.publicMenuSnapshotUpdatedAt).toLocaleString()
                  : "Pending first publish"}
              </p>
            </div>

            <div className="rounded-[1rem] bg-surface-container-low px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                Access Level
              </p>
              <p className="mt-1 text-sm font-semibold text-on-surface">
                {isOwnerUser
                  ? "Owner controls enabled"
                  : canUseShareTools
                    ? "Manager share tools enabled"
                    : "View-only"}
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (!selectedDish) {
      return null;
    }

    return null;
  };

  const actionDialogMeta = actionDialog
    ? actionDialog.kind === "createMainMenu"
      ? {
          eyebrow: "Create Main Menu",
          title: "Name your main menu",
          description:
            "This is the fixed top-level menu for the restaurant. Categories like Pizza or Chicken will live under it.",
          confirmLabel: "Create Main Menu",
          tone: "primary" as const,
        }
      : actionDialog.kind === "renameMainMenu"
        ? {
            eyebrow: "Rename Main Menu",
            title: "Update the main menu name",
            description:
              "Give the top-level menu a clearer public name without changing its categories or items.",
            confirmLabel: "Save Name",
            tone: "primary" as const,
          }
        : actionDialog.kind === "deleteMainMenu"
          ? {
              eyebrow: "Delete Main Menu",
              title: `Delete ${actionDialog.name}?`,
              description:
                "This removes the main menu permanently. Only empty main menus can be deleted.",
              confirmLabel: "Delete Main Menu",
              tone: "danger" as const,
            }
          : actionDialog.kind === "deleteCategory"
            ? {
                eyebrow: "Delete Category",
                title: `Delete ${actionDialog.name}?`,
                description:
                  "This removes the empty category permanently from the selected main menu.",
                confirmLabel: "Delete Category",
                tone: "danger" as const,
              }
            : {
                eyebrow: "Delete Item",
                title: `Delete ${actionDialog.name}?`,
                description:
                  "This removes the item from the workspace and clears its attached asset records.",
                confirmLabel: "Delete Item",
                tone: "danger" as const,
              }
    : null;

  return (
    <div className="dashboard-shell min-h-screen">
      {toasts.length > 0 ? (
        <div className="pointer-events-none fixed right-4 top-4 z-[70] flex w-[min(92vw,24rem)] flex-col gap-3">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={cn(
                "pointer-events-auto animate-auth-fade-up rounded-[1.15rem] border px-4 py-3 shadow-[0_18px_40px_rgba(18,28,42,0.16)] backdrop-blur-md",
                toast.tone === "success"
                  ? "border-emerald-200 bg-emerald-50/96 text-emerald-700"
                  : toast.tone === "error"
                    ? "border-red-200 bg-red-50/96 text-red-700"
                    : "border-slate-200 bg-white/96 text-on-surface",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold leading-6">{toast.message}</p>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="material-symbols-outlined text-lg opacity-70 transition-opacity hover:opacity-100"
                >
                  close
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <WorkspaceSidebar
        portalVariant={effectivePortalVariant}
        homePath={getPortalHomePath(effectivePortalVariant)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        profileLabel={session.user.name || session.user.email}
        profilePicUrl={session.user.profilePicUrl}
        profileCaption={
          effectivePortalVariant === "owner"
            ? "Workspace Owner"
            : `${currentRole ? getRoleLabel(currentRole) : "Manager"} Access`
        }
      />

      <main className="min-h-screen">
        <WorkspaceHeader
          restaurantName={restaurant.name}
          publicId={restaurant.publicId}
          qrState={qrState}
          isCopyingQr={isCopyingQr}
          onCopyQr={handleCopyQr}
          onCreateDish={handleStartCreate}
          portalVariant={effectivePortalVariant}
        />

        <div className="flex flex-col gap-8 bg-slate-50/55 px-6 py-8 md:px-8 xl:flex-row xl:items-start">
          <div className="min-w-0 flex-1 space-y-6">
            {(activeTab === "dishes" || activeTab === "menus") && (
              <div className="flex w-full flex-wrap items-center gap-2 rounded-[1.3rem] bg-surface-container-low p-1.5">
                {availableWorkspaceTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "rounded-[1rem] px-5 py-2.5 text-xs font-bold transition-colors",
                      activeTab === tab.id
                        ? "bg-white text-primary shadow-[0_8px_20px_rgba(18,28,42,0.04)]"
                        : "text-on-surface-variant hover:bg-surface-container-high",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
            {renderMainContent()}
          </div>

          {activeTab !== "dishes" && activeTab !== "menus" && (
            <aside className="flex w-full shrink-0 flex-col gap-6 xl:w-[24rem]">
              {publishMessage ? (
                <div className="rounded-[1.2rem] bg-surface-container-low p-4 text-sm font-medium text-on-surface-variant">
                  {publishMessage}
                </div>
              ) : null}

              {renderAsideCard()}
            </aside>
          )}
        </div>
      </main>

      {actionDialog && actionDialogMeta ? (
        <div
          className="fixed inset-0 z-[55] flex items-center justify-center bg-[rgba(18,28,42,0.32)] p-4 backdrop-blur-md animate-modal-backdrop"
          onClick={closeActionDialog}
        >
          <section
            className="w-full max-w-xl rounded-[1.7rem] bg-white p-6 shadow-[0_30px_80px_rgba(18,28,42,0.22)] animate-modal-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  {actionDialogMeta.eyebrow}
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-[-0.04em] text-on-surface">
                  {actionDialogMeta.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-on-surface-variant">
                  {actionDialogMeta.description}
                </p>
              </div>

              <button
                type="button"
                onClick={closeActionDialog}
                disabled={isSubmittingActionDialog}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant transition-colors hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {actionDialog.kind === "createMainMenu" ||
            actionDialog.kind === "renameMainMenu" ? (
              <div className="mt-6">
                <label htmlFor="action-dialog-input" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Main Menu Name
                </label>
                <input
                  id="action-dialog-input"
                  type="text"
                  value={actionDialog.value}
                  onChange={(event) => updateActionDialogValue(event.target.value)}
                  disabled={isSubmittingActionDialog}
                  autoFocus
                  className="w-full rounded-[1.1rem] bg-surface-container-lowest px-4 py-3.5 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/12 focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeActionDialog}
                disabled={isSubmittingActionDialog}
                className="rounded-[1rem] border border-slate-200 px-5 py-3 text-sm font-bold text-on-surface-variant transition-colors hover:border-primary/25 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSubmitActionDialog()}
                disabled={isSubmittingActionDialog}
                className={cn(
                  "flex items-center gap-2 rounded-[1rem] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_28px_rgba(182,23,34,0.2)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70",
                  actionDialogMeta.tone === "danger"
                    ? "bg-gradient-to-br from-[#9d1321] to-[#cf2334]"
                    : "bg-gradient-to-br from-primary to-primary-container",
                )}
              >
                {isSubmittingActionDialog ? <span className="spinner-sm" /> : null}
                {actionDialogMeta.confirmLabel}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {isComposerVisible ? (
        <div
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center bg-[rgba(18,28,42,0.32)] p-4 backdrop-blur-md",
            isComposerClosing
              ? "animate-modal-backdrop-out"
              : "animate-modal-backdrop",
          )}
          onClick={closeComposer}
        >
          <section
            className={cn(
              "max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-[0_30px_80px_rgba(18,28,42,0.22)] md:p-7",
              isComposerClosing
                ? "animate-modal-card-out"
                : "animate-modal-card",
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-[2rem] font-bold tracking-[-0.04em] text-on-surface">
                  {composerState.mode === "edit" ? "Update Dish" : "Add New Dish"}
                </h2>
                <p className="mt-1 text-sm font-medium text-on-surface-variant">
                  Create dishes, assign them to a menu, and control their
                  publish state.
                </p>
              </div>

              <button
                type="button"
                onClick={closeComposer}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant transition-colors hover:text-primary"
              >
                <span className="material-symbols-outlined text-[1.8rem]">close</span>
              </button>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <div>
                <label htmlFor="dish-name" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Dish Name
                </label>
                <input
                  id="dish-name"
                  type="text"
                  aria-label="Dish name"
                  value={composerState.name}
                  onChange={(event) =>
                    setComposerState((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className="w-full rounded-[1.1rem] bg-surface-container-lowest px-4 py-3.5 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/12 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label htmlFor="dish-category" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Item Category
                </label>
                <select
                  id="dish-category"
                  aria-label="Item category"
                  value={selectedMenuId}
                  onChange={(event) => setSelectedMenuId(event.target.value)}
                  className="w-full rounded-[1.1rem] bg-surface-container-lowest px-4 py-3.5 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/12 focus:ring-2 focus:ring-primary/20"
                >
                  {sortedMenus.length === 0 ? (
                    <option value="">
                      {selectedMainMenu
                        ? "A General category will be created automatically"
                        : "Create a main menu first"}
                    </option>
                  ) : null}
                  {sortedMenus.map((menu) => (
                    <option key={menu.id} value={menu.id}>
                      {menu.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="dish-price" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Price
                </label>
                <input
                  id="dish-price"
                  type="number"
                  min="1"
                  aria-label="Dish price"
                  value={composerState.price}
                  onChange={(event) =>
                    setComposerState((current) => ({
                      ...current,
                      price: event.target.value,
                    }))
                  }
                  className="w-full rounded-[1.1rem] bg-surface-container-lowest px-4 py-3.5 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/12 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label htmlFor="dish-currency" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Currency
                </label>
                <select
                  id="dish-currency"
                  aria-label="Currency"
                  value={composerState.currency}
                  onChange={(event) =>
                    setComposerState((current) => ({
                      ...current,
                      currency: event.target.value as CurrencyCode,
                    }))
                  }
                  className="w-full rounded-[1.1rem] bg-surface-container-lowest px-4 py-3.5 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/12 focus:ring-2 focus:ring-primary/20"
                >
                  {currencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="dish-serving-size" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Good For
                </label>
                <input
                  id="dish-serving-size"
                  type="number"
                  min="1"
                  step="1"
                  aria-label="Serving size"
                  value={composerState.servingSize}
                  onChange={(event) =>
                    setComposerState((current) => ({
                      ...current,
                      servingSize: event.target.value,
                    }))
                  }
                  className="w-full rounded-[1.1rem] bg-surface-container-lowest px-4 py-3.5 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/12 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label htmlFor="dish-sort-order" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Public Display Order
                </label>
                <input
                  id="dish-sort-order"
                  type="number"
                  min="0"
                  step="1"
                  aria-label="Display order"
                  value={composerState.sortOrder}
                  onChange={(event) =>
                    setComposerState((current) => ({
                      ...current,
                      sortOrder: event.target.value,
                    }))
                  }
                  className="w-full rounded-[1.1rem] bg-surface-container-lowest px-4 py-3.5 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/12 focus:ring-2 focus:ring-primary/20"
                />
                <p className="mt-2 text-xs font-medium text-on-surface-variant">
                  Lower numbers appear first on the public restaurant page.
                </p>
              </div>

              <label className="flex items-center gap-3 rounded-[1.1rem] bg-surface-container-low px-4 py-3.5 md:self-end">
                <input
                  type="checkbox"
                  checked={composerState.isPublished}
                  onChange={(event) =>
                    setComposerState((current) => ({
                      ...current,
                      isPublished: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary"
                />
                <span className="text-sm font-semibold text-on-surface">
                  Publish this dish immediately
                </span>
              </label>

              <label className="flex items-center gap-3 rounded-[1.1rem] bg-surface-container-low px-4 py-3.5 md:self-end">
                <input
                  type="checkbox"
                  checked={composerState.detailsPanelEnabled}
                  onChange={(event) =>
                    setComposerState((current) => ({
                      ...current,
                      detailsPanelEnabled: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary"
                />
                <span className="text-sm font-semibold text-on-surface">
                  Show swipe-down details on public card
                </span>
              </label>

              <div className="md:col-span-2">
                <label htmlFor="dish-badge" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Public Card Badge
                </label>
                <input
                  id="dish-badge"
                  type="text"
                  aria-label="Badge label"
                  value={composerState.badgeLabel}
                  placeholder="Most Ordered This Week"
                  maxLength={80}
                  onChange={(event) =>
                    setComposerState((current) => ({
                      ...current,
                      badgeLabel: event.target.value,
                    }))
                  }
                  className="w-full rounded-[1.1rem] bg-surface-container-lowest px-4 py-3.5 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/12 focus:ring-2 focus:ring-primary/20"
                />
                <p className="mt-2 text-xs font-medium text-on-surface-variant">
                  Leave blank to hide the badge on the public AR card.
                </p>
              </div>

              <div className="md:col-span-2 rounded-[1.3rem] bg-surface-container-low p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                      Serve-With Items
                    </p>
                    <p className="mt-1 text-xs font-medium text-on-surface-variant">
                      Add the extra foods shown inside the swipe-down card section.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setComposerState((current) => ({
                        ...current,
                        crossSellItems: [
                          ...current.crossSellItems,
                          {
                            id: createCrossSellItemId(),
                            name: "",
                            price: 0,
                            imageUrl: null,
                            imageStorageKey: null,
                            imageFile: null,
                            imagePreviewUrl: null,
                          },
                        ],
                      }))
                    }
                    className="rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-on-surface transition-colors hover:text-primary"
                  >
                    Add Item
                  </button>
                </div>

                {composerState.crossSellItems.length === 0 ? (
                  <p className="rounded-[1rem] bg-white/70 p-4 text-sm font-medium text-on-surface-variant">
                    No serve-with items added yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {composerState.crossSellItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="grid gap-3 rounded-[1rem] bg-white/80 p-4 md:grid-cols-[6rem_minmax(0,1fr)_8rem_auto]"
                      >
                        <label
                          htmlFor={`cross-sell-image-${item.id}`}
                          className="group flex h-24 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[0.9rem] border border-dashed border-slate-200 bg-surface-container-lowest text-center"
                        >
                          <input
                            id={`cross-sell-image-${item.id}`}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(event) => {
                              const file = event.target.files?.[0] ?? null;
                              setComposerState((current) => ({
                                ...current,
                                crossSellItems: current.crossSellItems.map((candidate, candidateIndex) =>
                                  candidateIndex === index
                                    ? {
                                        ...candidate,
                                        imageFile: file,
                                        imagePreviewUrl: file
                                          ? URL.createObjectURL(file)
                                          : candidate.imageUrl,
                                      }
                                    : candidate,
                                ),
                              }));
                            }}
                          />
                          {item.imagePreviewUrl || item.imageUrl ? (
                            <img
                              src={item.imagePreviewUrl ?? item.imageUrl ?? ""}
                              alt={item.name || "Serve-with item"}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-3xl text-slate-300 group-hover:text-primary">
                                add_photo_alternate
                              </span>
                              <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">
                                Image
                              </span>
                            </>
                          )}
                        </label>

                        <div>
                          <label
                            htmlFor={`cross-sell-name-${item.id}`}
                            className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant"
                          >
                            Name
                          </label>
                          <input
                            id={`cross-sell-name-${item.id}`}
                            type="text"
                            value={item.name}
                            placeholder="Butter Naan"
                            onChange={(event) =>
                              setComposerState((current) => ({
                                ...current,
                                crossSellItems: current.crossSellItems.map((candidate, candidateIndex) =>
                                  candidateIndex === index
                                    ? { ...candidate, name: event.target.value }
                                    : candidate,
                                ),
                              }))
                            }
                            className="w-full rounded-[0.9rem] bg-surface-container-lowest px-4 py-3 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/12 focus:ring-2 focus:ring-primary/20"
                          />
                        </div>

                        <div>
                          <label
                            htmlFor={`cross-sell-price-${item.id}`}
                            className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant"
                          >
                            Price
                          </label>
                          <input
                            id={`cross-sell-price-${item.id}`}
                            type="number"
                            min="0"
                            step="1"
                            value={item.price}
                            onChange={(event) =>
                              setComposerState((current) => ({
                                ...current,
                                crossSellItems: current.crossSellItems.map((candidate, candidateIndex) =>
                                  candidateIndex === index
                                    ? { ...candidate, price: Number(event.target.value) }
                                    : candidate,
                                ),
                              }))
                            }
                            className="w-full rounded-[0.9rem] bg-surface-container-lowest px-4 py-3 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/12 focus:ring-2 focus:ring-primary/20"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setComposerState((current) => ({
                              ...current,
                              crossSellItems: current.crossSellItems.filter((_, candidateIndex) => candidateIndex !== index),
                            }))
                          }
                          className="material-symbols-outlined self-end rounded-full p-3 text-on-surface-variant transition-colors hover:bg-red-50 hover:text-error"
                          title="Remove serve-with item"
                        >
                          delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label htmlFor="dish-description" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Description
                </label>
                <textarea
                  id="dish-description"
                  aria-label="Dish description"
                  rows={5}
                  value={composerState.description}
                  onChange={(event) =>
                    setComposerState((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className="w-full rounded-[1.1rem] bg-surface-container-lowest px-4 py-3.5 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/12 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Dietary Type Selector */}
              <div className="md:col-span-2">
                <p className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Dietary Type
                </p>
                <div className="flex gap-3 flex-wrap">
                  {/* None option */}
                  <button
                    type="button"
                    onClick={() => setComposerState((c) => ({ ...c, dietaryType: null }))}
                    className={cn(
                      "rounded-full px-4 py-2 text-xs font-bold tracking-wide border transition-all",
                      composerState.dietaryType === null
                        ? "bg-primary text-white border-primary"
                        : "bg-surface-container-lowest text-on-surface-variant border-outline-variant/20 hover:border-primary/30"
                    )}
                  >
                    None
                  </button>

                  {(["VEG", "NON_VEG", "BOTH"] as const).map((type) => {
                    const labels: Record<string, string> = { VEG: "🟢 Veg", NON_VEG: "🔴 Non-Veg", BOTH: "🟢🔴 Both" };
                    const active = composerState.dietaryType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setComposerState((c) => ({ ...c, dietaryType: active ? null : type }))}
                        className={cn(
                          "rounded-full px-4 py-2 text-xs font-bold tracking-wide border transition-all",
                          active
                            ? "bg-primary text-white border-primary"
                            : "bg-surface-container-lowest text-on-surface-variant border-outline-variant/20 hover:border-primary/30"
                        )}
                      >
                        {labels[type]}
                      </button>
                    );
                  })}

                </div>
              </div>

              <div className="md:col-span-2 grid gap-5 lg:grid-cols-2">
                <div className="rounded-[1.3rem] bg-surface-container-low p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                        3D Model
                      </p>
                      <p className="mt-1 text-xs font-medium text-on-surface-variant">
                        Attach the dish AR model here.
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]",
                        editingModelAsset?.status === "READY"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-white text-on-surface-variant",
                      )}
                    >
                      {editingModelAsset?.status ?? "Optional"}
                    </span>
                  </div>

                  <label className="group flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-[1rem] border-2 border-dashed border-slate-200 bg-white/80 px-5 text-center transition-all hover:border-primary/35 hover:bg-primary/5">
                    <input
                      type="file"
                      accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
                      className="hidden"
                      onChange={(event) =>
                        setComposerModelFile(event.target.files?.[0] ?? null)
                      }
                    />
                    <span className="material-symbols-outlined text-4xl text-slate-300 transition-colors group-hover:text-primary">
                      view_in_ar
                    </span>
                    <p className="mt-3 text-sm font-bold text-on-surface">
                      {composerModelFile ? "Model attached" : "Choose 3D model"}
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-on-surface-variant">
                      {composerModelFile?.name ??
                        "GLB or GLTF files upload when you save"}
                    </p>
                  </label>
                </div>

                <div className="rounded-[1.3rem] bg-surface-container-low p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                        Thumbnail Image
                      </p>
                      <p className="mt-1 text-xs font-medium text-on-surface-variant">
                        Attach the menu preview image here.
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]",
                        editingThumbnailAsset?.status === "READY"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-white text-on-surface-variant",
                      )}
                    >
                      {editingThumbnailAsset?.status ?? "Optional"}
                    </span>
                  </div>

                  <label className="group flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-[1rem] border-2 border-dashed border-slate-200 bg-white/80 px-5 text-center transition-all hover:border-primary/35 hover:bg-primary/5">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(event) =>
                        setComposerThumbnailFile(event.target.files?.[0] ?? null)
                      }
                    />
                    <span className="material-symbols-outlined text-4xl text-slate-300 transition-colors group-hover:text-primary">
                      add_photo_alternate
                    </span>
                    <p className="mt-3 text-sm font-bold text-on-surface">
                      {composerThumbnailFile
                        ? "Thumbnail attached"
                        : "Choose thumbnail"}
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-on-surface-variant">
                      {composerThumbnailFile?.name ??
                        "PNG, JPG, or WEBP uploads with the dish"}
                    </p>
                  </label>
                </div>
              </div>

              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={() => setComposerAutoOptimize((value) => !value)}
                  className="flex w-full items-center justify-between rounded-[1rem] bg-surface-container-low px-4 py-3 text-left"
                >
                  <div>
                    <p className="text-sm font-bold text-on-surface">
                      Auto-optimize attached assets
                    </p>
                    <p className="text-[11px] font-medium text-on-surface-variant">
                      Keep this on for lighter AR loading on mobile.
                    </p>
                  </div>
                  <div
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      composerAutoOptimize ? "bg-primary" : "bg-slate-300"
                    }`}
                  >
                    <div
                      className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                        composerAutoOptimize ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </div>
                </button>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              {composerMessage ? (
                <p className="text-sm font-medium text-on-surface-variant">
                  {composerMessage}
                </p>
              ) : (
                <span className="text-sm font-medium text-on-surface-variant">
                  Save once to create the dish and upload its thumbnail and AR model together.
                </span>
              )}

              <div className="flex flex-wrap items-center justify-end gap-4">
                {composerProgress ? (
                  <div className="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant">
                    <span className="spinner-sm border-primary/25 border-t-primary" />
                    {composerProgress}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={handleSubmitDish}
                  disabled={isSavingDish}
                  className="flex items-center gap-2 rounded-[1rem] bg-gradient-to-br from-primary to-primary-container px-6 py-3.5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(182,23,34,0.2)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSavingDish ? <span className="spinner-sm" /> : null}
                  {composerState.mode === "edit" ? "Save Changes" : "Create Dish"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {teamComposerState.isOpen ? (
        <div
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center bg-[rgba(18,28,42,0.32)] p-4 backdrop-blur-md animate-modal-backdrop",
          )}
          onClick={() => setTeamComposerState(emptyTeamComposerState)}
        >
          <section
            className={cn(
              "max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-[0_30px_80px_rgba(18,28,42,0.22)] md:p-7 animate-modal-card",
            )}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-[2rem] font-bold tracking-[-0.04em] text-on-surface">
                  {assignedManager ? "Edit Manager & Location" : "Set Manager & Location"}
                </h2>
                <p className="mt-1 text-sm font-medium text-on-surface-variant">
                  Update manager profile, credentials, and restaurant address.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setTeamComposerState(emptyTeamComposerState)}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant transition-colors hover:text-primary"
              >
                <span className="material-symbols-outlined text-[1.8rem]">close</span>
              </button>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Restaurant Location
                </p>
                <label htmlFor="restaurant-address" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Full Address
                </label>
                <input
                  id="restaurant-address"
                  type="text"
                  aria-label="Restaurant Address"
                  value={teamComposerState.restaurantAddress}
                  onChange={(event) =>
                    setTeamComposerState((current) => ({
                      ...current,
                      restaurantAddress: event.target.value,
                    }))
                  }
                  className="w-full rounded-[1.1rem] bg-surface-container-lowest px-4 py-3.5 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/12 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="md:col-span-2 mt-4">
                <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Manager Details
                </p>
              </div>

              <div>
                <label htmlFor="manager-name" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Manager Name
                </label>
                <input
                  id="manager-name"
                  type="text"
                  aria-label="Manager name"
                  value={teamComposerState.name}
                  onChange={(event) =>
                    setTeamComposerState((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className="w-full rounded-[1.1rem] bg-surface-container-lowest px-4 py-3.5 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/12 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label htmlFor="manager-mobile" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Manager Mobile Number
                </label>
                <input
                  id="manager-mobile"
                  type="text"
                  aria-label="Manager mobile"
                  value={teamComposerState.mobile}
                  onChange={(event) =>
                    setTeamComposerState((current) => ({
                      ...current,
                      mobile: event.target.value,
                    }))
                  }
                  className="w-full rounded-[1.1rem] bg-surface-container-lowest px-4 py-3.5 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/12 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label htmlFor="manager-email" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Manager Email
                </label>
                <input
                  id="manager-email"
                  type="email"
                  aria-label="Manager email"
                  value={teamComposerState.email}
                  onChange={(event) =>
                    setTeamComposerState((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  className="w-full rounded-[1.1rem] bg-surface-container-lowest px-4 py-3.5 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/12 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label htmlFor="manager-password" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Manager Password
                </label>
                <input
                  id="manager-password"
                  type="password"
                  aria-label="Manager password"
                  value={teamComposerState.password}
                  onChange={(event) =>
                    setTeamComposerState((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  placeholder={
                    assignedManager
                      ? "Enter new password to reset"
                      : "Create password"
                  }
                  className="w-full rounded-[1.1rem] bg-surface-container-lowest px-4 py-3.5 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/12 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="md:col-span-2">
                <p className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Profile Picture
                </p>
                <div className="flex items-center gap-4">
                  {teamComposerState.profilePic ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={teamComposerState.profilePic}
                      alt="Profile preview"
                      className="size-16 rounded-full border border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="flex size-16 items-center justify-center rounded-full border border-dashed border-slate-300 text-on-surface-variant">
                      <span className="material-symbols-outlined text-[1.4rem]">person</span>
                    </div>
                  )}
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-[1rem] border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-on-surface transition-colors hover:border-primary/30 hover:text-primary">
                    <span className="material-symbols-outlined text-[1rem]">upload</span>
                    {teamComposerState.profilePic ? "Replace photo" : "Upload photo"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      aria-label="Upload manager profile picture"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          const dataUrl = typeof reader.result === "string" ? reader.result : "";
                          setTeamComposerState((current) => ({
                            ...current,
                            profilePic: dataUrl,
                          }));
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  {teamComposerState.profilePic ? (
                    <button
                      type="button"
                      onClick={() =>
                        setTeamComposerState((current) => ({
                          ...current,
                          profilePic: "",
                        }))
                      }
                      className="inline-flex items-center gap-2 rounded-[1rem] border border-red-200 bg-white px-4 py-3 text-xs font-bold text-red-600 transition-colors hover:bg-red-50"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
              {teamMessage ? (
                <p className="text-sm font-medium text-error">
                  {teamMessage}
                </p>
              ) : (
                <span className="text-sm font-medium text-on-surface-variant">
                  Saving will update the location and manager details.
                </span>
              )}

              <div className="flex flex-wrap items-center justify-end gap-4">
                <button
                  type="button"
                  onClick={() => void handleSubmitMember()}
                  disabled={isSavingMember || !canManageMembers}
                  className="flex items-center gap-2 rounded-[1rem] bg-gradient-to-br from-primary to-primary-container px-6 py-3.5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(182,23,34,0.2)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSavingMember ? <span className="spinner-sm" /> : null}
                  {assignedManager ? "Save Changes" : "Save and Create"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
