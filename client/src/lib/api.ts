const rawApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:5000";

export const apiBaseUrl = rawApiBaseUrl.replace(/\/$/, "");

const getServerApiBaseUrl = () =>
  (
    process.env.API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    "http://localhost:5000"
  ).replace(/\/$/, "");

export type CurrencyCode = "USD" | "INR" | "EUR" | "GBP" | "AED";

export type CrossSellItem = {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  imageStorageKey: string | null;
};

type ApiErrorPayload = {
  error?: string;
  message?: string;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  mobile: string | null;
  companyName: string | null;
  location: string | null;
  profilePicUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MeResponse = AuthUser & {
  memberships: Array<{
    id: string;
    role: string;
    restaurant: {
      id: string;
      name: string;
      publicId: string;
      isActive: boolean;
      isPublished: boolean;
    };
  }>;
};

export type RestaurantMemberSummary = {
  id: string;
  role: string;
  user: {
    id: string;
    email: string;
  };
};

export type AssetSummary = {
  id: string;
  kind: "MODEL_3D" | "THUMBNAIL" | "POSTER" | "CROSS_SELL_IMAGE";
  status: "PENDING" | "READY" | "FAILED";
  storageKey: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
};

export type AssetUploadResponse = {
  asset: AssetSummary & {
    publicUrl: string;
  };
  upload: {
    method: "PUT";
    bucket: string;
    signedUrl: string;
    token: string;
    storageKey: string;
    publicUrl: string;
    headers: {
      "Content-Type": string;
    };
  };
};

export type DishSummary = {
  id: string;
  name: string;
  price: number;
  currency: CurrencyCode;
  description: string | null;
  badgeLabel: string | null;
  servingSize: number;
  detailsPanelEnabled: boolean;
  crossSellItems: CrossSellItem[];
  isPublished: boolean;
  sortOrder: number;
  dietaryType: "VEG" | "NON_VEG" | "BOTH" | null;
  assets: AssetSummary[];
};

export type CategorySummary = {
  id: string;
  name: string;
  mainMenuId: string;
  isPublished: boolean;
  sortOrder: number;
  dishes: DishSummary[];
};

export type MenuSummary = {
  id: string;
  name: string;
  isPublished: boolean;
  sortOrder: number;
  categories: CategorySummary[];
};

export type RestaurantDetails = {
  id: string;
  name: string;
  publicId: string;
  ownerId: string;
  isActive: boolean;
  isPublished: boolean;
  publicMenuSnapshotUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  members: RestaurantMemberSummary[];
  menus: MenuSummary[];
};

export type RestaurantCardData = MeResponse["memberships"][number]["restaurant"] & {
  role: string;
};

export type PublicDishPayload = {
  id: string;
  name: string;
  price: number;
  currency: CurrencyCode;
  description: string | null;
  badgeLabel: string | null;
  servingSize: number;
  detailsPanelEnabled: boolean;
  crossSellItems: CrossSellItem[];
  sortOrder: number;
  dietaryType: "VEG" | "NON_VEG" | "BOTH" | null;
  modelUrl: string | null;
  /** LOD-0: simplified low-poly version that loads in ~200ms for instant first-tap display */
  lodUrl: string | null;
  thumbnailUrl: string | null;
  posterUrl: string | null;
};

export type PublicCategoryPayload = {
  id: string;
  name: string;
  sortOrder: number;
  dishes: PublicDishPayload[];
};

export type PublicMenuPayload = {
  id: string;
  name: string;
  sortOrder: number;
  categories: PublicCategoryPayload[];
};

export type PublicRestaurantPayload = {
  id: string;
  publicId: string;
  name: string;
  menus: PublicMenuPayload[];
  generatedAt: string;
};

export type RestaurantQrPayload = {
  restaurantId: string;
  publicId: string;
  publicUrl: string;
  qrCodeDataUrl: string;
  qrCodeSvg: string;
};

type ApiRequestOptions = {
  token?: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
};

type LegacyMenuSummary = Omit<MenuSummary, "categories"> & {
  categories?: CategorySummary[];
  dishes?: DishSummary[];
};

type LegacyPublicMenuPayload = Omit<PublicMenuPayload, "categories"> & {
  categories?: PublicCategoryPayload[];
  dishes?: PublicDishPayload[];
};

const supportedCurrencyCodes: CurrencyCode[] = [
  "USD",
  "INR",
  "EUR",
  "GBP",
  "AED",
];

const normalizeCurrencyCode = (value: unknown): CurrencyCode =>
  typeof value === "string" &&
  supportedCurrencyCodes.includes(value as CurrencyCode)
    ? (value as CurrencyCode)
    : "USD";

const readErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    return payload.error || payload.message || "Request failed";
  } catch {
    try {
      const text = await response.text();
      const cleaned = text
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return cleaned || "Request failed";
    } catch {
      return "Request failed";
    }
  }
};

