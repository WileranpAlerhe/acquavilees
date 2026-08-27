export const CART_KEY = "acqualive-cart-v1";

export type CartState = {
  quantity: number;
  addRefill: boolean;
};

export const PRODUCT_PRICE = 169;
export const REFILL_COMPARE_PRICE = 85;
export const REFILL_PRICE = 50;

export function normalizeCart(value?: Partial<CartState> | null): CartState {
  return {
    quantity: Math.max(1, Math.min(10, Number(value?.quantity) || 1)),
    addRefill: Boolean(value?.addRefill),
  };
}

export function loadCart(): CartState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    return raw ? normalizeCart(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveCart(cart: CartState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CART_KEY, JSON.stringify(normalizeCart(cart)));
}

export function clearCart() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CART_KEY);
}

export function cartSubtotal(cart: CartState) {
  return cart.quantity * PRODUCT_PRICE + (cart.addRefill ? REFILL_PRICE : 0);
}

export function checkoutTotal(subtotal: number, shipping: number, pixDiscountRate = 0) {
  const baseTotal = subtotal + shipping;
  if (pixDiscountRate <= 0) return Math.round(baseTotal * 100) / 100;
  return Math.floor(baseTotal - subtotal * pixDiscountRate);
}

export function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
