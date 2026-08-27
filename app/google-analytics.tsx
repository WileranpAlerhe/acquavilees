"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ensureGoogleAnalytics } from "@/app/analytics";

export function GoogleAnalytics({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || pathname.startsWith("/painel")) return;
    const gtag = ensureGoogleAnalytics(measurementId);
    if (!gtag) return;
    const pageLocation = `${window.location.origin}${pathname}${window.location.search}`;
    if (window.__ACQUALIVE_GA4_PAGE === pageLocation) return;
    window.__ACQUALIVE_GA4_PAGE = pageLocation;
    gtag("event", "page_view", { page_title: document.title, page_location: pageLocation, page_path: `${pathname}${window.location.search}`, send_to: measurementId });
  }, [measurementId, pathname]);
  return null;
}
