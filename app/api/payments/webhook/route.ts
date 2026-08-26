import { NextResponse } from "next/server";

function toHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes)).map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function validSignature(rawBody: string, signature: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = toHex(digest);
  const normalized = signature.replace(/^sha256=/i, "").toLowerCase();
  return normalized.length === expected.length && normalized === expected;
}

export async function POST(request: Request) {
  const secret = process.env.PINPAY_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ ok: false, message: "Webhook não configurado." }, { status: 503 });

  const rawBody = await request.text();
  const signature = request.headers.get("x-webhook-signature") || "";
  if (!signature || !await validSignature(rawBody, signature, secret)) {
    return NextResponse.json({ ok: false, message: "Assinatura inválida." }, { status: 401 });
  }

  const event = JSON.parse(rawBody) as Record<string, unknown>;
  const eventType = String(event.type || event.event || "").toLowerCase();
  return NextResponse.json({ ok: true, accepted: ["payment_approved", "payment_failed", "payment_refunded"].includes(eventType) });
}
