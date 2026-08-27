import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Tv, Radio, Clapperboard, ListVideo, Clock, Search, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/db/bootstrap";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    icon: ListVideo,
    title: "Import anything",
    body: "Paste an M3U/M3U8 URL, drop a playlist file, or log into an Xtream Codes portal. Categories, movies and series are parsed automatically.",
  },
  {
    icon: Radio,
    title: "Live TV with EPG",
    body: "Browse channel groups, see what's on right now and what's next, with a full programme guide per channel.",
  },
  {
    icon: Clapperboard,
    title: "Movies & series",
    body: "Poster grids, ratings, season and episode navigation, resume support and watch history that follows you.",
  },
  {
    icon: Search,
    title: "Instant search",
    body: "Search every channel, film and episode across all of your playlists from one global search bar.",
  },
  {
    icon: Tv,
    title: "Player built for real streams",
    body: "Adaptive HLS with quality switching, volume, PiP, fullscreen, live badge and resilient error recovery.",
  },
  {
    icon: ShieldCheck,
    title: "Your credentials stay yours",
    body: "Accounts, playlists, favourites and history live in your own PostgreSQL database — nothing is shared.",
  },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="relative overflow-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500/20 ring-1 ring-brand-400/40">
            <Tv className="h-5 w-5 text-brand-300" />
          </span>
          <span className="text-lg font-semibold tracking-tight">StreamVault</span>
        </div>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/login"
            className="rounded-lg px-3.5 py-2 text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-brand-500 px-3.5 py-2 font-medium text-white shadow-lg shadow-brand-500/25 transition hover:bg-brand-600"
          >
            Create account
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 pb-16 pt-6 lg:grid-cols-[1.05fr_1fr] lg:pt-14">
        <div className="animate-rise">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-400" /> Works with your own playlists
          </span>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
            Your IPTV playlists,
            <span className="bg-gradient-to-r from-brand-300 via-brand-400 to-accent-400 bg-clip-text text-transparent">
              {" "}
              finally worth watching.
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-slate-400">
            StreamVault turns M3U files and Xtream Codes subscriptions into a clean, fast dashboard with live TV
            categories, movies, series, EPG, favourites and a player that behaves on desktop and mobile.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-brand-500/30 transition hover:bg-brand-600"
            >
              Try the demo workspace
            </Link>
            <Link
              href="/register"
              className="rounded-xl border border-white/12 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            >
              Import my playlist
            </Link>
          </div>

          <dl className="mt-8 grid max-w-md grid-cols-3 gap-3 text-center">
            {[
              ["48+", "live channels seeded"],
              ["EPG", "now / next on every card"],
              ["M3U +", "Xtream Codes"],
            ].map(([value, label]) => (
              <div key={label} className="glass rounded-xl px-3 py-3">
                <dt className="text-lg font-semibold text-white">{value}</dt>
                <dd className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-400">{label}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-6 text-xs text-slate-500">
            Demo login · <span className="font-mono text-slate-300">{DEMO_EMAIL}</span> /{" "}
            <span className="font-mono text-slate-300">{DEMO_PASSWORD}</span>
          </p>
        </div>

        <div className="relative animate-rise">
          <div className="absolute -inset-6 rounded-[2rem] bg-brand-500/20 blur-3xl" aria-hidden />
          <div className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl shadow-black/60">
            <Image
              src="/images/hero.jpg"
              alt="StreamVault dashboard preview"
              width={1024}
              height={768}
              priority
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-5">
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <Clock className="h-4 w-4 text-accent-400" />
                Recently watched, favourites and resume positions sync to your account.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <article key={title} className="card rounded-2xl p-5 transition hover:border-white/15">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/15 ring-1 ring-brand-400/25">
                <Icon className="h-5 w-5 text-brand-300" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/5 py-8 text-center text-xs text-slate-500">
        StreamVault · Bring your own playlist. Playback of third-party streams is your responsibility.
      </footer>
    </main>
  );
}
