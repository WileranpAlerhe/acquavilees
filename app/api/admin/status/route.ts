import { NextResponse } from "next/server";
import { isAdminRequest } from "@/app/api/admin/auth";
import { getPinPayToken } from "@/app/api/payments/pinpay";
import { getGoogleAnalyticsConfig } from "@/app/analytics-config";

export async function GET(request: Request) {
  if (!await isAdminRequest(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const token = getPinPayToken();
  const { measurementId: gaMeasurementId, variableName: gaVariableName } = getGoogleAnalyticsConfig();
  const gaStreamId = process.env.GA4_STREAM_ID?.trim() || "";
  return NextResponse.json({
    ok: true,
    configured: Boolean(token),
    tokenPreview: token ? `${token.slice(0, 3)}_${"•".repeat(8)}${token.slice(-4)}` : null,
    apiBaseUrl: "https://api.usepinpay.com/functions/v1/api-v1",
    webhookUrl: `${new URL(request.url).origin}/api/payments/webhook`,
    analytics: { configured: /^G-[A-Z0-9]+$/i.test(gaMeasurementId), measurementId: gaMeasurementId || null, streamId: gaStreamId || null, variableName: gaVariableName },
  });
}
