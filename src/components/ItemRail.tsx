"use client";

import Link from "next/link";
import { ArrowRight, Heart } from "lucide-react";
import type { LibraryItem } from "@/lib/queries";
import { MediaCard, Rail, useFavorites } from "@/components/ui";
import { ParentalGuard } from "./parental/ParentalGuard";

function hrefFor(item: LibraryItem) {
  if (item.kind === "series") return `/series/${item.id}`;
  return `/watch/${item.id}`;
}

export default function ItemRail({
  title,
  subtitle,
  items,
  moreHref,
  moreLabel,
  emptyHint,
}: {
  title: string;
  subtitle?: string;
  items: LibraryItem[];
  moreHref?: string;
  moreLabel?: string;
  emptyHint?: React.ReactNode;
}) {
  const { toggle, pending } = useFavorites();

  if (items.length === 0) {
    return emptyHint ?? null;
  }

  return (
    <Rail
      title={title}
      subtitle={subtitle}
      action={
        moreHref ? (
          <Link
            href={moreHref}
            className="flex items-center gap-1 text-xs font-semibold text-brand-300 transition hover:text-brand-200"
          >
            {moreLabel ?? "View all"} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : null
      }
    >
      {items.map((item) => (
        <ParentalGuard key={item.id} item={item}>
          <div className="w-[220px] shrink-0 snap-start sm:w-[240px]">
            <MediaCard
              item={item}
              href={hrefFor(item)}
              onToggleFavorite={(target) =>
                void toggle(target, () => undefined)
              }
              favoritePending={pending[item.id]}
              progress={item.positionSecs}
            />
          </div>
        </ParentalGuard>
      ))}
    </Rail>
  );
}

export function FavoritesHint() {
  return (
    <div className="card flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-slate-400">
      <Heart className="h-4 w-4 text-rose-400" />
      Tap the heart on any item to pin it here.
    </div>
  );
}
