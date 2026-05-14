import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "greenroom-stages",
    timestamp: new Date().toISOString(),
  });
}
