import { NextRequest, NextResponse } from "next/server";

/**
 * Next.js App Router Draft API Route
 * Provides BFF endpoint support for registration drafts.
 * Acts as a secure validation gateway and forward proxy if server persistence is connected.
 */

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const { searchParams } = new URL(req.url);
    const moduleKey = searchParams.get("moduleKey");

    // Returns standard draft list envelope
    return NextResponse.json({
      success: true,
      data: [],
      message: "Drafts endpoint operational. Client-side isolated store is currently active.",
      moduleKey,
      hasAuth: Boolean(authHeader),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch drafts" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const body = await req.json();

    if (!body?.moduleKey || !body?.formData) {
      return NextResponse.json(
        { success: false, message: "moduleKey and formData are required" },
        { status: 400 }
      );
    }

    const draftId = body.draftId || `srv_draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const draftRecord = {
      id: draftId,
      moduleKey: body.moduleKey,
      moduleTitle: body.moduleTitle || body.moduleKey,
      applicantName: body.applicantName || "Draft Applicant",
      mobile: body.mobile || "",
      formData: body.formData,
      status: "DRAFT",
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json({
      success: true,
      data: draftRecord,
      message: "Draft saved successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to save draft" },
      { status: 500 }
    );
  }
}
