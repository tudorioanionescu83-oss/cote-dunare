import { NextResponse } from "next/server";
import { getConstantaMarineLayers } from "../../../../lib/marine/copernicusService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    return NextResponse.json(getConstantaMarineLayers(), {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error?.message || "Failed to build marine layer metadata",
        stationId: "constanta_marine",
      },
      { status: 500 }
    );
  }
}
