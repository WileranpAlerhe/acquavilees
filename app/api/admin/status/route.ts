import { NextResponse } from "next/server";
import { isAdminRequest } from "@/app/api/admin/auth";
import { getPinPayToken } from "@/app/api/payments/pinpay";

export async function GET(request: Request) {
  if (!await isAdminRequest(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const token = getPinPayToken();
  return NextResponse.json({
    ok: true,
    configured: Boolean(token),
    tokenPreview: token ? `${token.slice(0, 3)}_${"•".repeat(8)}${token.slice(-4)}` : null,
    apiBaseUrl: "https://api.usepinpay.com/functions/v1/api-v1",
    webhookUrl: `${new URL(request.url).origin}/api/payments/webhook`,
  });
}
