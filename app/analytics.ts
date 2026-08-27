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
  window.gtag ||= function gtag(...args: Parameters<Gtag>) { window.dataLayer?.push(args); } as Gtag;
  if (!window.__ACQUALIVE_GA4_READY) {
    window.__ACQUALIVE_GA4_READY = true;
    window.gtag("js", new Date());
    window.gtag("config", id, { send_page_view: false, currency: "BRL" });
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(script);
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
  queuedEvents.forEach(({ name, params }) => gtag("event", name, params));
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
  gtag("event", name, params);
  return true;
}
