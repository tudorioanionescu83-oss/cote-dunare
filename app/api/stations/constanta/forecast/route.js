import { NextResponse } from "next/server";
import { getConstantaMarineForecast } from "../../../../lib/marine/copernicusService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req) {
  try {
    const daysParam = Number(req.nextUrl.searchParams.get("days") ?? "5");
    const payload = await getConstantaMarineForecast(daysParam);
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error?.message || "Failed to read marine forecast data",
        stationId: "constanta_marine",
      },
      { status: 500 }
    );
  }
}
