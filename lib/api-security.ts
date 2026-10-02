import { NextRequest, NextResponse } from "next/server";

// In-memory sliding window request counters for DoS rate limiting
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // 60 PDF generations / min per IP

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown-client";
}

/**
 * Validates origin, rate limits, and request structure for internal PDF & action routes.
 */
export function validateApiRequest(
  req: NextRequest,
  options: {
    maxPerMinute?: number;
    requireValidBody?: boolean;
  } = {}
): { valid: boolean; response?: NextResponse } {
  const ip = getClientIp(req);
  const now = Date.now();
  const maxLimit = options.maxPerMinute || MAX_REQUESTS_PER_WINDOW;

  // Rate Limiting
  const clientData = ipRequestCounts.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };

  if (now > clientData.resetTime) {
    clientData.count = 1;
    clientData.resetTime = now + RATE_LIMIT_WINDOW_MS;
  } else {
    clientData.count++;
  }

  ipRequestCounts.set(ip, clientData);

  // Clean old entries periodically
  if (ipRequestCounts.size > 5000) {
    for (const [key, val] of ipRequestCounts.entries()) {
      if (now > val.resetTime) ipRequestCounts.delete(key);
    }
  }

  if (clientData.count > maxLimit) {
    return {
      valid: false,
      response: NextResponse.json(
        {
          error: "अनुरोध सीमा पार हो गई है / Rate limit exceeded. Please wait a minute.",
        },
        { status: 429 }
      ),
    };
  }

  // Origin / Referer Validation (Anti-CSRF & Cross-Site abuse)
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");

  if (origin && host) {
    try {
      const originHost = new URL(origin).host.toLowerCase();
      const currentHost = host.toLowerCase();

      // Permit same host or localhost for development
      const isAllowedOrigin =
        originHost === currentHost ||
        originHost.includes("localhost") ||
        originHost.includes("127.0.0.1") ||
        originHost.includes("vercel.app");

      if (!isAllowedOrigin) {
        return {
          valid: false,
          response: NextResponse.json(
            { error: "Unauthorized cross-origin request" },
            { status: 403 }
          ),
        };
      }
    } catch {
      // Ignore URL parse error
    }
  }

  return { valid: true };
}
