"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";
import {
  Loader2,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  Settings2,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Wifi,
  Lock,
} from "lucide-react";
import { cn, formatTime } from "@/lib/utils";
import { useParentalStore } from "@/stores/parentalStore";
import { useCurrentProfile } from "@/stores/currentProfileStore";
import { isAdultContent } from "@/lib/parental";
import { PinGate } from "./parental/PinGate";

type Level = { index: number; height: number; bitrate: number };

export type PlayerSource = {
  itemId: string | number;
  title: string;
  subtitle?: string;
  url: string;
  isLive: boolean;
  resumeAt?: number | null;
  /** Force the HLS pipeline when playback goes through the signed proxy. */
  forceHls?: boolean;
};

const VOLUME_KEY = "streamvault.player.volume";
const MUTED_KEY = "streamvault.player.muted";
const POSITION_KEY = "streamvault.player.positions";

export default function VideoPlayer({ source }: { source: PlayerSource }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<{ destroy: () => void; currentLevel: number } | null>(null);
  const hideTimer = useRef<number | null>(null);
  const lastSaved = useRef(0);

  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [levels, setLevels] = useState<Level[]>([]);
  const [activeLevel, setActiveLevel] = useState(-1);
  const [showMenu, setShowMenu] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [attempt, setAttempt] = useState(0);

  // Parental
  const parental = useParentalStore();
  const [showPin, setShowPin] = useState(false);
  const [tick, setTick] = useState(0);
  const isAdult = useMemo(() => {
    return isAdultContent({
      title: source.title,
      category: source.subtitle || "",
      name: source.title,
    });
  }, [source.title, source.subtitle]);

  useEffect(() => {
    if (!parental.isUnlocked) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [parental.isUnlocked, parental.unlockedUntil]);

  const { profile, isParentalDisabledForCurrent } = useCurrentProfile();

const isUnlocked =
  parental.isUnlocked && parental.unlockedUntil
    ? Date.now() < parental.unlockedUntil
    : false;

const blocked =
  isAdult && !isUnlocked && (
    // A) Perfil Kids → SEMPRE bloqueia adulto
    profile?.isKids === true ||
    // B) Perfil normal → bloqueia se parental global ON E utilizador não desativou aqui
    (!!profile && !profile.isKids && parental.enabled && !isParentalDisabledForCurrent) ||
    // C) Sem perfil selecionado + parental global ON
    (!profile && parental.enabled)
  );

// force re-render each second to auto-lock after 15min
void tick;

  const isHls = source.forceHls ?? /\.m3u8(\?|$)/i.test(source.url);

  useEffect(() => {
    setVolume(Number(window.localStorage.getItem(VOLUME_KEY) ?? "1"));
    setMuted(window.localStorage.getItem(MUTED_KEY) === "1");
  }, []);

  // Attach the stream (HLS via hls.js, native otherwise).
  useEffect(() => {
    if (blocked) {
      setReady(false);
      setBuffering(false);
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    setReady(false);
    setBuffering(true);
    setError(null);
    let disposed = false;

    async function attach() {
      if (!video) return;
      if (isHls && !video.canPlayType("application/vnd.apple.mpegurl")) {
        if (!Hls.isSupported()) {
          setError("HLS is not supported in this browser.");
          return;
        }
        const isLiveStream = source.isLive;
        const hls = new Hls({
          // ── Core ──────────────────────────────────────────────────────
          enableWorker: true,
          lowLatencyMode: false,

          // ── Buffer — live TV needs a bigger runway to avoid stalls ───
          maxBufferLength: isLiveStream ? 60 : 30,
          maxMaxBufferLength: isLiveStream ? 120 : 60,
          maxBufferSize: 60 * 1000 * 1000, // 60 MB
          backBufferLength: isLiveStream ? 0 : 30,
          maxBufferHole: 0.5,

          // ── Live sync ────────────────────────────────────────────────
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 10,
          liveDurationInfinity: true,

          // ── Stall recovery ───────────────────────────────────────────
          nudgeMaxRetry: 10,
          nudgeOffset: 0.2,
          maxStarvationDelay: 4,
          maxLoadingDelay: 4,

          // ── Network timeouts & retries ───────────────────────────────
          manifestLoadingTimeOut: 20000,
          manifestLoadingMaxRetry: 4,
          manifestLoadingRetryDelay: 1000,
          levelLoadingTimeOut: 20000,
          levelLoadingMaxRetry: 4,
          fragLoadingTimeOut: 20000,
          fragLoadingMaxRetry: 6,
          fragLoadingRetryDelay: 500,

          // ── ABR ──────────────────────────────────────────────────────
          startLevel: -1,
          abrEwmaDefaultEstimate: 500000,
        });

        hlsRef.current = hls as unknown as {
          destroy: () => void;
          currentLevel: number;
        };
        hls.loadSource(source.url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setLevels(
            hls.levels.map((level, index) => ({
              index,
              height: level.height ?? 0,
              bitrate: level.bitrate ?? 0,
            })),
          );
         setReady(true);
         setBuffering(false);
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) =>
          setActiveLevel(hls.autoLevelEnabled ? -1 : data.level),
        );

        let mediaErrorCount = 0;
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) {
            if (data.type === "networkError" || data.type === "mediaError") {
              setBuffering(true);
            }
            return;
          }

          if (data.type === "mediaError") {
            mediaErrorCount += 1;
            if (mediaErrorCount <= 3) {
              hls.recoverMediaError();
              return;
            }
          }

          if (data.type === "networkError" && isLiveStream) {
            hls.stopLoad();
            window.setTimeout(() => {
              if (!disposed) {
                hls.startLoad();
              }
            }, 3000);
            return;
          }

          setError(
            data.type === "networkError"
              ? "O stream não está acessível. A fonte pode estar offline ou a bloquear esta rede."
              : "A reprodução falhou. Tente outro canal ou recarregue.",
          );
          setBuffering(false);
        });
        return;
      }
      video.src = source.url;
      video.load();
      setReady(true);
      setBuffering(false);
    }

    void attach();

    return () => {
      disposed = true;
      hlsRef.current?.destroy();
      hlsRef.current = null;
      video.removeAttribute("src");
      video.load();
    };
    }, [source.url, isHls, attempt, source.isLive]);

  // Resume position for on-demand content.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || source.isLive || !source.resumeAt) return;
    const onLoaded = () => {
      if (video.duration && source.resumeAt && source.resumeAt < video.duration - 5) {
        video.currentTime = source.resumeAt;
      }
    };
    video.addEventListener("loadedmetadata", onLoaded, { once: true });
    return () => video.removeEventListener("loadedmetadata", onLoaded);
  }, [source.isLive, source.resumeAt]);

  // Live stream stall recovery.
  useEffect(() => {
    if (!source.isLive) return;
    const video = videoRef.current;
    if (!video) return;

    let stallTimer: number | null = null;

    const onWaiting = () => {
      stallTimer = window.setTimeout(() => {
        const hls = hlsRef.current as unknown as {
          liveSyncPosition?: number;
          startLoad: () => void;
        } | null;
        if (!hls || !video) return;

        const liveEdge = hls.liveSyncPosition;
        if (
          liveEdge &&
          Number.isFinite(liveEdge) &&
          Math.abs(video.currentTime - liveEdge) > 5
        ) {
          video.currentTime = liveEdge;
        }
        hls.startLoad();
      }, 4000);
    };

    const onPlaying = () => {
      if (stallTimer) {
        window.clearTimeout(stallTimer);
        stallTimer = null;
      }
    };

    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("canplay", onPlaying);

    return () => {
      if (stallTimer) window.clearTimeout(stallTimer);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("canplay", onPlaying);
    };
  }, [source.isLive, attempt]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    video.muted = muted;
  }, [volume, muted]);

  const persist = useCallback(
    (position: number, total: number) => {
      try {
        const raw = JSON.parse(
          window.localStorage.getItem(POSITION_KEY) ?? "{}",
        ) as Record<string, number>;
        raw[String(source.itemId)] = Math.floor(position);
        window.localStorage.setItem(POSITION_KEY, JSON.stringify(raw));
        window.localStorage.setItem(
          "streamvault.player.lastPlayed",
          JSON.stringify({
            itemId: source.itemId,
            title: source.title,
            at: Date.now(),
          }),
        );
      } catch {
        /* ignore quota errors */
      }
      if (position > 0 && (position - lastSaved.current > 15 || total - position < 5)) {
        lastSaved.current = position;
        void fetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({
            itemId: source.itemId,
            positionSecs: Math.floor(position),
            durationSecs: Number.isFinite(total) ? Math.floor(total) : null,
          }),
        });
      }
    },
    [source.itemId, source.title],
  );

 const togglePlay = useCallback(async () => {
  const video = videoRef.current;
  if (!video) return;

  if (!video.paused) {
    video.pause();
    return;
  }

  setError(null);
  setBuffering(true);

  try {
    await video.play();
  } catch (playError) {
    const errorName =
      playError instanceof DOMException ? playError.name : "";

    console.error("Falha ao reproduzir o stream:", playError);

    setPlaying(false);
    setBuffering(false);
    setReady(true);

    // Essas falhas não significam que o canal está offline.
    if (
      errorName === "AbortError" ||
      errorName === "NotAllowedError"
    ) {
      return;
    }

    setError(
      "Não foi possível reproduzir este canal. A fonte pode estar offline ou usar um formato incompatível.",
    );
  }
}, []);

  const seekBy = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = Math.min(
      video.duration - 1,
      Math.max(0, video.currentTime + delta),
    );
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const shell = shellRef.current;
    const video = videoRef.current;
    if (!shell) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
      return;
    }
    try {
      if (shell.requestFullscreen) await shell.requestFullscreen();
      else if (video && "webkitEnterFullscreen" in video)
        (
          video as HTMLVideoElement & { webkitEnterFullscreen: () => void }
        ).webkitEnterFullscreen();
    } catch {
      /* ignore */
    }
  }, []);

  const togglePip = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {
      /* unsupported */
    }
  }, []);

  useEffect(() => {
    function onChange() {
      setFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (event.key === " " || event.key === "k") {
        event.preventDefault();
        togglePlay();
      } else if (event.key === "ArrowRight") seekBy(10);
      else if (event.key === "ArrowLeft") seekBy(-10);
      else if (event.key === "m") setMuted((prev) => !prev);
      else if (event.key === "f") void toggleFullscreen();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, seekBy, toggleFullscreen]);

  const bumpControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setControlsVisible(false), 3000);
  }, []);

  const live = duration === 0 || !Number.isFinite(duration);
  const progressPercent = live
    ? 100
    : Math.min(100, (current / Math.max(duration, 1)) * 100);
  const bufferedPercent = live
    ? 100
    : Math.min(100, (buffered / Math.max(duration, 1)) * 100);

  // Parental block screen
  if (blocked) {
    return (
      <div className="grid aspect-video w-full place-items-center rounded-2xl border border-white/10 bg-black text-center">
        <div className="max-w-sm px-6">
          <Lock className="mx-auto h-10 w-10 text-brand-300" />
          <h3 className="mt-3 text-base font-semibold text-white">
            Conteúdo protegido
          </h3>
          <p className="mt-1.5 text-sm text-slate-400">
            Introduz o PIN parental para desbloquear este conteúdo.
          </p>
          <button
            type="button"
            onClick={() => setShowPin(true)}
            className="mx-auto mt-4 flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            <Lock className="h-4 w-4" /> Desbloquear
          </button>
        </div>
        <PinGate
  open={showPin}
  onOpenChange={setShowPin}
  onSuccess={() => setShowPin(false)}
/>
      </div>
    );
  }

  return (
    <div
      ref={shellRef}
      onMouseMove={bumpControls}
      onMouseLeave={() => setControlsVisible(false)}
      onTouchStart={bumpControls}
      className={cn(
        "group relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl shadow-black/60",
        fullscreen ? "h-dvh rounded-none" : "aspect-video",
      )}
    >
      <video
       ref={videoRef}
       playsInline
       preload="auto"
       className="h-full w-full bg-black"
       onPlay={() => {
          setPlaying(true);
          bumpControls();
        }}
        onPause={() => setPlaying(false)}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onCanPlay={() => {
          setBuffering(false);
          setReady(true);
        }}
        onTimeUpdate={(event) => {
          const video = event.currentTarget;
          setCurrent(video.currentTime);
          if (video.buffered.length > 0)
            setBuffered(video.buffered.end(video.buffered.length - 1));
          persist(video.currentTime, video.duration);
        }}
        onDurationChange={(event) => setDuration(event.currentTarget.duration)}
        onEnded={() => setPlaying(false)}
        onError={() => {
          if (!isHls) setError("This stream could not be played in your browser.");
          setBuffering(false);
        }}
        onClick={togglePlay}
      />

      {buffering && !error ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/35">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-brand-300" />
            <p className="text-xs text-slate-300">Buffering stream…</p>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="absolute inset-0 grid place-items-center bg-black/85 p-6 text-center">
          <div className="max-w-sm">
            <Wifi className="mx-auto h-9 w-9 text-rose-400" />
            <h3 className="mt-3 text-base font-semibold text-white">Stream unavailable</h3>
            <p className="mt-1.5 text-sm text-slate-400">{error}</p>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setBuffering(true);
                setAttempt((prev) => prev + 1);
              }}
              className="mx-auto mt-4 flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              <RotateCcw className="h-4 w-4" /> Retry stream
            </button>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pb-3 pt-10 transition-opacity duration-200 sm:px-4",
          controlsVisible || !playing ? "opacity-100" : "opacity-0",
        )}
      >
        {!live ? (
          <div className="relative mb-2 h-1.5 w-full rounded-full bg-white/20">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-white/25"
              style={{ width: `${bufferedPercent}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-brand-400"
              style={{ width: `${progressPercent}%` }}
            />
            <input
              type="range"
              min={0}
              max={Math.max(duration, 1)}
              step={1}
              value={current}
              onChange={(event) => {
                const video = videoRef.current;
                if (video) video.currentTime = Number(event.target.value);
                setCurrent(Number(event.target.value));
              }}
              aria-label="Seek"
              className="absolute inset-0 h-1.5 w-full cursor-pointer opacity-0"
            />
          </div>
        ) : (
          <div className="mb-2 flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-md bg-rose-500/90 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> live
            </span>
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/15">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-brand-400" />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className="grid h-10 w-10 place-items-center rounded-full bg-white text-black transition hover:scale-105"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Play className="h-5 w-5 fill-current" />
            )}
          </button>

          {!live ? (
            <>
              <ControlButton label="Back 10 seconds" onClick={() => seekBy(-10)}>
                <SkipBack className="h-4 w-4" />
              </ControlButton>
              <ControlButton label="Forward 10 seconds" onClick={() => seekBy(10)}>
                <SkipForward className="h-4 w-4" />
              </ControlButton>
            </>
          ) : null}

          <div className="group/vol flex items-center gap-1.5">
            <ControlButton
              label={muted ? "Unmute" : "Mute"}
              onClick={() => setMuted((prev) => !prev)}
            >
              {muted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </ControlButton>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={(event) => {
                const next = Number(event.target.value);
                setVolume(next);
                setMuted(next === 0);
                window.localStorage.setItem(VOLUME_KEY, String(next));
                window.localStorage.setItem(MUTED_KEY, next === 0 ? "1" : "0");
              }}
              aria-label="Volume"
              className="w-16 sm:w-24"
            />
          </div>

          <span className="ml-1 font-mono text-[11px] tabular-nums text-slate-300">
            {live ? "Live" : `${formatTime(current)} / ${formatTime(duration)}`}
          </span>

          <div className="ml-auto flex items-center gap-1.5">
            <div className="relative">
              <ControlButton
                label="Quality"
                onClick={() => setShowMenu((prev) => !prev)}
                active={showMenu}
                disabled={levels.length === 0}
              >
                <Settings2 className="h-4 w-4" />
              </ControlButton>
              {showMenu && levels.length > 0 ? (
                <div className="absolute bottom-12 right-0 w-40 overflow-hidden rounded-xl border border-white/10 bg-ink-900/95 p-1 text-xs shadow-2xl backdrop-blur">
                  <button
                    type="button"
                    onClick={() => {
                      if (hlsRef.current) hlsRef.current.currentLevel = -1;
                      setActiveLevel(-1);
                      setShowMenu(false);
                    }}
                    className={cn(
                      "block w-full rounded-lg px-2.5 py-2 text-left transition hover:bg-white/10",
                      activeLevel === -1 && "text-brand-300",
                    )}
                  >
                    Auto
                  </button>
                  {levels
                    .slice()
                    .sort((a, b) => b.height - a.height)
                    .map((level) => (
                      <button
                        key={level.index}
                        type="button"
                        onClick={() => {
                          if (hlsRef.current) hlsRef.current.currentLevel = level.index;
                          setActiveLevel(level.index);
                          setShowMenu(false);
                        }}
                        className={cn(
                          "block w-full rounded-lg px-2.5 py-2 text-left transition hover:bg-white/10",
                          activeLevel === level.index && "text-brand-300",
                        )}
                      >
                        {level.height
                          ? `${level.height}p`
                          : `${Math.round(level.bitrate / 1000)} kbps`}
                      </button>
                    ))}
                </div>
              ) : null}
            </div>

            <ControlButton label="Picture in picture" onClick={() => void togglePip()}>
              <PictureInPicture2 className="h-4 w-4" />
            </ControlButton>
            <ControlButton
              label="Fullscreen"
              onClick={() => void toggleFullscreen()}
            >
              {fullscreen ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
            </ControlButton>
          </div>
        </div>
      </div>

      {!playing && !error && ready ? (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 grid place-items-center bg-black/25 transition hover:bg-black/35"
          aria-label="Play"
        >
          <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-500/95 shadow-2xl shadow-black/50 transition hover:scale-105">
            <Play className="h-7 w-7 fill-white text-white" />
          </span>
        </button>
      ) : null}
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  children,
  active,
  disabled,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      disabled={disabled}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-black/40 text-slate-200 backdrop-blur transition hover:bg-white/15 disabled:opacity-40",
        active && "bg-brand-500/80 text-white",
      )}
    >
      {children}
    </button>
  );
}
