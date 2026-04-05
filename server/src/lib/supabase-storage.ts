import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { config } from "../utils/conf.js";

let cachedClient: SupabaseClient | null = null;
let bucketEnsured = false;

const getSupabaseAdminClient = (): SupabaseClient => {
  if (cachedClient) {
    return cachedClient;
  }

  if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  cachedClient = createClient(
    config.SUPABASE_URL,
    config.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );

  return cachedClient;
};

export const getStoragePublicUrl = (storageKey: string): string => {
  const normalizedBase =
    config.ASSET_CDN_BASE_URL.trim() || config.SUPABASE_URL.trim();
  const cleanedBase = normalizedBase.replace(/\/$/, "");

  if (config.ASSET_CDN_BASE_URL.trim()) {
    return `${cleanedBase}/${storageKey}`;
  }

  return `${cleanedBase}/storage/v1/object/public/${config.SUPABASE_STORAGE_BUCKET}/${storageKey}`;
};

export const ensureStorageBucket = async (): Promise<void> => {
  if (bucketEnsured) {
    return;
  }

  const client = getSupabaseAdminClient();
  const { data, error } = await client.storage.listBuckets();
  if (error) {
    throw new Error(`Failed to list storage buckets: ${error.message}`);
  }

  const bucketExists = data.some(
    (bucket) => bucket.name === config.SUPABASE_STORAGE_BUCKET,
  );

  if (!bucketExists) {
    const { error: createError } = await client.storage.createBucket(
      config.SUPABASE_STORAGE_BUCKET,
      {
        public: true,
        fileSizeLimit: config.SUPABASE_STORAGE_FILE_SIZE_LIMIT_BYTES,
      },
    );

    if (createError) {
      throw new Error(
        `Failed to create storage bucket ${config.SUPABASE_STORAGE_BUCKET}: ${createError.message}`,
      );
    }
  }

  bucketEnsured = true;
};

export const createSignedUpload = async (storageKey: string) => {
  const client = getSupabaseAdminClient();
  const { data, error } = await client.storage
    .from(config.SUPABASE_STORAGE_BUCKET)
    .createSignedUploadUrl(storageKey);

  if (error || !data) {
    throw new Error(
      `Failed to create signed upload URL: ${error?.message ?? "Unknown error"}`,
    );
  }

  const signedUrl = data.signedUrl.startsWith("http")
    ? data.signedUrl
    : `${config.SUPABASE_URL}${data.signedUrl}`;

  return {
    signedUrl,
    token: data.token,
    path: data.path,
    publicUrl: getStoragePublicUrl(storageKey),
  };
};

export const removeStorageObjects = async (
  storageKeys: string[],
): Promise<void> => {
  if (storageKeys.length === 0) {
    return;
  }

  const client = getSupabaseAdminClient();
  const { error } = await client.storage
    .from(config.SUPABASE_STORAGE_BUCKET)
    .remove(storageKeys);

  if (error) {
    throw new Error(`Failed to remove storage objects: ${error.message}`);
  }
};
