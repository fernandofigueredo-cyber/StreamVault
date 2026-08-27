"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export default function WatchActions({
  itemId,
  isFavorite,
  streamUrl,
}: {
  itemId: number;
  isFavorite: boolean;
  streamUrl: string;
}) {
  const [favorite, setFavorite] = useState(isFavorite);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const cached = JSON.parse(window.localStorage.getItem("streamvault.favorites") ?? "[]") as number[];
    const merged = favorite ? Array.from(new Set([...cached, itemId])) : cached.filter((id) => id !== itemId);
    window.localStorage.setItem("streamvault.favorites", JSON.stringify(merged));
  }, [favorite, itemId]);

  async function toggle() {
    const next = !favorite;
    setFavorite(next);
    setPending(true);
    try {
      const response = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      if (response.ok) {
        const data = (await response.json()) as { isFavorite: boolean };
        setFavorite(data.isFavorite);
      } else {
        setFavorite(!next);
      }
    } catch {
      setFavorite(!next);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={pending}
        className={cn(
          "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60",
          favorite
            ? "border-rose-400/40 bg-rose-500/15 text-rose-200"
            : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10",
        )}
      >
        <Heart className={cn("h-4 w-4", favorite && "fill-current")} />
        {favorite ? "In favourites" : "Add to favourites"}
      </button>

      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(streamUrl);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          } catch {
            setCopied(false);
          }
        }}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
      >
        {copied ? <Check className="h-4 w-4 text-accent-400" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied" : "Copy stream URL"}
      </button>
    </div>
  );
}