const apiRequest = async <T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.token
        ? { Authorization: `Bearer ${options.token}` }
        : {}),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    // For authenticated / mutating requests keep no-store.
    // Public read-only fetches can opt in to browser caching via cache headers.
    cache: options.token || options.method ? "no-store" : "default",
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as T;
};

const normalizeDishSummary = (dish: DishSummary): DishSummary => ({
  ...dish,
  currency: normalizeCurrencyCode(dish.currency),
  crossSellItems: Array.isArray(dish.crossSellItems) ? dish.crossSellItems : [],
  assets: Array.isArray(dish.assets) ? dish.assets : [],
});

const normalizeCategorySummary = (
  category: CategorySummary,
  fallbackMainMenuId: string,
): CategorySummary => ({
  ...category,
  mainMenuId: category.mainMenuId || fallbackMainMenuId,
  dishes: Array.isArray(category.dishes)
    ? category.dishes.map(normalizeDishSummary)
    : [],
});

const createFallbackCategory = (menu: LegacyMenuSummary): CategorySummary => ({
  id: `${menu.id}__general`,
  name: "General",
  mainMenuId: menu.id,
  isPublished: menu.isPublished,
  sortOrder: 0,
  dishes: Array.isArray(menu.dishes)
    ? menu.dishes.map(normalizeDishSummary)
    : [],
});

const normalizeMenuSummary = (menu: LegacyMenuSummary): MenuSummary => ({
  id: menu.id,
  name: menu.name,
  isPublished: menu.isPublished,
  sortOrder: menu.sortOrder,
  categories: Array.isArray(menu.categories)
    ? menu.categories.map((category) =>
        normalizeCategorySummary(category, menu.id),
      )
    : Array.isArray(menu.dishes) && menu.dishes.length > 0
      ? [createFallbackCategory(menu)]
      : [],
});

const normalizeRestaurantDetails = (
  restaurant: RestaurantDetails,
): RestaurantDetails => ({
  ...restaurant,
  members: Array.isArray(restaurant.members) ? restaurant.members : [],
  menus: Array.isArray(restaurant.menus)
    ? restaurant.menus.map((menu) =>
        normalizeMenuSummary(menu as LegacyMenuSummary),
      )
    : [],
});

const normalizePublicDishPayload = (
  dish: PublicDishPayload,
): PublicDishPayload => ({
  ...dish,
  currency: normalizeCurrencyCode(dish.currency),
  crossSellItems: Array.isArray(dish.crossSellItems) ? dish.crossSellItems : [],
});

const normalizePublicCategoryPayload = (
  category: PublicCategoryPayload,
): PublicCategoryPayload => ({
  ...category,
  dishes: Array.isArray(category.dishes)
    ? category.dishes.map(normalizePublicDishPayload)
    : [],
});

const createFallbackPublicCategory = (
  menu: LegacyPublicMenuPayload,
): PublicCategoryPayload => ({
  id: `${menu.id}__general`,
  name: "General",
  sortOrder: 0,
  dishes: Array.isArray(menu.dishes)
    ? menu.dishes.map(normalizePublicDishPayload)
    : [],
});

