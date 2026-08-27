import { NextResponse } from "next/server";
import { isAdminRequest } from "@/app/api/admin/auth";
import { getPinPayToken } from "@/app/api/payments/pinpay";

export async function GET(request: Request) {
  if (!await isAdminRequest(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const token = getPinPayToken();
  const gaMeasurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim() || "";
  const gaStreamId = process.env.NEXT_PUBLIC_GA4_STREAM_ID?.trim() || "";
  return NextResponse.json({
    ok: true,
    configured: Boolean(token),
    tokenPreview: token ? `${token.slice(0, 3)}_${"•".repeat(8)}${token.slice(-4)}` : null,
    apiBaseUrl: "https://api.usepinpay.com/functions/v1/api-v1",
    webhookUrl: `${new URL(request.url).origin}/api/payments/webhook`,
    analytics: { configured: /^G-[A-Z0-9]+$/i.test(gaMeasurementId), measurementId: gaMeasurementId || null, streamId: gaStreamId || null },
  });
}
