"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ensureGoogleAnalytics, GA4_MEASUREMENT_ID } from "@/app/analytics";

export function GoogleAnalytics() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname || pathname.startsWith("/painel")) return;
    const gtag = ensureGoogleAnalytics();
    if (!gtag) return;
    const pageLocation = `${window.location.origin}${pathname}${window.location.search}`;
    if (window.__ACQUALIVE_GA4_PAGE === pageLocation) return;
    window.__ACQUALIVE_GA4_PAGE = pageLocation;
    gtag("event", "page_view", { page_title: document.title, page_location: pageLocation, page_path: `${pathname}${window.location.search}`, send_to: GA4_MEASUREMENT_ID });
  }, [pathname]);
  return null;
}

