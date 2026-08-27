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
  return (
    <html lang="pt-BR">
      <body><GoogleAnalytics />{children}</body>
    </html>
  );
}
