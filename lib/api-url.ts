const DEFAULT_HOST = "https://new-saf-foundation-backend.onrender.com";

/** Normalize legacy `/api/api.php` URLs to `/api`. */
export function normalizeApiBaseUrl(url: string): string {
  return url
    .replace(/\/api\/api\.php\/?$/i, "/api")
    .replace(/\/+$/, "");
}

/** Base URL for apicall requests (e.g. `https://new-saf-foundation-backend.onrender.com/api`). */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL;
  if (fromEnv) return normalizeApiBaseUrl(fromEnv);
  return `${DEFAULT_HOST}/api`;
}

/** Server origin without API path (e.g. `https://new-saf-foundation-backend.onrender.com`). */
export function getBackendOrigin(): string {
  try {
    return new URL(getApiBaseUrl()).origin;
  } catch {
    return DEFAULT_HOST;
  }
}

/** Static uploads URL (e.g. `https://new-saf-foundation-backend.onrender.com/uploads`). */
export function getUploadsBaseUrl(): string {
  return `${getBackendOrigin()}/uploads`;
}

/** ImageKit base URL endpoint (e.g. `https://ik.imagekit.io/safmedia`). */
export function getImageKitUrlEndpoint(): string {
  const fromEnv = process.env.IMAGEKIT_URL_ENDPOINT || process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  return "https://ik.imagekit.io/safmedia";
}

/** Permanent public storage base URL (ImageKit CDN endpoint prioritized, S3/CDN fallback). */
export function getStorageBaseUrl(): string {
  const imagekitUrl = getImageKitUrlEndpoint();
  if (imagekitUrl) return imagekitUrl;
  const fromEnv = process.env.NEXT_PUBLIC_STORAGE_URL || process.env.S3_PUBLIC_BASE_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  return getUploadsBaseUrl();
}
