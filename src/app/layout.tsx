import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import KeepAlive from "@/components/KeepAlive";
import "./globals.css";

export const metadata: Metadata = {
  title: "StreamVault — IPTV Player for M3U & Xtream Codes",
  description:
    "Import your own M3U/M3U8 playlists or sign in with Xtream Codes to watch live TV, movies and series with EPG, favourites and a polished responsive player.",
};

export const viewport: Viewport = {
  themeColor: "#05060c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-ink-950 font-sans text-slate-100 antialiased">
        <KeepAlive />
        {children}
      </body>
    </html>
  );
}
