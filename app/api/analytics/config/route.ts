import { NextResponse } from "next/server";
import { getGoogleAnalyticsConfig } from "@/app/analytics-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const { measurementId, variableName } = getGoogleAnalyticsConfig();
  return NextResponse.json(
    { measurementId, configured: Boolean(measurementId), variableName },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
