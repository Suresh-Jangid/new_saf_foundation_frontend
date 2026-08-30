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
