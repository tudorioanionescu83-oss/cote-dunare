import { NextResponse } from "next/server";
import { getConstantaMarineTimeseries } from "../../../../lib/marine/copernicusService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req) {
  try {
    const hoursParam = Number(req.nextUrl.searchParams.get("hours") ?? "168");
    const payload = await getConstantaMarineTimeseries(hoursParam);
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
        error: error?.message || "Failed to read marine timeseries data",
        stationId: "constanta_marine",
      },
      { status: 500 }
    );
  }
}
