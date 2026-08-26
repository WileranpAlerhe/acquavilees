import { NextResponse } from "next/server";
import {
  calculateOrderAmount,
  PinPayConfigurationError,
  pinPayRequest,
  safePinPayError,
  ShippingMethod,
} from "@/app/api/payments/pinpay";

type CreatePaymentBody = {
  method?: string;
  orderCode?: string;
  idempotencyKey?: string;
  pixDiscountRate?: number;
  customer?: { name?: string; email?: string; phone?: string; cpf?: string };
  shipping?: ShippingMethod;
  cart?: { quantity?: number; addRefill?: boolean };
};

function onlyDigits(value: string | undefined) {
  return (value || "").replace(/\D/g, "");
}

function isUuid(value: string | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as CreatePaymentBody | null;
  if (!body) return NextResponse.json({ ok: false, message: "Dados do pagamento inválidos." }, { status: 400 });

  if (body.method !== "pix") {
    return NextResponse.json(
      { ok: false, code: "PAYMENT_METHOD_UNAVAILABLE", message: "O pagamento por cartão ainda não está conectado." },
      { status: 503 },
    );
  }

  const name = body.customer?.name?.trim() || "";
  const email = body.customer?.email?.trim().toLowerCase() || "";
  const cpf = onlyDigits(body.customer?.cpf);
  const orderCode = body.orderCode?.replace(/[^A-Za-z0-9-]/g, "").slice(0, 40) || "";

  if (name.length < 3 || !email.includes("@") || cpf.length !== 11 || !orderCode || !isUuid(body.idempotencyKey)) {
    return NextResponse.json({ ok: false, message: "Revise os dados pessoais e tente novamente." }, { status: 422 });
  }

  const shipping = body.shipping === "express" ? "express" : "standard";
  const totals = calculateOrderAmount(body.cart || {}, shipping, Number(body.pixDiscountRate));
  const checkoutUrl = `${new URL(request.url).origin}/checkout`;

  try {
    const pinPayResponse = await pinPayRequest("/pix", {
      method: "POST",
      headers: { "Idempotency-Key": body.idempotencyKey! },
      body: JSON.stringify({
        amount: totals.amountInCents,
        description: `Pedido ${orderCode} - Acqualive Terracota`,
        customer: { name, email, document: { number: cpf } },
        metadata: { external_reference: orderCode, checkout_url: checkoutUrl },
      }),
    });

    const payload = await pinPayResponse.json().catch(() => ({})) as Record<string, unknown>;
    if (!pinPayResponse.ok) {
      return NextResponse.json(
        { ok: false, code: "PINPAY_ERROR", message: safePinPayError(payload) },
        { status: pinPayResponse.status },
      );
    }

    const pix = payload.pix && typeof payload.pix === "object" ? payload.pix as Record<string, unknown> : {};
    const transactionId = typeof payload.id === "string" ? payload.id : "";
    const qrCode = typeof pix.qr_code === "string" ? pix.qr_code : "";
    if (!transactionId || !qrCode) {
      return NextResponse.json({ ok: false, message: "A PinPay não retornou um Pix válido." }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      transactionId,
      orderCode,
      status: typeof payload.status === "string" ? payload.status : "pending",
      amount: totals.total,
      amountInCents: totals.amountInCents,
      pix: {
        qrCode,
        qrCodeUrl: typeof pix.qr_code_url === "string" ? pix.qr_code_url : "",
        expiresAt: typeof pix.expires_at === "string" ? pix.expires_at : null,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof PinPayConfigurationError) {
      return NextResponse.json(
        { ok: false, code: "PINPAY_NOT_CONFIGURED", message: "Pagamento temporariamente indisponível." },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: false, message: "Não foi possível conectar à PinPay agora." }, { status: 502 });
  }
}
