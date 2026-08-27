import { checkoutTotal } from "@/app/commerce";

const PINPAY_BASE_URL = "https://api.usepinpay.com/functions/v1/api-v1";

export type CheckoutCart = {
  quantity?: number;
  addRefill?: boolean;
};

export type ShippingMethod = "standard" | "express";

export function getPinPayToken() {
  return process.env.PINPAY_TOKEN?.trim() || "";
}

export function calculateOrderAmount(
  cart: CheckoutCart,
  shipping: ShippingMethod,
  pixDiscountRate: number,
) {
  const quantity = Math.max(1, Math.min(10, Math.trunc(Number(cart.quantity) || 1)));
  const subtotal = quantity * 169 + (cart.addRefill ? 50 : 0);
  const shippingPrice = shipping === "express" ? 29.9 : 0;
  const allowedDiscount = pixDiscountRate === 0.1 ? 0.1 : 0.05;
  const total = checkoutTotal(subtotal, shippingPrice, allowedDiscount);

  return {
    quantity,
    subtotal,
    shippingPrice,
    discountRate: allowedDiscount,
    total,
    amountInCents: total * 100,
  };
}

export async function pinPayRequest(path: string, init?: RequestInit) {
  const token = getPinPayToken();
  if (!token) {
    throw new PinPayConfigurationError();
  }

  return fetch(`${PINPAY_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
}

export class PinPayConfigurationError extends Error {
  constructor() {
    super("PINPAY_TOKEN não configurado.");
    this.name = "PinPayConfigurationError";
  }
}

export function safePinPayError(payload: unknown) {
  if (!payload || typeof payload !== "object") return "A PinPay não aceitou a solicitação.";
  const record = payload as Record<string, unknown>;
  const message = record.message ?? record.error ?? record.detail;
  return typeof message === "string" && message.length <= 240
    ? message
    : "A PinPay não aceitou a solicitação.";
}
