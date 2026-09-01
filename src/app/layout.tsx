import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import KeepAlive from "@/components/KeepAlive";
import PwaInit from "@/components/PwaInit";
import ColdStartLoader from "@/components/ColdStartLoader";
import "./globals.css";

export const metadata: Metadata = {
  title: "StreamVault — IPTV Player",
  description:
    "O seu player IPTV pessoal — listas M3U e Xtream Codes, TV ao vivo, filmes e séries.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "StreamVault",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#05060c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh bg-ink-950 font-sans text-slate-100 antialiased">
        <ColdStartLoader />
        <KeepAlive />
        <PwaInit />
        {children}
      </body>
    </html>
  );
}
