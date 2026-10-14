import { NextRequest, NextResponse } from "next/server";
import { parseIndiaPostResponse } from "@/lib/postal-pincode-service";

// In-memory server cache
const serverPincodeCache = new Map<string, any>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPin = searchParams.get("pincode") || "";
    const cleanPin = rawPin.replace(/\D/g, "").slice(0, 6);

    if (cleanPin.length !== 6) {
      return NextResponse.json(
        {
          pincode: cleanPin,
          status: "not_found",
          message: "पिन कोड 6 अंकों का होना चाहिए / PIN code must be 6 digits",
          state: "",
          district: "",
          tehsil: "",
          postOffices: [],
          localities: [],
        },
        { status: 400 }
      );
    }

    if (serverPincodeCache.has(cleanPin)) {
      return NextResponse.json(serverPincodeCache.get(cleanPin), {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
        },
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const externalResponse = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeout);

    if (!externalResponse.ok) {
      return NextResponse.json(
        {
          pincode: cleanPin,
          status: "error",
          message: `India Post API returned HTTP ${externalResponse.status}`,
          state: "",
          district: "",
          tehsil: "",
          postOffices: [],
          localities: [],
        },
        { status: 502 }
      );
    }

    const rawData = await externalResponse.json();
    const parsed = parseIndiaPostResponse(cleanPin, rawData);

    if (parsed.status === "success" || parsed.status === "not_found") {
      serverPincodeCache.set(cleanPin, parsed);
    }

    return NextResponse.json(parsed, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
      },
    });
  } catch (err: any) {
    const isTimeout = err.name === "AbortError";
    return NextResponse.json(
      {
        pincode: "",
        status: "error",
        message: isTimeout
          ? "पिन कोड सेवा समय समाप्त / Request timed out"
          : err.message || "पिन कोड सेवा में त्रुटि / Error reaching postal service",
        state: "",
        district: "",
        tehsil: "",
        postOffices: [],
        localities: [],
      },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
