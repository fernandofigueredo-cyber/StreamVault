"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  Clapperboard,
  Heart,
  History,
  LayoutDashboard,
  ListVideo,
  LogOut,
  Menu,
  Radio,
  Search,
  Settings,
  Tv,
  UserCircle2,
  X,
} from "lucide-react";
import { cn, initialsOf } from "@/lib/utils";

const NAV = [
  { href: "/dashboard",  label: "Painel",             icon: LayoutDashboard },
  { href: "/live",       label: "TV ao Vivo",          icon: Radio },
  { href: "/epg",        label: "Guia EPG",            icon: CalendarDays },
  { href: "/movies",     label: "Filmes",              icon: Clapperboard },
  { href: "/series",     label: "Séries",              icon: Tv },
  { href: "/search",     label: "Pesquisar",           icon: Search },
  { href: "/favorites",  label: "Favoritos",           icon: Heart },
  { href: "/history",    label: "Continuar a ver",     icon: History },
  { href: "/profiles",   label: "Perfis",              icon: UserCircle2 },
  { href: "/playlists",  label: "Listas",              icon: ListVideo },
  { href: "/settings",   label: "Definições",          icon: Settings },
];

const STORAGE_KEY = "streamvault.sidebar.collapsed";

export default function AppShell({
  user,
  children,
}: {
  user: { id: number; name: string; email: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      window.localStorage.setItem(STORAGE_KEY, prev ? "0" : "1");
      return !prev;
    });
  }

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const sidebar = (
    <div className="flex h-full flex-col gap-1 p-3">
      <div className="mb-2 flex items-center gap-2.5 px-1.5 py-2">
        <Link href="/dashboard" className="flex items-center gap-2.5 overflow-hidden">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-500/20 ring-1 ring-brand-400/40">
            <Tv className="h-5 w-5 text-brand-300" />
          </span>
          {!collapsed ? <span className="whitespace-nowrap font-semibold tracking-tight">StreamVault</span> : null}
        </Link>
        <button
          type="button"
          onClick={toggleCollapsed}
          className="ml-auto hidden rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white lg:block"
          aria-label="Toggle sidebar"
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                active
                  ? "bg-brand-500/15 text-white ring-1 ring-brand-400/30"
                  : "text-slate-400 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className={cn("h-4.5 w-4.5 shrink-0", active ? "text-brand-300" : "text-slate-500 group-hover:text-slate-300")} />
              {!collapsed ? <span className="truncate">{label}</span> : null}
            </Link>
          );
        })}
      </nav>

      {!collapsed ? (
        <div className="mt-2 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Signed in as</p>
          <p className="mt-1 truncate text-sm font-medium text-white">{user.name}</p>
          <p className="truncate text-xs text-slate-500">{user.email}</p>
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={signingOut}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-60"
          >
            <LogOut className="h-3.5 w-3.5" />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-2 grid place-items-center rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-300 transition hover:bg-white/10"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  return (
    <div className="flex min-h-dvh">
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 border-r border-white/6 bg-ink-900/70 backdrop-blur-xl transition-all duration-200 lg:block",
          collapsed ? "w-[76px]" : "w-[248px]",
        )}
      >
        {sidebar}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[264px] border-r border-white/8 bg-ink-900 animate-rise">{sidebar}</div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-white/6 bg-ink-950/80 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-4 w-4" />
            </button>

            <form
              className="relative min-w-0 flex-1 max-w-xl"
              onSubmit={(event) => {
                event.preventDefault();
                router.push(`/search?q=${encodeURIComponent(query)}`);
              }}
            >
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search channels, movies, series…"
                className="w-full rounded-xl border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-brand-400/50 focus:ring-2 focus:ring-brand-500/20"
              />
            </form>

            <div className="ml-auto flex items-center gap-2">
              <Link
                href="/playlists?import=1"
                className="hidden rounded-xl bg-brand-500 px-3.5 py-2 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:bg-brand-600 sm:block"
              >
                Import playlist
              </Link>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-accent-400 text-xs font-bold text-ink-950">
                {initialsOf(user.name)}
              </span>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
