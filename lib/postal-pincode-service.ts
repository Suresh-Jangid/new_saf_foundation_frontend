/**
 * Postal PIN Code Autocomplete Service
 * Provides reliable, debounced, and cached PIN code lookups for Indian postal codes.
 * Primary source: https://api.postalpincode.in (India Post Public Directory).
 * Also falls back to /api/postal-lookup proxy if available.
 */

export interface PostOfficeRecord {
  name: string;
  description?: string;
  branchType?: string;
  deliveryStatus?: string;
  circle?: string;
  district: string;
  division?: string;
  region?: string;
  block: string;
  state: string;
  country?: string;
  pincode: string;
}

export interface PincodeLookupResponse {
  pincode: string;
  status: "success" | "not_found" | "error";
  message?: string;
  state: string;
  district: string;
  tehsil: string;
  city?: string;
  postOffices: PostOfficeRecord[];
  localities: string[];
}

// In-memory cache for session
const pincodeCache = new Map<string, PincodeLookupResponse>();
// In-flight promises to deduplicate concurrent requests
const inFlightRequests = new Map<string, Promise<PincodeLookupResponse>>();

/**
 * Normalizes block name by removing NA, empty strings, or placeholders
 */
export function sanitizeBlockName(block?: string): string {
  if (!block) return "";
  const trimmed = block.trim();
  const lower = trimmed.toLowerCase();
  if (lower === "na" || lower === "n/a" || lower === "not available" || lower === "-" || lower === "none") {
    return "";
  }
  return trimmed;
}

/**
 * Normalizes title case for city/state/district names
 */
export function toTitleCase(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
    .trim();
}

/**
 * Parses raw India Post API response into PincodeLookupResponse
 */
export function parseIndiaPostResponse(pincode: string, rawData: any): PincodeLookupResponse {
  if (!Array.isArray(rawData) || rawData.length === 0) {
    return {
      pincode,
      status: "not_found",
      message: "पिन कोड नहीं मिला / No records found for this PIN code",
      state: "",
      district: "",
      tehsil: "",
      postOffices: [],
      localities: [],
    };
  }

  const result = rawData[0];
  if (result?.Status !== "Success" || !Array.isArray(result?.PostOffice) || result.PostOffice.length === 0) {
    return {
      pincode,
      status: "not_found",
      message: result?.Message || "अमान्य पिन कोड / Invalid PIN code",
      state: "",
      district: "",
      tehsil: "",
      postOffices: [],
      localities: [],
    };
  }

  const postOffices: PostOfficeRecord[] = result.PostOffice.map((po: any) => ({
    name: (po.Name || "").trim(),
    description: po.Description || "",
    branchType: po.BranchType || "",
    deliveryStatus: po.DeliveryStatus || "",
    circle: po.Circle || "",
    district: (po.District || "").trim(),
    division: po.Division || "",
    region: po.Region || "",
    block: (po.Block || "").trim(),
    state: (po.State || "").trim(),
    country: po.Country || "India",
    pincode: po.Pincode || pincode,
  }));

  // Determine primary state and district (from most common or first record)
  const primaryState = postOffices[0]?.state || "";
  const primaryDistrict = postOffices[0]?.district || "";

  // Find a valid Block name to suggest as Tehsil if available
  let primaryTehsil = "";
  for (const po of postOffices) {
    const cleanBlock = sanitizeBlockName(po.block);
    if (cleanBlock) {
      primaryTehsil = cleanBlock;
      break;
    }
  }

  const localities = Array.from(new Set(postOffices.map((po) => po.name).filter(Boolean)));
  const primaryCity = postOffices[0]?.district || "";

  return {
    pincode,
    status: "success",
    message: result.Message || `Found ${postOffices.length} post office(s)`,
    state: primaryState,
    district: primaryDistrict,
    tehsil: primaryTehsil,
    city: primaryCity,
    postOffices,
    localities,
  };
}

/**
 * Fetch PIN code details with caching and timeout
 */
export async function lookupPostalPincode(
  pincode: string,
  options: { timeoutMs?: number; signal?: AbortSignal } = {}
): Promise<PincodeLookupResponse> {
  const cleanPin = (pincode || "").replace(/\D/g, "").slice(0, 6);

  if (cleanPin.length !== 6) {
    return {
      pincode: cleanPin,
      status: "not_found",
      message: "पिन कोड 6 अंकों का होना चाहिए / PIN code must be 6 digits",
      state: "",
      district: "",
      tehsil: "",
      postOffices: [],
      localities: [],
    };
  }

  // Check cache
  if (pincodeCache.has(cleanPin)) {
    return pincodeCache.get(cleanPin)!;
  }

  // Check in-flight request
  if (inFlightRequests.has(cleanPin)) {
    return inFlightRequests.get(cleanPin)!;
  }

  const timeoutMs = options.timeoutMs ?? 6000;

  const fetchPromise = (async () => {
    // Attempt 1: Next.js internal API proxy /api/postal-lookup (faster, avoids client CORS/firewalls)
    let fetchedData: any = null;
    let fetchError: any = null;

    // Check if running in browser
    if (typeof window !== "undefined") {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(`/api/postal-lookup?pincode=${cleanPin}`, {
          signal: options.signal || controller.signal,
          headers: { Accept: "application/json" },
        });
        clearTimeout(timer);

        if (response.ok) {
          const json = await response.json();
          if (json && (json.status === "success" || json.status === "not_found")) {
            pincodeCache.set(cleanPin, json);
            return json;
          }
        }
      } catch (err: any) {
        if (err.name === "AbortError") {
          throw err;
        }
        // Fallback to direct external API
      }
    }

    // Attempt 2: Direct call to India Post public API
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`, {
        signal: options.signal || controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`Postal API returned status ${response.status}`);
      }
      fetchedData = await response.json();
    } catch (err: any) {
      fetchError = err;
    }

    if (fetchedData) {
      const parsed = parseIndiaPostResponse(cleanPin, fetchedData);
      pincodeCache.set(cleanPin, parsed);
      return parsed;
    }

    // Return error state without throwing
    const errorResponse: PincodeLookupResponse = {
      pincode: cleanPin,
      status: "error",
      message:
        fetchError?.name === "AbortError"
          ? "अनुरोध समय समाप्त (Request timed out)"
          : "पिन कोड सेवा अस्थायी रूप से अनुपलब्ध है। कृपया मैन्युअल दर्ज करें। (Postal service unavailable, enter manually)",
      state: "",
      district: "",
      tehsil: "",
      postOffices: [],
      localities: [],
    };
    return errorResponse;
  })();

  inFlightRequests.set(cleanPin, fetchPromise);

  try {
    const result = await fetchPromise;
    return result;
  } finally {
    inFlightRequests.delete(cleanPin);
  }
}
