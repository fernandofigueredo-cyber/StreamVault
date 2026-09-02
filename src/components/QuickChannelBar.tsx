"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Radio } from "lucide-react";
import { cn, gradientFor, initialsOf } from "@/lib/utils";
import type { LibraryItem } from "@/lib/queries";

/**
 * Horizontal sticky carousel of live channels shown on mobile
 * at the bottom of the Live TV page.
 */
export default function QuickChannelBar({
  channels,
  activeId,
}: {
  channels: LibraryItem[];
  activeId?: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // Show bar only after scrolling past the hero
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 200);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll active channel into view
  useEffect(() => {
    if (!activeId || !scrollRef.current) return;
    const el = scrollRef.current.querySelector(`[data-id="${activeId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeId]);

  if (channels.length === 0) return null;

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-white/8 bg-ink-950/95 pb-safe-area-inset-bottom backdrop-blur-xl transition-transform duration-300 lg:hidden",
        visible ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <Radio className="h-3.5 w-3.5 shrink-0 text-rose-400" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Canais rápidos
        </span>
      </div>
      <div
        ref={scrollRef}
        className="scrollbar-slim flex gap-2 overflow-x-auto px-3 pb-3"
      >
        {channels.map((ch) => {
          const isActive = ch.id === activeId;
          return (
            <Link
              key={ch.id}
              href={`/watch/${ch.id}`}
              data-id={ch.id}
              className={cn(
                "flex shrink-0 flex-col items-center gap-1 rounded-xl border px-2 py-1.5 transition",
                isActive
                  ? "border-brand-400/40 bg-brand-500/20"
                  : "border-white/8 bg-white/5 hover:bg-white/10",
              )}
            >
              <div className="relative h-10 w-10 overflow-hidden rounded-lg">
                {ch.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ch.logo}
                    alt={ch.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div
                    className={cn(
                      "flex h-full w-full items-center justify-center bg-gradient-to-br text-xs font-bold text-white",
                      gradientFor(ch.name),
                    )}
                  >
                    {initialsOf(ch.name)}
                  </div>
                )}
                {isActive && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-rose-400" />
                  </span>
                )}
              </div>
              <span className="w-14 truncate text-center text-[10px] font-medium text-slate-300">
                {ch.name}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
