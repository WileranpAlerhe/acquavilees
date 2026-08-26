import { NextResponse } from "next/server";
import { isAdminRequest } from "@/app/api/admin/auth";
import { PinPayConfigurationError, pinPayRequest, safePinPayError } from "@/app/api/payments/pinpay";

export async function POST(request: Request) {
  if (!await isAdminRequest(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const response = await pinPayRequest("/balance");
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({ ok: false, message: safePinPayError(payload) }, { status: response.status });
    }
    return NextResponse.json({ ok: true, message: "Conexão aprovada pela PinPay." });
  } catch (error) {
    const message = error instanceof PinPayConfigurationError
      ? "Cadastre PINPAY_TOKEN nas variáveis do Vercel."
      : "Não foi possível consultar a PinPay agora.";
    return NextResponse.json({ ok: false, message }, { status: 503 });
  }
}
