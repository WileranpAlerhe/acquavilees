import { NextResponse } from "next/server";
import { PinPayConfigurationError, pinPayRequest, safePinPayError } from "@/app/api/payments/pinpay";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[A-Za-z0-9._-]{6,100}$/.test(id)) {
    return NextResponse.json({ ok: false, message: "Identificador inválido." }, { status: 400 });
  }

  try {
    const response = await pinPayRequest(`/pix/${encodeURIComponent(id)}`);
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) {
      return NextResponse.json({ ok: false, message: safePinPayError(payload) }, { status: response.status });
    }
    return NextResponse.json({
      ok: true,
      transactionId: typeof payload.id === "string" ? payload.id : id,
      status: typeof payload.status === "string" ? payload.status.toLowerCase() : "pending",
      paidAt: typeof payload.paid_at === "string" ? payload.paid_at : null,
      amountInCents: typeof payload.amount === "number" ? payload.amount : null,
    });
  } catch (error) {
    const message = error instanceof PinPayConfigurationError ? "PinPay não configurada." : "Falha ao consultar o pagamento.";
    return NextResponse.json({ ok: false, message }, { status: 503 });
  }
}
