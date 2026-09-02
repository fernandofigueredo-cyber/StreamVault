"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type EpgProgram = {
  id: number;
  itemId: number;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
};

type EpgChannel = {
  id: number;
  name: string;
  logo: string | null;
  programs: EpgProgram[];
};

const HOUR_WIDTH = 240; // px per hour
const ROW_HEIGHT = 72;  // px per channel row
const LABEL_WIDTH = 160; // px for channel label column

function timeToX(date: Date, anchor: Date) {
  return ((date.getTime() - anchor.getTime()) / 3600000) * HOUR_WIDTH;
}

export default function EpgGrid({ channels }: { channels: EpgChannel[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(new Date());
  const [offset, setOffset] = useState(0); // hour offset from now

  // Anchor = start of current hour
  const anchor = new Date(now);
  anchor.setMinutes(0, 0, 0);
  anchor.setHours(anchor.getHours() + offset - 1); // show 1h before current

  const totalHours = 8;

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current) {
      const nowX = timeToX(now, anchor);
      scrollRef.current.scrollLeft = nowX - 80;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hours = Array.from({ length: totalHours }, (_, i) => {
    const h = new Date(anchor);
    h.setHours(anchor.getHours() + i);
    return h;
  });

  const nowX = timeToX(now, anchor);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-ink-900">
      {/* Controls */}
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Clock className="h-4 w-4 text-brand-300" />
          Guia de Programação
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setOffset((o) => o - 2)}
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => { setOffset(0); setTimeout(() => { if (scrollRef.current) { scrollRef.current.scrollLeft = timeToX(now, anchor) - 80; } }, 50); }}
            className="rounded-lg border border-brand-400/30 bg-brand-500/15 px-3 py-1.5 text-xs font-semibold text-brand-300 transition hover:bg-brand-500/25"
          >
            Agora
          </button>
          <button
            type="button"
            onClick={() => setOffset((o) => o + 2)}
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex overflow-hidden">
        {/* Channel labels (fixed) */}
        <div className="shrink-0 border-r border-white/8" style={{ width: LABEL_WIDTH }}>
          {/* Header spacer */}
          <div className="border-b border-white/8" style={{ height: 40 }} />
          {channels.map((ch) => (
            <Link
              key={ch.id}
              href={`/watch/${ch.id}`}
              className="flex items-center gap-2 border-b border-white/5 px-3 transition hover:bg-white/5"
              style={{ height: ROW_HEIGHT }}
            >
              {ch.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ch.logo} alt={ch.name} className="h-8 w-8 rounded object-contain" loading="lazy"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded bg-brand-500/20 text-[10px] font-bold text-brand-300">
                  {ch.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <span className="truncate text-xs font-medium text-white">{ch.name}</span>
            </Link>
          ))}
        </div>

        {/* Scrollable timeline */}
        <div
          ref={scrollRef}
          className="scrollbar-slim flex-1 overflow-x-auto"
          style={{ width: `calc(100% - ${LABEL_WIDTH}px)` }}
        >
          <div style={{ width: totalHours * HOUR_WIDTH, minWidth: "100%" }}>
            {/* Hour headers */}
            <div className="relative flex border-b border-white/8" style={{ height: 40 }}>
              {hours.map((h, i) => (
                <div
                  key={i}
                  className="shrink-0 border-r border-white/6 px-3 pt-2 text-xs font-semibold text-slate-400"
                  style={{ width: HOUR_WIDTH }}
                >
                  {h.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </div>
              ))}
            </div>

            {/* Channel rows */}
            <div className="relative">
              {/* Now line */}
              {nowX > 0 && nowX < totalHours * HOUR_WIDTH && (
                <div
                  className="pointer-events-none absolute top-0 z-10 w-0.5 bg-rose-500 shadow-lg shadow-rose-500/50"
                  style={{ left: nowX, height: channels.length * ROW_HEIGHT }}
                >
                  <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-rose-500" />
                </div>
              )}

              {channels.map((ch) => (
                <div
                  key={ch.id}
                  className="relative border-b border-white/5"
                  style={{ height: ROW_HEIGHT }}
                >
                  {ch.programs.map((prog) => {
                    const start = new Date(prog.startsAt);
                    const end = new Date(prog.endsAt);
                    const x = timeToX(start, anchor);
                    const w = ((end.getTime() - start.getTime()) / 3600000) * HOUR_WIDTH;
                    const isNow = start <= now && end > now;
                    if (x + w < 0 || x > totalHours * HOUR_WIDTH) return null;
                    return (
                      <div
                        key={prog.id}
                        title={`${prog.title}\n${start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} – ${end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
                        className={cn(
                          "absolute top-1 overflow-hidden rounded-lg border px-2 py-1 text-xs transition hover:z-20 hover:scale-[1.02] hover:shadow-xl",
                          isNow
                            ? "border-brand-400/40 bg-brand-500/20 text-white"
                            : "border-white/8 bg-white/5 text-slate-300 hover:bg-white/10",
                        )}
                        style={{
                          left: Math.max(0, x) + 2,
                          width: Math.min(w, totalHours * HOUR_WIDTH - Math.max(0, x)) - 4,
                          height: ROW_HEIGHT - 8,
                        }}
                      >
                        <p className="truncate font-semibold leading-tight">{prog.title}</p>
                        <p className="mt-0.5 truncate text-[10px] opacity-70">
                          {start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          {" – "}
                          {end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        {isNow && (
                          <div
                            className="absolute bottom-0 left-0 h-0.5 bg-brand-400"
                            style={{
                              width: `${Math.min(100, ((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100)}%`,
                            }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
