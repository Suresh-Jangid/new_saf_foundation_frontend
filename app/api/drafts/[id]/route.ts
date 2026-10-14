import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  return NextResponse.json({
    success: true,
    data: null,
    message: `Draft query for ${id} received`,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  return NextResponse.json({
    success: true,
    message: `Draft ${id} marked for deletion`,
  });
}
