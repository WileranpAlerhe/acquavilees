import type { Metadata } from "next";
import { GoogleAnalytics } from "@/app/google-analytics";
import { getGoogleAnalyticsConfig } from "@/app/analytics-config";
import "./globals.css";

export const metadata: Metadata = {
  title: "Purificador de Água Acqualive Terracota",
  description:
    "Purificador de Água Acqualive Terracota com tecnologia TriWay, água pura, alcalina e rica em magnésio.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { measurementId } = getGoogleAnalyticsConfig();
  const analyticsBootstrap = measurementId
    ? `window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};window.__ACQUALIVE_GA4_ID=${JSON.stringify(measurementId)};window.__ACQUALIVE_GA4_READY=true;window.gtag('js',new Date());window.gtag('config',${JSON.stringify(measurementId)},{send_page_view:false});`
    : "";

  return (
    <html lang="pt-BR" data-ga4-measurement-id={measurementId || undefined}>
      <head>
        {measurementId && <script id="acqualive-ga4-script" async src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`} />}
        {analyticsBootstrap && <script id="acqualive-ga4-bootstrap" dangerouslySetInnerHTML={{ __html: analyticsBootstrap }} />}
      </head>
      <body><GoogleAnalytics measurementId={measurementId} />{children}</body>
    </html>
  );
}