const normalizePublicMenuPayload = (
  menu: LegacyPublicMenuPayload,
): PublicMenuPayload => ({
  id: menu.id,
  name: menu.name,
  sortOrder: menu.sortOrder,
  categories: Array.isArray(menu.categories)
    ? menu.categories.map(normalizePublicCategoryPayload)
    : Array.isArray(menu.dishes) && menu.dishes.length > 0
      ? [createFallbackPublicCategory(menu)]
      : [],
});

const normalizePublicRestaurantPayload = (
  restaurant: PublicRestaurantPayload,
): PublicRestaurantPayload => ({
  ...restaurant,
  menus: Array.isArray(restaurant.menus)
    ? restaurant.menus.map((menu) =>
        normalizePublicMenuPayload(menu as LegacyPublicMenuPayload),
      )
    : [],
});

export const loginRequest = async (input: {
  email: string;
  password: string;
}): Promise<{ user: AuthUser; token: string }> => {
  return apiRequest<{ user: AuthUser; token: string }>("/api/v1/auth/login", {
    method: "POST",
    body: input,
  });
};

export const fetchCurrentUser = async (token: string): Promise<MeResponse> => {
  return apiRequest<MeResponse>("/api/v1/auth/me", {
    token,
  });
};

export const fetchPublicRestaurant = async (
  publicId: string,
): Promise<PublicRestaurantPayload> => {
  const payload = await apiRequest<PublicRestaurantPayload>(
    `/api/v1/public/r/${publicId}`,
  );
  return normalizePublicRestaurantPayload(payload);
};

export const fetchPublicRestaurantServer = async (
  publicId: string,
): Promise<PublicRestaurantPayload> => {
  const response = await fetch(
    `${getServerApiBaseUrl()}/api/v1/public/r/${publicId}`,
    {
      // Cache the public menu on the Next.js server for 60 s.
      // This means the first visitor fetches from the backend;
      // every subsequent visitor within that window gets the
      // pre-rendered response instantly — no backend round-trip.
      next: { revalidate: 60 },
    },
  );

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const payload = (await response.json()) as PublicRestaurantPayload;
  return normalizePublicRestaurantPayload(payload);
};

export const createRestaurant = async (
  token: string,
  input: { name: string },
): Promise<RestaurantCardData> => {
  return apiRequest<RestaurantCardData>("/api/v1/restaurants", {
    token,
    method: "POST",
    body: input,
  });
};

export const fetchRestaurant = async (
  token: string,
  restaurantId: string,
): Promise<RestaurantDetails> => {
  const payload = await apiRequest<RestaurantDetails>(
    `/api/v1/restaurants/${restaurantId}`,
    {
      token,
    },
  );
  return normalizeRestaurantDetails(payload);
};

export const updateRestaurant = async (
  token: string,
  restaurantId: string,
  input: {
    name?: string;
    publicId?: string;
    isActive?: boolean;
    isPublished?: boolean;
  },
): Promise<{
  id: string;
  name: string;
  publicId: string;
  ownerId: string;
  isActive: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}> => {
  return apiRequest(`/api/v1/restaurants/${restaurantId}`, {
    token,
    method: "PATCH",
    body: input,
  });
};

export const deleteRestaurant = async (
  token: string,
  restaurantId: string,
): Promise<{
  id: string;
  name: string;
  deleted: boolean;
}> => {
  return apiRequest(`/api/v1/restaurants/${restaurantId}`, {
    token,
    method: "DELETE",
  });
};

export const generateRestaurantQr = async (
  token: string,
  restaurantId: string,
): Promise<RestaurantQrPayload> => {
  return apiRequest<RestaurantQrPayload>(`/api/v1/restaurants/${restaurantId}/qr`, {
    token,
    method: "POST",
  });
};

