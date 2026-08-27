import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="card max-w-md rounded-3xl p-8 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-500/12 text-brand-300 ring-1 ring-brand-400/25">
          <Compass className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-white">That channel doesn't exist</h1>
        <p className="mt-2 text-sm text-slate-400">
          The item you tried to open isn't in your library any more. It may have been removed when a playlist was
          refreshed.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link
            href="/dashboard"
            className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            Back to dashboard
          </Link>
          <Link
            href="/live"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
          >
            Browse live TV
          </Link>
        </div>
      </div>
    </main>
  );
}
