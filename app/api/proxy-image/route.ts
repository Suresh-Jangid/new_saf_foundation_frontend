import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}

function isPrivateIpOrHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();

  // Localhost & Link-local names
  if (
    lower === "localhost" ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal") ||
    lower.endsWith(".localhost")
  ) {
    return true;
  }

  // IPv6 loopback & private
  if (lower === "::1" || lower.startsWith("fc00:") || lower.startsWith("fe80:")) {
    return true;
  }

  // IPv4 checks
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = lower.match(ipv4Regex);
  if (match) {
    const octets = [
      parseInt(match[1], 10),
      parseInt(match[2], 10),
      parseInt(match[3], 10),
      parseInt(match[4], 10),
    ];

    // 0.0.0.0/8
    if (octets[0] === 0) return true;
    // 127.0.0.0/8 (Loopback)
    if (octets[0] === 127) return true;
    // 169.254.0.0/16 (Link Local & Cloud Metadata: 169.254.169.254)
    if (octets[0] === 169 && octets[1] === 254) return true;
    // 10.0.0.0/8 (RFC 1918 Private)
    if (octets[0] === 10) return true;
    // 172.16.0.0/12 (RFC 1918 Private: 172.16.0.0 - 172.31.255.255)
    if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
    // 192.168.0.0/16 (RFC 1918 Private)
    if (octets[0] === 192 && octets[1] === 168) return true;
    // 100.64.0.0/10 (Carrier-grade NAT)
    if (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) return true;
  }

  return false;
}

function isAllowedDomain(hostname: string): boolean {
  const lower = hostname.toLowerCase();

  // Explicit allowed domains
  const allowedSuffixes = [
    "onrender.com",
    "amazonaws.com",
    "cloudflarestorage.com",
    "supabase.co",
    "cloudinary.com",
    "razorpay.com",
    "greenapi.com",
  ];

  // Include configured backend host
  try {
    if (process.env.NEXT_PUBLIC_API_URL) {
      const backendHost = new URL(process.env.NEXT_PUBLIC_API_URL).hostname.toLowerCase();
      if (lower === backendHost || lower.endsWith(`.${backendHost}`)) {
        return true;
      }
    }
  } catch {
    // Ignore URL parse error
  }

  // Include custom allowed domains from env if specified
  if (process.env.ALLOWED_IMAGE_DOMAINS) {
    const customList = process.env.ALLOWED_IMAGE_DOMAINS.split(",").map((d) => d.trim().toLowerCase());
    if (customList.some((d) => lower === d || lower.endsWith(`.${d}`))) {
      return true;
    }
  }

  return allowedSuffixes.some((suffix) => lower === suffix || lower.endsWith(`.${suffix}`));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get("url");

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL structure" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Must be HTTP or HTTPS
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: "Invalid URL protocol (only HTTP and HTTPS allowed)" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // SSRF Check: Reject private and internal addresses
    if (isPrivateIpOrHost(parsedUrl.hostname)) {
      return NextResponse.json(
        { error: "Access to private or local network resources is forbidden" },
        { status: 403, headers: CORS_HEADERS }
      );
    }

    // Domain allowlist check
    if (!isAllowedDomain(parsedUrl.hostname)) {
      return NextResponse.json(
        { error: "Domain not permitted for image proxying" },
        { status: 403, headers: CORS_HEADERS }
      );
    }

    // Fetch the image from the validated external URL
    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SAF-Foundation/1.0)",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.statusText}` },
        { status: response.status, headers: CORS_HEADERS }
      );
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    if (
      !contentType.startsWith("image/") &&
      contentType !== "application/pdf" &&
      contentType !== "application/octet-stream"
    ) {
      return NextResponse.json(
        { error: "Target resource is not an image or document" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const imageBuffer = await response.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        ...CORS_HEADERS,
      },
    });
  } catch (error) {
    console.error("Error proxying image:", error);
    return NextResponse.json(
      { error: "Failed to proxy image" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
