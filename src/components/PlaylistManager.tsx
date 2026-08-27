"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  FileUp,
  KeyRound,
  Link2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

/** Detects `get.php?username=..&password=..` portal links pasted as playlists. */
function detectXtream(url: string) {
  try {
    const parsed = new URL(url.trim());
    if (!/^https?:$/.test(parsed.protocol)) return null;
    if (!/get\.php$|player_api\.php$/.test(parsed.pathname)) return null;
    const username = parsed.searchParams.get("username");
    const password = parsed.searchParams.get("password");
    if (!username || !password) return null;
    return { serverUrl: parsed.origin, username, password };
  } catch {
    return null;
  }
}
import type { Playlist } from "@/db/schema";
import { EmptyState, ErrorNotice } from "@/components/ui";
import LoadDemoButton from "@/components/LoadDemoButton";
import { cn, relativeTime } from "@/lib/utils";

type ImportMode = "m3u-url" | "m3u-file" | "xtream";

export default function PlaylistManager({
  initialPlaylists,
  openImport,
}: {
  initialPlaylists: Playlist[];
  openImport: boolean;
}) {
  const [playlists, setPlaylists] = useState(initialPlaylists);
  const [dialogOpen, setDialogOpen] = useState(openImport);
  const [busy, setBusy] = useState<Record<number, string>>({});
  const [renaming, setRenaming] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; message: string } | null>(null);

  // Huge playlists are imported in the background: keep polling while syncing.
  useEffect(() => {
    const anySyncing = playlists.some((playlist) => playlist.status === "syncing");
    if (!anySyncing) return;
    const timer = window.setInterval(async () => {
      const response = await fetch("/api/playlists");
      if (!response.ok) return;
      const data = (await response.json()) as { playlists: Playlist[] };
      setPlaylists(data.playlists);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [playlists]);

  useEffect(() => {
    if (!dialogOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [dialogOpen]);

  function setFlag(id: number, flag: string | null) {
    setBusy((prev) => {
      const copy = { ...prev };
      if (flag) copy[id] = flag;
      else delete copy[id];
      return copy;
    });
  }

  async function createPlaylist(payload: Record<string, unknown>) {
    const response = await fetch("/api/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as { playlist?: Playlist; error?: string; detected?: string };
    if (!response.ok || !data.playlist) throw new Error(data.error ?? "Import failed.");
    setPlaylists((prev) => [data.playlist as Playlist, ...prev]);
    if (data.detected === "xtream") {
      setNotice({ tone: "ok", message: "Xtream portal detected — importing the full catalogue in the background." });
    }
    return data.playlist;
  }

  async function refresh(id: number) {
    setFlag(id, "refresh");
    setNotice(null);
    const response = await fetch(`/api/playlists/${id}/refresh`, { method: "POST" });
    const data = (await response.json()) as { playlist?: Playlist; error?: string };
    if (response.ok && data.playlist) {
      setPlaylists((prev) => prev.map((row) => (row.id === id ? (data.playlist as Playlist) : row)));
      setNotice({ tone: "ok", message: `${data.playlist.name} refreshed successfully.` });
    } else if (data.playlist) {
      setPlaylists((prev) => prev.map((row) => (row.id === id ? (data.playlist as Playlist) : row)));
      setNotice({ tone: "error", message: data.error ?? "Refresh failed." });
    } else {
      setNotice({ tone: "error", message: data.error ?? "Refresh failed." });
    }
    setFlag(id, null);
  }

  async function rename(id: number, name: string) {
    setRenaming(null);
    if (!name.trim()) return;
    const snapshot = playlists;
    setPlaylists((prev) => prev.map((row) => (row.id === id ? { ...row, name: name.trim() } : row)));
    const response = await fetch(`/api/playlists/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      setPlaylists(snapshot);
      setNotice({ tone: "error", message: "Could not rename that playlist." });
    }
  }

  async function remove(id: number) {
    const snapshot = playlists;
    setPlaylists((prev) => prev.filter((row) => row.id !== id));
    const response = await fetch(`/api/playlists/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setPlaylists(snapshot);
      setNotice({ tone: "error", message: "Could not delete that playlist." });
    } else {
      setNotice({ tone: "ok", message: "Playlist deleted." });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Playlists</h1>
          <p className="mt-1 text-sm text-slate-400">
            Import, rename, refresh or remove your M3U sources and Xtream Codes portals.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:bg-brand-600"
        >
          <Plus className="h-4 w-4" /> New playlist
        </button>
      </div>

      {notice ? (
        <div
          className={cn(
            "flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm",
            notice.tone === "ok"
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
              : "border-rose-500/25 bg-rose-500/10 text-rose-100",
          )}
        >
          {notice.tone === "ok" ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span className="flex-1">{notice.message}</span>
          <button type="button" onClick={() => setNotice(null)} className="text-slate-300 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {playlists.length === 0 ? (
        <EmptyState
          icon={<Link2 className="h-6 w-6" />}
          title="No playlists connected"
          body="Add an M3U/M3U8 URL, upload a playlist file, or connect an Xtream Codes portal. There is no size limit: imports stream in batches and keep running in the background with a live progress bar."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600"
              >
                Import a playlist
              </button>
              <LoadDemoButton className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-60" />
            </div>
          }
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {playlists.map((playlist) => {
            const flag = busy[playlist.id];
            const total = playlist.liveCount + playlist.movieCount + playlist.seriesCount;
            return (
              <article key={playlist.id} className="card rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-300 ring-1 ring-brand-400/25">
                    {playlist.kind === "xtream" ? <KeyRound className="h-5 w-5" /> : <Link2 className="h-5 w-5" />}
                  </span>

                  <div className="min-w-0 flex-1">
                    {renaming === playlist.id ? (
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          void rename(playlist.id, renameValue);
                        }}
                        className="flex items-center gap-2"
                      >
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(event) => setRenameValue(event.target.value)}
                          onBlur={() => void rename(playlist.id, renameValue)}
                          className="w-full rounded-lg border border-brand-400/40 bg-black/40 px-2.5 py-1.5 text-sm text-white outline-none"
                        />
                        <button type="submit" className="rounded-lg bg-brand-500 px-2.5 py-1.5 text-xs font-semibold">
                          Save
                        </button>
                      </form>
                    ) : (
                      <h2 className="truncate text-sm font-semibold text-white">{playlist.name}</h2>
                    )}

                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase",
                          playlist.kind === "xtream"
                            ? "bg-accent-400/15 text-accent-400"
                            : "bg-white/10 text-slate-300",
                        )}
                      >
                        {playlist.kind}
                      </span>
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase",
                          playlist.status === "ready"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : playlist.status === "error"
                              ? "bg-rose-500/15 text-rose-300"
                              : "bg-amber-500/15 text-amber-300",
                        )}
                      >
                        {playlist.status}
                      </span>
                      <span>{total.toLocaleString()} items</span>
                      <span className="text-slate-600">·</span>
                      <span>synced {relativeTime(playlist.lastSyncedAt)}</span>
                    </p>

                    {playlist.status === "syncing" ? (
                      <div className="mt-2.5">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/12">
                          <div
                            className="h-full rounded-full bg-brand-400 transition-all"
                            style={{
                              width:
                                playlist.progressTotal && playlist.progressTotal > 0
                                  ? `${Math.min(100, Math.round((playlist.progressDone / playlist.progressTotal) * 100))}%`
                                  : "35%",
                            }}
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {playlist.statusMessage ?? "Importing…"}{" "}
                          {playlist.progressTotal
                            ? `· ${playlist.progressDone.toLocaleString()} / ${playlist.progressTotal.toLocaleString()}`
                            : `· ${playlist.progressDone.toLocaleString()} items written`}
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                      <span>{playlist.liveCount} live</span>
                      <span>{playlist.movieCount} movies</span>
                      <span>{playlist.seriesCount} series</span>
                    </div>

                    {playlist.statusMessage ? (
                      <p className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-200">
                        {playlist.statusMessage}
                      </p>
                    ) : null}

                    {playlist.sourceUrl && playlist.kind === "m3u" ? (
                      <p className="mt-2 truncate text-[11px] text-slate-600">{playlist.sourceUrl}</p>
                    ) : null}
                    {playlist.kind === "xtream" && playlist.serverUrl ? (
                      <p className="mt-2 truncate text-[11px] text-slate-600">
                        {playlist.serverUrl} · {playlist.username}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <IconAction
                      label="Rename"
                      onClick={() => {
                        setRenaming(playlist.id);
                        setRenameValue(playlist.name);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </IconAction>
                    <IconAction
                      label="Refresh"
                      onClick={() => void refresh(playlist.id)}
                      disabled={Boolean(flag)}
                    >
                      {flag === "refresh" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </IconAction>
                    <IconAction
                      label="Delete"
                      danger
                      onClick={() => {
                        if (window.confirm(`Delete “${playlist.name}” and all of its channels?`)) void remove(playlist.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconAction>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 border-t border-white/6 pt-3">
                  <Link
                    href="/live"
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                  >
                    Browse channels
                  </Link>
                  <Link
                    href="/movies"
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                  >
                    Movies
                  </Link>
                  <Link
                    href="/series"
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                  >
                    Series
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {dialogOpen ? (
        <ImportDialog
          onClose={() => setDialogOpen(false)}
          onCreate={(payload) => createPlaylist(payload)}
        />
      ) : null}
    </div>
  );
}

function IconAction({
  label,
  onClick,
  children,
  danger,
  disabled,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 disabled:opacity-50",
        danger && "hover:bg-rose-500/15 hover:text-rose-300",
      )}
    >
      {children}
    </button>
  );
}

function ImportDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (payload: Record<string, unknown>) => Promise<Playlist>;
}) {
  const [mode, setMode] = useState<ImportMode>("m3u-url");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [epgUrl, setEpgUrl] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    try {
      const payload =
        mode === "xtream"
          ? { mode, name, serverUrl, username, password }
          : mode === "m3u-file"
            ? { mode, name, fileContent, fileName }
            : { mode, name, url, epgUrl };
      await onCreate(payload);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  const tabs: [ImportMode, string, React.ReactNode][] = [
    ["m3u-url", "M3U URL", <Link2 key="url" className="h-3.5 w-3.5" />],
    ["m3u-file", "Upload file", <FileUp key="file" className="h-3.5 w-3.5" />],
    ["xtream", "Xtream Codes", <KeyRound key="xt" className="h-3.5 w-3.5" />],
  ];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg animate-rise overflow-hidden rounded-3xl border border-white/10 bg-ink-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <h2 className="text-base font-semibold text-white">Import a playlist</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          className="space-y-4 px-5 py-5"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="flex gap-1.5 rounded-xl bg-black/30 p-1">
            {tabs.map(([value, label, icon]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition",
                  mode === value ? "bg-brand-500 text-white" : "text-slate-400 hover:text-white",
                )}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>

          {mode === "m3u-url" ? (
            <>
              <Input
                label="Playlist URL"
                placeholder="https://example.com/playlist.m3u8"
                value={url}
                onChange={(value) => {
                  setUrl(value);
                  const detected = detectXtream(value);
                  if (detected) {
                    setMode("xtream");
                    setServerUrl(detected.serverUrl);
                    setUsername(detected.username);
                    setPassword(detected.password);
                    setHint(
                      "Portal Xtream detectado nesse link — importando como Xtream Codes para trazer categorias, séries e EPG completos.",
                    );
                  } else {
                    setHint(null);
                  }
                }}
                required
              />
              {hint ? (
                <p className="flex items-start gap-2 rounded-xl border border-accent-400/25 bg-accent-400/10 px-3.5 py-2.5 text-xs text-accent-400">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {hint}
                </p>
              ) : null}
              <Input label="Name (optional)" placeholder="My IPTV mix" value={name} onChange={setName} />
              <Input label="EPG XMLTV URL (optional)" placeholder="https://example.com/epg.xml" value={epgUrl} onChange={setEpgUrl} />
            </>
          ) : null}

          {mode === "m3u-file" ? (
            <>
              <label className="block cursor-pointer rounded-2xl border border-dashed border-white/15 bg-black/20 px-4 py-8 text-center transition hover:border-brand-400/50">
                <FileUp className="mx-auto h-7 w-7 text-brand-300" />
                <p className="mt-2 text-sm font-medium text-white">
                  {fileName || "Choose an .m3u or .m3u8 file"}
                </p>
                <p className="mt-1 text-xs text-slate-500">Parsed in your browser, then imported to your account.</p>
                <input
                  ref={fileInput}
                  type="file"
                  accept=".m3u,.m3u8,text/plain"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setFileName(file.name);
                    const text = await file.text();
                    setFileContent(text);
                    if (!name) setName(file.name.replace(/\.m3u8?$/i, ""));
                  }}
                />
              </label>
              <Input label="Name (optional)" placeholder="Weekend VOD" value={name} onChange={setName} />
            </>
          ) : null}

          {mode === "xtream" ? (
            <>
              <Input
                label="Portal URL"
                placeholder="http://portal.example.tv:8080"
                value={serverUrl}
                onChange={setServerUrl}
                required
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Username" placeholder="demo_viewer" value={username} onChange={setUsername} required />
                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••"
                  value={password}
                  onChange={setPassword}
                  required
                />
              </div>
              <p className="rounded-xl border border-white/8 bg-black/20 px-3 py-2 text-[11px] text-slate-400">
                We call <span className="font-mono">player_api.php</span> server-side to import categories, live
                streams, VOD and series episodes. Credentials are stored in your own database.
              </p>
            </>
          ) : null}

          {error ? <ErrorNotice message={error} /> : null}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || (mode === "m3u-file" && !fileContent)}
              className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {pending ? "Importing…" : "Import playlist"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-brand-400/60 focus:ring-2 focus:ring-brand-500/20"
      />
    </label>
  );
}
