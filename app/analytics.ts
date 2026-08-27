"use client";

import { CartState, PRODUCT_PRICE, REFILL_PRICE } from "@/app/commerce";

type Gtag = (command: "js" | "config" | "event", targetOrDate: string | Date, params?: Record<string, unknown>) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    __ACQUALIVE_GA4_READY?: boolean;
    __ACQUALIVE_GA4_PAGE?: string;
    __ACQUALIVE_GA4_ID?: string;
    __ACQUALIVE_GA4_QUEUE?: Array<{ name: string; params: Record<string, unknown> }>;
  }
}

export const TERRACOTA_ITEM = {
  item_id: "acqualive-terracota",
  item_name: "Purificador de Água Acqualive Terracota",
  item_brand: "Acqualive",
  item_category: "Purificadores de água",
  price: PRODUCT_PRICE,
};

export const REFILL_ITEM = {
  item_id: "refil-fresh-nanno-v",
  item_name: "Kit Refil Fresh Nanno V",
  item_brand: "Acqualive",
  item_category: "Refis",
  price: REFILL_PRICE,
};

export function analyticsItems(cart: CartState) {
  return [
    { ...TERRACOTA_ITEM, quantity: cart.quantity },
    ...(cart.addRefill ? [{ ...REFILL_ITEM, quantity: 1 }] : []),
  ];
}

export function ensureGoogleAnalytics(measurementId?: string) {
  if (typeof window === "undefined") return null;
  const id = (
    measurementId ||
    window.__ACQUALIVE_GA4_ID ||
    document.documentElement.dataset.ga4MeasurementId ||
    ""
  ).trim();
  if (!/^G-[A-Z0-9]+$/i.test(id)) return null;
  window.__ACQUALIVE_GA4_ID = id;
  window.dataLayer ||= [];
  window.gtag ||= function gtag() { window.dataLayer?.push(arguments); } as Gtag;
  if (!window.__ACQUALIVE_GA4_READY) {
    window.__ACQUALIVE_GA4_READY = true;
    window.gtag("js", new Date());
    window.gtag("config", id, { send_page_view: false });
    if (!document.getElementById("acqualive-ga4-script")) {
      const script = document.createElement("script");
      script.id = "acqualive-ga4-script";
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
      document.head.appendChild(script);
    }
  }
  return window.gtag;
}

export function setGoogleAnalyticsMeasurementId(measurementId: string) {
  const id = measurementId.trim();
  if (!/^G-[A-Z0-9]+$/i.test(id)) return null;
  const gtag = ensureGoogleAnalytics(id);
  if (!gtag) return null;

  const queuedEvents = window.__ACQUALIVE_GA4_QUEUE || [];
  window.__ACQUALIVE_GA4_QUEUE = [];
  queuedEvents.forEach(({ name, params }) => gtag("event", name, { ...params, send_to: id }));
  return gtag;
}

export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  const gtag = ensureGoogleAnalytics();
  if (!gtag) {
    window.__ACQUALIVE_GA4_QUEUE ||= [];
    window.__ACQUALIVE_GA4_QUEUE.push({ name, params });
    window.__ACQUALIVE_GA4_QUEUE = window.__ACQUALIVE_GA4_QUEUE.slice(-100);
    return true;
  }
  gtag("event", name, { ...params, send_to: window.__ACQUALIVE_GA4_ID });
  return true;
}

export async function testGoogleAnalyticsConnection(measurementId: string) {
  const id = measurementId.trim();
  if (!/^G-[A-Z0-9]+$/i.test(id)) {
    return { ok: false, message: "O Measurement ID não foi encontrado ou está inválido." };
  }
  const gtag = setGoogleAnalyticsMeasurementId(id);
  if (!gtag) return { ok: false, message: "Não foi possível iniciar a tag do Google." };

  return await new Promise<{ ok: boolean; message: string }>((resolve) => {
    let finished = false;
    const finish = (result: { ok: boolean; message: string }) => {
      if (finished) return;
      finished = true;
      resolve(result);
    };
    gtag("event", "analytics_connection_test", {
      send_to: id,
      debug_mode: true,
      event_timeout: 7000,
      event_callback: () => finish({ ok: true, message: `GA4 conectado. Evento de teste enviado para ${id}.` }),
    });
    window.setTimeout(() => finish({
      ok: false,
      message: "A tag não respondeu. Desative bloqueadores de anúncios neste navegador e tente novamente.",
    }), 8000);
  });
}
