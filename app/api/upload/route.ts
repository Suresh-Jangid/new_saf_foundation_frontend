import { NextRequest, NextResponse } from "next/server";
import { storageService } from "@/lib/storage/storage-service";

export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const category = (formData.get("category") as string) || "general";
    const entityType = (formData.get("entityType") as string) || "application";
    const entityId = (formData.get("entityId") as string) || "new";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "कोई फ़ाइल प्रदान नहीं की गई / No file provided" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await storageService.upload(buffer, {
      category: category as any,
      entityType: entityType as any,
      entityId,
      originalFilename: file.name,
      contentType: file.type,
      maxSizeBytes: category === "document" || category === "affidavit" ? 10 * 1024 * 1024 : 5 * 1024 * 1024,
    });

    if (!result.success) {
      const status = result.error?.includes("not yet configured") ? 503 : 400;
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          provider: result.provider,
        },
        { status, headers: CORS_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        key: result.key,
        url: result.url,
        fileId: result.fileId,
        provider: result.provider,
        contentType: result.contentType,
        size: result.size,
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    console.error("Upload API route error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "फ़ाइल अपलोड करने में आंतरिक त्रुटि हुई / Internal upload error",
      },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