export const addRestaurantMember = async (
  token: string,
  restaurantId: string,
  input: {
    email: string;
    role: "OWNER" | "ADMIN" | "MANAGER";
  },
): Promise<RestaurantMemberSummary & { createdAt: string; updatedAt: string }> => {
  return apiRequest(`/api/v1/restaurants/${restaurantId}/members`, {
    token,
    method: "POST",
    body: input,
  });
};

export const createRestaurantManagerAccount = async (
  token: string,
  restaurantId: string,
  input: {
    email: string;
    password: string;
  },
): Promise<
  {
    createdUser: boolean;
    membership: RestaurantMemberSummary & {
      createdAt: string;
      updatedAt: string;
    };
  }
> => {
  return apiRequest(`/api/v1/restaurants/${restaurantId}/manager-account`, {
    token,
    method: "POST",
    body: input,
  });
};

export const createMenu = async (
  token: string,
  restaurantId: string,
  input: {
    name: string;
    isPublished?: boolean;
    sortOrder?: number;
  },
): Promise<{
  id: string;
  name: string;
  restaurantId: string;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}> => {
  return apiRequest(`/api/v1/restaurants/${restaurantId}/menus`, {
    token,
    method: "POST",
    body: input,
  });
};

export const updateMenu = async (
  token: string,
  menuId: string,
  input: {
    name?: string;
    isPublished?: boolean;
    sortOrder?: number;
  },
): Promise<{
  id: string;
  name: string;
  restaurantId: string;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}> => {
  return apiRequest(`/api/v1/menus/${menuId}`, {
    token,
    method: "PATCH",
    body: input,
  });
};

export const createCategory = async (
  token: string,
  menuId: string,
  input: {
    name: string;
    isPublished?: boolean;
    sortOrder?: number;
  },
): Promise<{
  id: string;
  name: string;
  restaurantId: string;
  mainMenuId: string;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}> => {
  return apiRequest(`/api/v1/menus/${menuId}/categories`, {
    token,
    method: "POST",
    body: input,
  });
};

export const updateCategory = async (
  token: string,
  categoryId: string,
  input: {
    name?: string;
    isPublished?: boolean;
    sortOrder?: number;
  },
): Promise<{
  id: string;
  name: string;
  restaurantId: string;
  mainMenuId: string;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}> => {
  return apiRequest(`/api/v1/categories/${categoryId}`, {
    token,
    method: "PATCH",
    body: input,
  });
};

export const deleteCategory = async (
  token: string,
  categoryId: string,
): Promise<{
  id: string;
  deleted: boolean;
}> => {
  return apiRequest(`/api/v1/categories/${categoryId}`, {
    token,
    method: "DELETE",
  });
};

export const deleteMenu = async (
  token: string,
  menuId: string,
): Promise<{
  id: string;
  deleted: boolean;
}> => {
  return apiRequest(`/api/v1/menus/${menuId}`, {
    token,
    method: "DELETE",
  });
};

export const createDish = async (
  token: string,
  categoryId: string,
  input: {
    name: string;
    price: number;
    currency: CurrencyCode;
    description?: string;
    badgeLabel?: string | null;
    servingSize?: number;
    detailsPanelEnabled?: boolean;
    crossSellItems?: CrossSellItem[];
    isPublished?: boolean;
    sortOrder?: number;
    dietaryType?: "VEG" | "NON_VEG" | "BOTH" | null;
  },
): Promise<{
  id: string;
  name: string;
  price: number;
  currency: CurrencyCode;
  description: string | null;
  badgeLabel: string | null;
  servingSize: number;
  detailsPanelEnabled: boolean;
  crossSellItems: CrossSellItem[];
  restaurantId: string;
  menuId: string;
  isPublished: boolean;
  sortOrder: number;
  dietaryType: "VEG" | "NON_VEG" | "BOTH" | null;
  createdAt: string;
  updatedAt: string;
}> => {
  return apiRequest(`/api/v1/categories/${categoryId}/dishes`, {
    token,
    method: "POST",
    body: input,
  });
};

