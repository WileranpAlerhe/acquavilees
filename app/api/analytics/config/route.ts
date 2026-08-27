import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const configuredMeasurementId = (
    process.env.GA4_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || ""
  ).trim();
  const measurementId = /^G-[A-Z0-9]+$/i.test(configuredMeasurementId)
    ? configuredMeasurementId
    : "";
  return NextResponse.json(
    { measurementId, configured: Boolean(measurementId) },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
