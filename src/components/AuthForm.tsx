"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, LogIn, Sparkles, UserPlus } from "lucide-react";

type Mode = "login" | "register";

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(payload: { email: string; password: string; name?: string }, endpoint: Mode) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setPending(false);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Network error — check your connection and try again.");
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="card rounded-3xl p-7 shadow-2xl shadow-black/50">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          {mode === "login" ? "Welcome back" : "Create your workspace"}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          {mode === "login"
            ? "Sign in to reach your playlists, favourites and continue-watching list."
            : "One account keeps your imported playlists, favourites and history in sync."}
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submit(
              mode === "login" ? { email, password } : { email, password, name },
              mode,
            );
          }}
        >
          {mode === "register" ? (
            <Field label="Name">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                autoComplete="name"
                placeholder="Alex Viewer"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-brand-400/60 focus:ring-2 focus:ring-brand-500/25"
              />
            </Field>
          ) : null}

          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-brand-400/60 focus:ring-2 focus:ring-brand-500/25"
            />
          </Field>

          <Field label="Password">
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-brand-400/60 focus:ring-2 focus:ring-brand-500/25"
            />
          </Field>

          {error ? (
            <p className="flex items-start gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-200">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "login" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {pending ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        {mode === "login" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => void submit({ email: "demo@streamvault.app", password: "demo1234" }, "login")}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-60"
          >
            <Sparkles className="h-4 w-4 text-accent-400" />
            Use the seeded demo account
          </button>
        ) : null}

        <p className="mt-6 text-center text-sm text-slate-400">
          {mode === "login" ? (
            <>
              New here?{" "}
              <Link href="/register" className="font-medium text-brand-300 hover:text-brand-200">
                Create an account
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-brand-300 hover:text-brand-200">
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>

      <p className="mt-4 text-center text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-300">
          ← Back to overview
        </Link>
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  );
}
