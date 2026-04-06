"use client";

import { useEffect, useMemo, useState } from "react";

import {
  addRestaurantMember,
  completeAssetUpload,
  createAssetUpload,
  createDish,
  deleteDish,
  deleteMenu,
  createMenu,
  fetchRestaurant,
  generateRestaurantQr,
  updateDish,
  updateMenu,
  updateRestaurant,
  uploadFileToSignedUrl,
  type AssetSummary,
  type DishSummary,
  type MenuSummary,
  type RestaurantDetails,
  type RestaurantQrPayload,
} from "@/lib/api";
import { useAuthSession } from "@/hooks/use-auth-session";
import { cn } from "@/lib/utils";
import { ReadinessCard } from "./ReadinessCard";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { WorkspaceSidebar } from "./WorkspaceSidebar";

type RestaurantWorkspaceProps = {
  restaurantId: string;
};

type WorkspaceTab = "dishes" | "menus" | "team" | "settings";

type ComposerState = {
  mode: "create" | "edit";
  dishId: string | null;
  name: string;
  price: string;
  description: string;
  isPublished: boolean;
};

type DishRow = DishSummary & {
  menuId: string;
  menuName: string;
};

type TeamComposerState = {
  email: string;
  role: "OWNER" | "ADMIN" | "EDITOR";
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

const emptyComposerState: ComposerState = {
  mode: "create",
  dishId: null,
  name: "",
  price: "",
  description: "",
  isPublished: false,
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
  role: "EDITOR",
};

const emptySettingsFormState: SettingsFormState = {
  name: "",
  publicId: "",
  isPublished: false,
};

const workspaceTabs: Array<{ id: WorkspaceTab; label: string }> = [
  { id: "dishes", label: "Manage Dishes" },
  { id: "menus", label: "Menu Categories" },
  { id: "team", label: "Team & Roles" },
  { id: "settings", label: "Settings" },
];

const flattenDishes = (menus: MenuSummary[]): DishRow[] =>
  menus.flatMap((menu) =>
    menu.dishes.map((dish) => ({
      ...dish,
      menuId: menu.id,
      menuName: menu.name,
    })),
  );

const getAssetByKind = (
  assets: AssetSummary[],
  kind: AssetSummary["kind"],
): AssetSummary | undefined => assets.find((asset) => asset.kind === kind);

const formatPrice = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const buildReadinessPercent = (checks: boolean[]) =>
  Math.round((checks.filter(Boolean).length / checks.length) * 100);

const resolveOwnerLabel = (restaurant: RestaurantDetails) =>
  restaurant.members[0]?.user.email ?? "Workspace Owner";

const getMimeTypeForModel = (file: File) =>
  file.type ||
  (file.name.toLowerCase().endsWith(".gltf")
    ? "model/gltf+json"
    : "model/gltf-binary");

export function RestaurantWorkspace({
  restaurantId,
}: RestaurantWorkspaceProps) {
  const COMPOSER_CLOSE_ANIMATION_MS = 240;
  const session = useAuthSession();
  const [restaurant, setRestaurant] = useState<RestaurantDetails | null>(null);
  const [isLoadingRestaurant, setIsLoadingRestaurant] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("dishes");
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

  const sortedMenus = useMemo(
    () =>
      restaurant
        ? [...restaurant.menus].sort(
            (left, right) =>
              left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
          )
        : [],
    [restaurant],
  );

  const dishRows = useMemo(() => flattenDishes(sortedMenus), [sortedMenus]);

  const selectedDish =
    dishRows.find((dish) => dish.id === selectedDishId) ?? dishRows[0] ?? null;

  useEffect(() => {
    if (!selectedDish && dishRows.length > 0) {
      setSelectedDishId(dishRows[0].id);
    }
  }, [dishRows, selectedDish]);

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
      publicId: restaurant.publicId,
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
    if (!isComposerVisible) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeComposer();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isComposerVisible]);

  if (session.status === "loading" || isLoadingRestaurant) {
    return (
      <div className="auth-grid flex min-h-screen items-center justify-center">
        <div className="rounded-[1.35rem] bg-white/90 px-8 py-7 shadow-[0_18px_40px_rgba(18,28,42,0.08)]">
          <div className="mx-auto spinner-sm border-primary/30 border-t-primary" />
          <p className="mt-4 text-sm font-semibold text-on-surface-variant">
            Loading workspace...
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

  if (!restaurant || loadError) {
    return (
      <div className="auth-grid flex min-h-screen items-center justify-center">
        <div className="max-w-lg rounded-[1.35rem] bg-white/92 px-8 py-7 shadow-[0_18px_40px_rgba(18,28,42,0.08)]">
          <p className="text-sm font-semibold text-error">
            {loadError ?? "Workspace data is unavailable."}
          </p>
          <p className="mt-2 text-sm text-on-surface-variant">
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
    sortedMenus.length > 0,
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
  const selectedMenu =
    sortedMenus.find((menu) => menu.id === selectedMenuId) ?? sortedMenus[0] ?? null;
  const currentMembership =
    session.status === "authenticated"
      ? restaurant.members.find((member) => member.user.id === session.user.id) ?? null
      : null;
  const canManageMembers = currentMembership?.role === "OWNER";
  const canManageSettings =
    currentMembership?.role === "OWNER" || currentMembership?.role === "ADMIN";

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

  const handleStartCreate = () => {
    setComposerState(emptyComposerState);
    setComposerMessage(null);
    setComposerModelFile(null);
    setComposerThumbnailFile(null);
    setComposerAutoOptimize(true);
    openComposer();
  };

  const handleStartEdit = (dish: DishRow) => {
    setSelectedDishId(dish.id);
    setSelectedMenuId(dish.menuId);
    setComposerState({
      mode: "edit",
      dishId: dish.id,
      name: dish.name,
      price: dish.price.toString(),
      description: dish.description ?? "",
      isPublished: dish.isPublished,
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

  const handleSubmitDish = async () => {
    if (session.status !== "authenticated") {
      return;
    }

    const name = composerState.name.trim();
    const priceValue = Number(composerState.price);

    if (!name) {
      setComposerMessage("Dish name is required.");
      return;
    }

    if (!Number.isFinite(priceValue) || priceValue <= 0) {
      setComposerMessage("Price must be a valid number.");
      return;
    }

    setIsSavingDish(true);
    setComposerMessage(null);
    setComposerProgress("Saving dish details...");

    try {
      let menuId = selectedMenuId;
      let dishId = composerState.dishId;

      if (!menuId) {
        const createdMenu = await createMenu(session.token, restaurant.id, {
          name: "Primary Menu",
          isPublished: true,
          sortOrder: 0,
        });
        menuId = createdMenu.id;
        setSelectedMenuId(menuId);
      }

      if (composerState.mode === "edit" && composerState.dishId) {
        await updateDish(session.token, composerState.dishId, {
          name,
          price: Math.round(priceValue),
          description: composerState.description.trim() || undefined,
          isPublished: composerState.isPublished,
        });
        setSelectedDishId(composerState.dishId);
      } else {
        const createdDish = await createDish(session.token, menuId, {
          name,
          price: Math.round(priceValue),
          description: composerState.description.trim() || undefined,
          isPublished: composerState.isPublished,
          sortOrder: dishRows.length,
        });
        dishId = createdDish.id;
        setSelectedDishId(createdDish.id);
      }

      if (dishId) {
        await uploadComposerAssets(dishId);
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
    if (session.status !== "authenticated") {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${dish.name}"? This removes the dish from the workspace and clears its attached asset records.`,
    );
    if (!confirmed) {
      return;
    }

    setPendingDishActionId(`${dish.id}:delete`);
    setComposerMessage(null);

    try {
      await deleteDish(session.token, dish.id);
      await refreshRestaurant();

      if (composerState.dishId === dish.id) {
        setComposerState(emptyComposerState);
        closeComposer();
      }

      const successMessage = `${dish.name} deleted.`;
      setComposerMessage(successMessage);
      pushToast(successMessage, "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to delete this dish.";
      setComposerMessage(message);
      pushToast(message, "error");
    } finally {
      setPendingDishActionId(null);
    }
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
      setSettingsMessage("Only admins and owners can update workspace settings.");
      return;
    }

    const name = settingsFormState.name.trim();
    const publicId = settingsFormState.publicId.trim().toLowerCase();

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

  const handleStartCreateMenu = () => {
    setActiveTab("menus");
    setMenuComposerState({
      ...emptyMenuComposerState,
      sortOrder: sortedMenus.length.toString(),
    });
    setMenuMessage(null);
  };

  const handleStartEditMenu = (menu: MenuSummary) => {
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
      setMenuMessage("Menu category name is required.");
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
          ? "Menu category updated."
          : "Menu category created.";

      if (menuComposerState.mode === "edit" && menuComposerState.menuId) {
        await updateMenu(session.token, menuComposerState.menuId, {
          name,
          isPublished: menuComposerState.isPublished,
          sortOrder: sortOrderValue,
        });
      } else {
        const createdMenu = await createMenu(session.token, restaurant.id, {
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
        error instanceof Error ? error.message : "Unable to save this menu category.";
      setMenuMessage(message);
      pushToast(message, "error");
    } finally {
      setIsSavingMenu(false);
    }
  };

  const handleToggleMenuStatus = async (menu: MenuSummary) => {
    if (session.status !== "authenticated") {
      return;
    }

    setMenuMessage(null);
    setPendingMenuActionId(`${menu.id}:status`);

    try {
      await updateMenu(session.token, menu.id, {
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
          : "Unable to update this menu category.";
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
      await updateMenu(session.token, currentMenu.id, {
        sortOrder: targetMenu.sortOrder,
      });
      await updateMenu(session.token, targetMenu.id, {
        sortOrder: currentMenu.sortOrder,
      });
      await refreshRestaurant();
      pushToast("Menu order updated.", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to reorder menu categories.";
      setMenuMessage(message);
      pushToast(message, "error");
    } finally {
      setPendingMenuActionId(null);
    }
  };

  const handleDeleteMenu = async (menu: MenuSummary) => {
    if (session.status !== "authenticated") {
      return;
    }

    if (menu.dishes.length > 0) {
      const message =
        "Delete or move dishes out of this category before removing it.";
      setMenuMessage(message);
      pushToast(message, "error");
      return;
    }

    const confirmed = window.confirm(
      `Delete "${menu.name}"? Empty categories are removed permanently.`,
    );
    if (!confirmed) {
      return;
    }

    setPendingMenuActionId(`${menu.id}:delete`);
    setMenuMessage(null);

    try {
      await deleteMenu(session.token, menu.id);
      await refreshRestaurant();

      if (menuComposerState.menuId === menu.id) {
        handleResetMenuComposer();
      }

      const successMessage = `${menu.name} deleted.`;
      setMenuMessage(successMessage);
      pushToast(successMessage, "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to delete this category.";
      setMenuMessage(message);
      pushToast(message, "error");
    } finally {
      setPendingMenuActionId(null);
    }
  };

  const handleStartInviteMember = (
    member?: RestaurantDetails["members"][number],
  ) => {
    setActiveTab("team");
    setTeamComposerState(
      member
        ? {
            email: member.user.email,
            role: member.role as TeamComposerState["role"],
          }
        : emptyTeamComposerState,
    );
    setTeamMessage(null);
  };

  const handleSubmitMember = async () => {
    if (session.status !== "authenticated") {
      return;
    }

    if (!canManageMembers) {
      setTeamMessage("Only the restaurant owner can invite or update members.");
      return;
    }

    const email = teamComposerState.email.trim().toLowerCase();
    if (!email) {
      setTeamMessage("Member email is required.");
      return;
    }

    setIsSavingMember(true);
    setTeamMessage(null);

    try {
      await addRestaurantMember(session.token, restaurant.id, {
        email,
        role: teamComposerState.role,
      });
      await refreshRestaurant();
      setTeamComposerState(emptyTeamComposerState);
      setTeamMessage("Member access updated.");
      pushToast("Member access updated.", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update team access.";
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
              Restaurant Team
            </h2>
            <p className="mt-1 text-sm font-medium text-on-surface-variant">
              Invite operational teammates and adjust their access to this
              workspace.
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleStartInviteMember()}
            className="rounded-[1rem] bg-gradient-to-br from-primary to-primary-container px-5 py-3 text-sm font-bold text-white shadow-[0_14px_28px_rgba(182,23,34,0.18)] transition-transform hover:-translate-y-0.5"
          >
            Invite Member
          </button>
        </div>

        <div className="mt-6 grid gap-4">
          {restaurant.members.map((member) => {
            const isOwner = member.role === "OWNER";

            return (
              <div
                key={member.id}
                className="rounded-[1.3rem] border border-slate-100 bg-surface-container-low px-5 py-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-surface-container-high text-sm font-bold text-primary">
                      {member.user.email.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-on-surface">
                        {member.user.email}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]",
                            member.role === "OWNER"
                              ? "bg-primary/10 text-primary"
                              : member.role === "ADMIN"
                                ? "bg-sky-50 text-sky-700"
                                : "bg-slate-100 text-slate-600",
                          )}
                        >
                          {member.role}
                        </span>
                        {member.user.id === session.user.id ? (
                          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-on-surface-variant">
                            You
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleStartInviteMember(member)}
                    disabled={isOwner || !canManageMembers}
                    className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-on-surface-variant transition-colors hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isOwner ? "Owner Locked" : "Edit Role"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-[1.7rem] border border-slate-100 bg-white p-6 shadow-[0_16px_36px_rgba(18,28,42,0.05)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
              Team Access
            </p>
            <h3 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-on-surface">
              Invite or update a member
            </h3>
          </div>

          <button
            type="button"
            onClick={() => handleStartInviteMember()}
            className="text-sm font-bold text-on-surface-variant transition-colors hover:text-primary"
          >
            Reset
          </button>
        </div>

        <div className="mt-6 grid gap-5">
          <div>
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
              Member Email
            </label>
            <input
              type="email"
              value={teamComposerState.email}
              onChange={(event) =>
                setTeamComposerState((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              disabled={!canManageMembers}
              className="w-full rounded-[1.1rem] bg-surface-container-lowest px-4 py-3.5 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/12 focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
              Role
            </label>
            <select
              value={teamComposerState.role}
              onChange={(event) =>
                setTeamComposerState((current) => ({
                  ...current,
                  role: event.target.value as TeamComposerState["role"],
                }))
              }
              disabled={!canManageMembers}
              className="w-full rounded-[1.1rem] bg-surface-container-lowest px-4 py-3.5 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/12 focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="EDITOR">Editor</option>
              <option value="ADMIN">Admin</option>
              <option value="OWNER">Owner</option>
            </select>
          </div>

          <div className="rounded-[1.2rem] bg-surface-container-low px-4 py-4 text-sm text-on-surface-variant">
            <p className="font-semibold text-on-surface">Important</p>
            <p className="mt-1">
              The invited user must already be registered in Aroma before you
              assign them to this workspace.
            </p>
            {!canManageMembers ? (
              <p className="mt-2 font-medium text-error">
                Only the restaurant owner can change team access.
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          {teamMessage ? (
            <p className="text-sm font-medium text-on-surface-variant">
              {teamMessage}
            </p>
          ) : (
            <p className="text-sm font-medium text-on-surface-variant">
              Reusing an existing email updates that member&apos;s role.
            </p>
          )}

          <button
            type="button"
            onClick={() => void handleSubmitMember()}
            disabled={isSavingMember || !canManageMembers}
            className="flex items-center gap-2 rounded-[1rem] bg-gradient-to-br from-primary to-primary-container px-6 py-3.5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(182,23,34,0.2)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSavingMember ? <span className="spinner-sm" /> : null}
            Save Member Access
          </button>
        </div>
      </div>
    </section>
  );

  const renderMainContent = () => {
    if (activeTab === "menus") {
      return (
        <section className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
          <div className="rounded-[1.7rem] border border-slate-100 bg-white p-6 shadow-[0_16px_36px_rgba(18,28,42,0.05)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-[-0.03em] text-on-surface">
                  Menu Categories
                </h2>
                <p className="mt-1 text-sm font-medium text-on-surface-variant">
                  Structure the customer experience with clean category names,
                  publish states, and ordering.
                </p>
              </div>

              <button
                type="button"
                onClick={handleStartCreateMenu}
                className="rounded-[1rem] bg-gradient-to-br from-primary to-primary-container px-5 py-3 text-sm font-bold text-white shadow-[0_14px_28px_rgba(182,23,34,0.18)] transition-transform hover:-translate-y-0.5"
              >
                Add Category
              </button>
            </div>

            <div className="mt-6 grid gap-4">
              {sortedMenus.length === 0 ? (
                <div className="rounded-[1.35rem] border border-dashed border-slate-200 bg-surface-container-low px-5 py-8 text-center">
                  <p className="text-sm font-bold text-on-surface">
                    No menu categories yet
                  </p>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    Create your first category to organize dishes before you go
                    live.
                  </p>
                </div>
              ) : (
                sortedMenus.map((menu, index) => (
                  <div
                    key={menu.id}
                    className={cn(
                      "rounded-[1.35rem] border px-5 py-5 transition-all",
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
                            index === sortedMenus.length - 1 ||
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
                      </div>
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
                        Create Dish Here
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
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[1.7rem] border border-slate-100 bg-white p-6 shadow-[0_16px_36px_rgba(18,28,42,0.05)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  {menuComposerState.mode === "edit" ? "Edit Category" : "Create Category"}
                </p>
                <h3 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-on-surface">
                  {menuComposerState.mode === "edit"
                    ? "Refine this menu category"
                    : "Add a new category"}
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
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Category Name
                </label>
                <input
                  type="text"
                  value={menuComposerState.name}
                  onChange={(event) =>
                    setMenuComposerState((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className="w-full rounded-[1.1rem] bg-surface-container-lowest px-4 py-3.5 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/12 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Sort Order
                </label>
                <input
                  type="number"
                  min="0"
                  value={menuComposerState.sortOrder}
                  onChange={(event) =>
                    setMenuComposerState((current) => ({
                      ...current,
                      sortOrder: event.target.value,
                    }))
                  }
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
                  className="h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary"
                />
              </label>
            </div>

            <div className="mt-6 rounded-[1.2rem] bg-surface-container-low px-4 py-4 text-sm text-on-surface-variant">
              <p className="font-semibold text-on-surface">Current selection</p>
              <p className="mt-1">
                {selectedMenu
                  ? `${selectedMenu.name} currently holds ${selectedMenu.dishes.length} dish${selectedMenu.dishes.length === 1 ? "" : "es"}.`
                  : "Choose a category to make it the default for new dishes."}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              {menuMessage ? (
                <p className="text-sm font-medium text-on-surface-variant">
                  {menuMessage}
                </p>
              ) : (
                <p className="text-sm font-medium text-on-surface-variant">
                  Use order slots to control how categories appear in the menu.
                </p>
              )}

              <button
                type="button"
                onClick={() => void handleSubmitMenu()}
                disabled={isSavingMenu}
                className="flex items-center gap-2 rounded-[1rem] bg-gradient-to-br from-primary to-primary-container px-6 py-3.5 text-sm font-bold text-white shadow-[0_14px_28px_rgba(182,23,34,0.2)] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSavingMenu ? <span className="spinner-sm" /> : null}
                {menuComposerState.mode === "edit" ? "Save Category" : "Create Category"}
              </button>
            </div>
          </div>
        </section>
      );
    }

    if (activeTab === "team") {
      return renderTeamSection();
    }

    if (activeTab === "settings") {
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
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Restaurant Name
                </label>
                <input
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
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Public Slug
                </label>
                <div className="flex overflow-hidden rounded-[1.1rem] bg-surface-container-lowest ring-1 ring-outline-variant/12 focus-within:ring-2 focus-within:ring-primary/20">
                  <span className="border-r border-slate-100 px-4 py-3.5 text-sm font-semibold text-on-surface-variant">
                    /r/
                  </span>
                  <input
                    type="text"
                    value={settingsFormState.publicId}
                    onChange={(event) =>
                      setSettingsFormState((current) => ({
                        ...current,
                        publicId: event.target.value.toLowerCase(),
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

              <label className="flex items-center justify-between gap-4 rounded-[1.15rem] bg-surface-container-low px-4 py-4">
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

              <div className="rounded-[1.2rem] bg-surface-container-low px-4 py-4 text-sm text-on-surface-variant">
                <p className="font-semibold text-on-surface">Permissions</p>
                <p className="mt-1">
                  Owners and admins can update identity settings. Editors can
                  still use QR tools and review the current public setup.
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
                    <p className="mt-3 text-sm font-medium">
                      QR preview loads here
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-[1rem] bg-white px-4 py-4">
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
                disabled={isCopyingQr}
                className="rounded-[1rem] bg-surface-container-low px-4 py-3 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isCopyingQr ? "Copying..." : "Copy Public Link"}
              </button>
              <button
                type="button"
                onClick={() => void handleDownloadQr("png")}
                className="rounded-[1rem] bg-surface-container-low px-4 py-3 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container"
              >
                Download PNG
              </button>
              <button
                type="button"
                onClick={() => void handleDownloadQr("svg")}
                className="rounded-[1rem] bg-surface-container-low px-4 py-3 text-sm font-bold text-on-surface transition-colors hover:bg-surface-container"
              >
                Download SVG
              </button>
              <button
                type="button"
                onClick={() => void handleOpenPublicPage()}
                className="rounded-[1rem] bg-gradient-to-br from-primary to-primary-container px-4 py-3 text-sm font-bold text-white shadow-[0_14px_28px_rgba(182,23,34,0.18)] transition-transform hover:-translate-y-0.5"
              >
                Open Public Page
              </button>
            </div>
          </div>
        </section>
      );
    }

    return (
      <>
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4 px-1">
            <div>
              <h2 className="text-2xl font-bold tracking-[-0.03em] text-on-surface">
                Active Dishes
              </h2>
              <p className="mt-1 text-sm font-medium text-on-surface-variant">
                Select a dish to review its current media status or edit it.
              </p>
            </div>

            <div className="rounded-full bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant shadow-[0_8px_20px_rgba(18,28,42,0.04)]">
              {sortedMenus.length} Menu{sortedMenus.length === 1 ? "" : "s"}
            </div>
          </div>

          <div className="overflow-hidden rounded-[1.7rem] border border-slate-100 bg-white shadow-[0_16px_36px_rgba(18,28,42,0.05)]">
            <div className="hidden grid-cols-[2fr_2fr_1.2fr_0.9fr_0.9fr_1fr] gap-4 bg-slate-50/65 px-6 py-4 text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant md:grid">
              <span>Dish Asset</span>
              <span>Description</span>
              <span>Category</span>
              <span>Price</span>
              <span>Status</span>
              <span className="text-right">Actions</span>
            </div>

            <div className="divide-y divide-slate-50">
              {dishRows.length === 0 ? (
                <div className="px-6 py-10">
                  <p className="text-sm font-semibold text-on-surface">
                    No dishes yet.
                  </p>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    Create your first dish from the button in the header to
                    start building this workspace.
                  </p>
                </div>
              ) : (
                dishRows.map((dish) => {
                  const modelAsset = getAssetByKind(dish.assets, "MODEL_3D");
                  const thumbnailAsset = getAssetByKind(dish.assets, "THUMBNAIL");

                  return (
                    <div
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
                        "grid w-full gap-4 px-6 py-5 text-left transition-colors md:grid-cols-[2fr_2fr_1.2fr_0.9fr_0.9fr_1fr]",
                        selectedDish?.id === dish.id
                          ? "bg-primary/4"
                          : "hover:bg-slate-50/60",
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="h-12 w-12 overflow-hidden rounded-xl bg-surface-container-low">
                          {thumbnailAsset?.url ? (
                            <img
                              src={thumbnailAsset.url}
                              alt={dish.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-300">
                              <span className="material-symbols-outlined">image</span>
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-on-surface">
                            {dish.name}
                          </p>
                          <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-on-surface-variant">
                            <span className="material-symbols-outlined text-[0.9rem]">
                              view_in_ar
                            </span>
                            {modelAsset?.status === "READY"
                              ? "3D Model Ready"
                              : "No 3D Model"}
                          </div>
                        </div>
                      </div>

                      <p className="line-clamp-2 text-sm leading-6 text-on-surface-variant">
                        {dish.description || "No description added yet."}
                      </p>

                      <div className="self-center">
                        <span className="inline-flex rounded-lg bg-surface-container-low px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                          {dish.menuName}
                        </span>
                      </div>

                      <div className="self-center text-base font-bold text-on-surface">
                        {formatPrice(dish.price)}
                      </div>

                      <div className="self-center">
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
                      </div>

                      <div className="flex items-center justify-end gap-2 self-center">
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
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      </>
    );
  };

  const renderAsideCard = () => {
    if (activeTab === "menus") {
      return (
        <div className="rounded-[1.4rem] border border-slate-100 bg-white p-5 shadow-[0_16px_36px_rgba(18,28,42,0.05)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
            Category Summary
          </p>
          <h3 className="mt-2 text-xl font-bold tracking-[-0.03em] text-on-surface">
            {selectedMenu?.name ?? "No category selected"}
          </h3>
          <p className="mt-1 text-sm font-medium text-on-surface-variant">
            {selectedMenu
              ? `${selectedMenu.dishes.length} dish${selectedMenu.dishes.length === 1 ? "" : "es"} linked · ${selectedMenu.isPublished ? "Published" : "Draft"}`
              : "Create a category to start organizing your dishes."}
          </p>

          <div className="mt-5 grid gap-3">
            <div className="rounded-[1rem] bg-surface-container-low px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                Total Categories
              </p>
              <p className="mt-1 text-sm font-semibold text-on-surface">
                {sortedMenus.length}
              </p>
            </div>

            <div className="rounded-[1rem] bg-surface-container-low px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                Published Categories
              </p>
              <p className="mt-1 text-sm font-semibold text-on-surface">
                {sortedMenus.filter((menu) => menu.isPublished).length}
              </p>
            </div>
          </div>
        </div>
      );
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
            Current access level: {currentMembership?.role ?? "Unknown"}.
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
                Editors
              </p>
              <p className="mt-1 text-sm font-semibold text-on-surface">
                {restaurant.members.filter((member) => member.role === "EDITOR").length}
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
            {restaurant.isPublished ? "Publicly live" : "Private draft"}
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
                {canManageSettings ? "Admin controls enabled" : "View-only"}
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (!selectedDish) {
      return null;
    }

    return (
      <div className="rounded-[1.4rem] border border-slate-100 bg-white p-5 shadow-[0_16px_36px_rgba(18,28,42,0.05)]">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
          Current Selection
        </p>
        <h3 className="mt-2 text-xl font-bold tracking-[-0.03em] text-on-surface">
          {selectedDish.name}
        </h3>
        <p className="mt-1 text-sm font-medium text-on-surface-variant">
          {selectedDish.description ||
            "Select edit to attach or refresh assets for this dish."}
        </p>

        <div className="mt-5 grid gap-3">
          <div className="rounded-[1rem] bg-surface-container-low px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
              3D Model
            </p>
            <p className="mt-1 text-sm font-semibold text-on-surface">
              {getAssetByKind(selectedDish.assets, "MODEL_3D")?.status ??
                "Not attached"}
            </p>
          </div>

          <div className="rounded-[1rem] bg-surface-container-low px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
              Thumbnail
            </p>
            <p className="mt-1 text-sm font-semibold text-on-surface">
              {getAssetByKind(selectedDish.assets, "THUMBNAIL")?.status ??
                "Not attached"}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-surface">
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

      <WorkspaceSidebar ownerLabel={resolveOwnerLabel(restaurant)} />

      <main className="min-h-screen md:ml-64">
        <WorkspaceHeader
          restaurantName={restaurant.name}
          publicId={restaurant.publicId}
          qrState={qrState}
          isCopyingQr={isCopyingQr}
          onCopyQr={handleCopyQr}
          onCreateDish={handleStartCreate}
        />

        <div className="flex flex-col gap-8 bg-slate-50/55 px-6 py-8 md:px-8 xl:flex-row">
          <div className="min-w-0 flex-1 space-y-6">
            <div className="flex w-full flex-wrap items-center gap-2 rounded-[1.3rem] bg-surface-container-low p-1.5">
              {workspaceTabs.map((tab) => (
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
            {renderMainContent()}
          </div>

          <aside className="flex w-full shrink-0 flex-col gap-6 xl:w-[24rem]">
            <ReadinessCard
              readinessPercent={readinessPercent}
              hasMenu={sortedMenus.length > 0}
              publishedDishesCount={publishedDishesCount}
              readyModelCount={readyModelCount}
              isPublished={restaurant.isPublished}
              isPublishing={isPublishing}
              onGoLive={handlePublishWorkspace}
            />

            {publishMessage ? (
              <div className="rounded-[1.2rem] bg-surface-container-low px-4 py-4 text-sm font-medium text-on-surface-variant">
                {publishMessage}
              </div>
            ) : null}

            {renderAsideCard()}
          </aside>
        </div>
      </main>

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
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Dish Name
                </label>
                <input
                  type="text"
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
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Menu Category
                </label>
                <select
                  value={selectedMenuId}
                  onChange={(event) => setSelectedMenuId(event.target.value)}
                  className="w-full rounded-[1.1rem] bg-surface-container-lowest px-4 py-3.5 text-sm font-medium text-on-surface outline-none ring-1 ring-outline-variant/12 focus:ring-2 focus:ring-primary/20"
                >
                  {sortedMenus.length === 0 ? (
                    <option value="">Primary Menu will be created automatically</option>
                  ) : null}
                  {sortedMenus.map((menu) => (
                    <option key={menu.id} value={menu.id}>
                      {menu.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Price
                </label>
                <input
                  type="number"
                  min="1"
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

              <div className="md:col-span-2">
                <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">
                  Description
                </label>
                <textarea
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
    </div>
  );
}
