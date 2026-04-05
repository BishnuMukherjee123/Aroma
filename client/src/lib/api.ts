const rawApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:5000";

export const apiBaseUrl = rawApiBaseUrl.replace(/\/$/, "");

type ApiErrorPayload = {
  error?: string;
  message?: string;
};

export type AuthUser = {
  id: string;
  email: string;
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
  kind: "MODEL_3D" | "THUMBNAIL" | "POSTER";
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
  description: string | null;
  isPublished: boolean;
  sortOrder: number;
  assets: AssetSummary[];
};

export type MenuSummary = {
  id: string;
  name: string;
  isPublished: boolean;
  sortOrder: number;
  dishes: DishSummary[];
};

export type RestaurantDetails = {
  id: string;
  name: string;
  publicId: string;
  ownerId: string;
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
  description: string | null;
  sortOrder: number;
  modelUrl: string | null;
  thumbnailUrl: string | null;
  posterUrl: string | null;
};

export type PublicMenuPayload = {
  id: string;
  name: string;
  sortOrder: number;
  dishes: PublicDishPayload[];
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

const readErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    return payload.error || payload.message || "Request failed";
  } catch {
    return "Request failed";
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
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as T;
};

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
  return apiRequest<PublicRestaurantPayload>(`/api/v1/public/r/${publicId}`);
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
  return apiRequest<RestaurantDetails>(`/api/v1/restaurants/${restaurantId}`, {
    token,
  });
};

export const updateRestaurant = async (
  token: string,
  restaurantId: string,
  input: {
    name?: string;
    publicId?: string;
    isPublished?: boolean;
  },
): Promise<{
  id: string;
  name: string;
  publicId: string;
  ownerId: string;
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
    role: "OWNER" | "ADMIN" | "EDITOR";
  },
): Promise<RestaurantMemberSummary & { createdAt: string; updatedAt: string }> => {
  return apiRequest(`/api/v1/restaurants/${restaurantId}/members`, {
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
  menuId: string,
  input: {
    name: string;
    price: number;
    description?: string;
    isPublished?: boolean;
    sortOrder?: number;
  },
): Promise<{
  id: string;
  name: string;
  price: number;
  description: string | null;
  restaurantId: string;
  menuId: string;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}> => {
  return apiRequest(`/api/v1/menus/${menuId}/dishes`, {
    token,
    method: "POST",
    body: input,
  });
};

export const updateDish = async (
  token: string,
  dishId: string,
  input: {
    name?: string;
    price?: number;
    description?: string;
    isPublished?: boolean;
    sortOrder?: number;
  },
): Promise<{
  id: string;
  name: string;
  price: number;
  description: string | null;
  restaurantId: string;
  menuId: string;
  isPublished: boolean;
  sortOrder: number;
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
    kind: "MODEL_3D" | "THUMBNAIL" | "POSTER";
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
