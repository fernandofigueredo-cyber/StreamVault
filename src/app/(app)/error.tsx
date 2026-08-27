"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[60vh] place-items-center px-6">
      <div className="card max-w-md rounded-3xl p-8 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-500/12 text-rose-300 ring-1 ring-rose-400/25">
          <TriangleAlert className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-white">Something broke on this screen</h1>
        <p className="mt-2 text-sm text-slate-400">
          {error.message || "An unexpected error occurred while loading your library."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mx-auto mt-6 flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          <RotateCcw className="h-4 w-4" /> Try again
        </button>
      </div>
    </div>
  );
}
