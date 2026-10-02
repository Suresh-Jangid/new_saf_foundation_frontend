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
    const contentTypeHeader = request.headers.get("content-type") || "";
    let buffer: Buffer | null = null;
    let filename = "upload";
    let contentType = "application/octet-stream";
    let category = "general";
    let entityType = "application";
    let entityId = "new";

    if (contentTypeHeader.includes("application/json")) {
      const body = await request.json();
      const rawFile = body.file || body.fileBase64 || body.dataUrl || body.data;
      category = body.category || "general";
      entityType = body.entityType || "application";
      entityId = body.entityId || "new";
      filename = body.filename || body.fileName || "upload";
      if (!rawFile) {
        return NextResponse.json(
          { success: false, error: "कोई फ़ाइल प्रदान नहीं की गई / No file provided" },
          { status: 400, headers: CORS_HEADERS }
        );
      }
      if (typeof rawFile === "string" && rawFile.startsWith("data:")) {
        const [meta, b64] = rawFile.split(",");
        const mimeMatch = meta.match(/:(.*?);/);
        contentType = mimeMatch ? mimeMatch[1] : "image/jpeg";
        buffer = Buffer.from(b64, "base64");
      } else if (typeof rawFile === "string") {
        buffer = Buffer.from(rawFile, "base64");
      }
    } else {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      category = (formData.get("category") as string) || "general";
      entityType = (formData.get("entityType") as string) || "application";
      entityId = (formData.get("entityId") as string) || "new";

      if (!file) {
        return NextResponse.json(
          { success: false, error: "कोई फ़ाइल प्रदान नहीं की गई / No file provided" },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      filename = file.name;
      contentType = file.type;
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    if (!buffer || buffer.length === 0) {
      return NextResponse.json(
        { success: false, error: "कोई फ़ाइल प्रदान नहीं की गई / No file provided" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const result = await storageService.upload(buffer, {
      category: category as any,
      entityType: entityType as any,
      entityId,
      originalFilename: filename,
      contentType,
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