export const updateDish = async (
  token: string,
  dishId: string,
  input: {
    menuId?: string;
    name?: string;
    price?: number;
    currency?: CurrencyCode;
    description?: string;
    badgeLabel?: string | null;
    servingSize?: number;
    detailsPanelEnabled?: boolean;
    crossSellItems?: CrossSellItem[];
    isPublished?: boolean;
    sortOrder?: number;
    dietaryType?: "VEG" | "NON_VEG" | "BOTH" | null;
  },
): Promise<{
  id: string;
  name: string;
  price: number;
  currency: CurrencyCode;
  description: string | null;
  badgeLabel: string | null;
  servingSize: number;
  detailsPanelEnabled: boolean;
  crossSellItems: CrossSellItem[];
  restaurantId: string;
  menuId: string;
  isPublished: boolean;
  sortOrder: number;
  dietaryType: "VEG" | "NON_VEG" | "BOTH" | null;
  createdAt: string;
  updatedAt: string;
}> => {
  return apiRequest(`/api/v1/dishes/${dishId}`, {
    token,
    method: "PATCH",
    body: input,
  });
};

export const deleteDish = async (
  token: string,
  dishId: string,
): Promise<{
  id: string;
  deleted: boolean;
}> => {
  return apiRequest(`/api/v1/dishes/${dishId}`, {
    token,
    method: "DELETE",
  });
};

export const createAssetUpload = async (
  token: string,
  input: {
    dishId: string;
    kind: "MODEL_3D" | "THUMBNAIL" | "POSTER" | "CROSS_SELL_IMAGE";
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  },
): Promise<AssetUploadResponse> => {
  return apiRequest<AssetUploadResponse>("/api/v1/assets/upload-url", {
    token,
    method: "POST",
    body: input,
  });
};

export const completeAssetUpload = async (
  token: string,
  assetId: string,
): Promise<{
  asset: AssetSummary & {
    publicUrl: string;
  };
}> => {
  return apiRequest(`/api/v1/assets/${assetId}/complete`, {
    token,
    method: "POST",
  });
};

export const uploadFileToSignedUrl = async ({
  signedUrl,
  file,
  mimeType,
}: {
  signedUrl: string;
  file: File;
  mimeType: string;
}): Promise<void> => {
  const response = await fetch(signedUrl, {
    method: "PUT",
    headers: {
      "Content-Type": mimeType,
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error("Upload to storage failed.");
  }
};

export const sendOtpRequest = async (input: {
  email: string;
}): Promise<{ success: boolean; message: string }> => {
  return apiRequest<{ success: boolean; message: string }>("/api/v1/auth/otp/send", {
    method: "POST",
    body: input,
  });
};

export const verifyOtpRequest = async (input: {
  email: string;
  code: string;
}): Promise<{ user: AuthUser; token: string }> => {
  return apiRequest<{ user: AuthUser; token: string }>("/api/v1/auth/otp/verify", {
    method: "POST",
    body: input,
  });
};

export type AvatarUploadResponse = {
  uploadUrl: string;
  publicUrl: string;
  token: string;
  storageKey: string;
};

export const getAvatarUploadUrl = async (
  token: string,
  input: {
    fileName: string;
    mimeType: string;
  },
): Promise<AvatarUploadResponse> => {
  return apiRequest<AvatarUploadResponse>("/api/v1/auth/profile/avatar-upload", {
    token,
    method: "POST",
    body: input,
  });
};

export const updateUserProfile = async (
  token: string,
  input: {
    name?: string;
    mobile?: string;
    companyName?: string;
    location?: string;
    profilePicUrl?: string;
  },
): Promise<AuthUser> => {
  return apiRequest<AuthUser>("/api/v1/auth/profile", {
    token,
    method: "PATCH",
    body: input,
  });
};

export type TeamMember = {
  id: string;
  email: string;
  name: string | null;
  profilePicUrl: string | null;
  role: string;
  restaurants: string[];
};

export const fetchTeamMembers = async (token: string): Promise<TeamMember[]> => {
  return apiRequest<TeamMember[]>("/api/v1/auth/team", {
    token,
    method: "GET",
  });
};
