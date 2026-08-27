import type { Metadata } from "next";
import { GoogleAnalytics } from "@/app/google-analytics";
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
  const configuredMeasurementId = process.env.GA4_MEASUREMENT_ID?.trim() || "";
  const measurementId = /^G-[A-Z0-9]+$/i.test(configuredMeasurementId)
    ? configuredMeasurementId
    : "";

  return (
    <html lang="pt-BR" data-ga4-measurement-id={measurementId || undefined}>
      <body><GoogleAnalytics measurementId={measurementId} />{children}</body>
    </html>
  );
}
