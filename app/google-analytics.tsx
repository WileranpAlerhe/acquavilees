"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { setGoogleAnalyticsMeasurementId } from "@/app/analytics";

export function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || pathname.startsWith("/painel")) return;
    let cancelled = false;

    async function startAnalytics() {
      let id = measurementId.trim();
      if (!/^G-[A-Z0-9]+$/i.test(id)) {
        try {
          const response = await fetch("/api/analytics/config", { cache: "no-store" });
          const result = await response.json();
          id = typeof result.measurementId === "string" ? result.measurementId.trim() : "";
        } catch {
          return;
        }
      }
      if (cancelled || !/^G-[A-Z0-9]+$/i.test(id)) return;
      const gtag = setGoogleAnalyticsMeasurementId(id);
      if (!gtag) return;
      const pageLocation = `${window.location.origin}${pathname}${window.location.search}`;
      if (window.__ACQUALIVE_GA4_PAGE === pageLocation) return;
      window.__ACQUALIVE_GA4_PAGE = pageLocation;
      gtag("event", "page_view", { page_title: document.title, page_location: pageLocation, page_path: `${pathname}${window.location.search}`, send_to: id });
    }

    startAnalytics();
    return () => { cancelled = true; };
  }, [measurementId, pathname]);
  return null;
}
