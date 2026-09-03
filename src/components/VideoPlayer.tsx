"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
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
import { isAdultContent } from "@/lib/parental";
import { PinGate } from "./parental/PinGate";

type Level = { index: number; height: number; bitrate: number };

export type PlayerSource = {
  itemId: number;
  title: string;
  subtitle?: string | null;
  url: string;
  isLive: boolean;
  resumeAt?: number | null;
  forceHls?: boolean;
};

const VOLUME_KEY = "streamvault.player.volume";
const MUTED_KEY = "streamvault.player.muted";
const POSITION_KEY = "streamvault.player.positions";

export default function VideoPlayer({ source }: { source: PlayerSource }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<{ destroy: () => void; currentLevel: number } | null>(null);
  const hideTimer = useRef<number | null>(null);
  const lastSaved = useRef(0);

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
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
      category: source.subtitle || '', 
      name: source.title 
    });
  }, [source.title, source.subtitle]);
  
  useEffect(() => {
    if (!parental.isUnlocked) return;
    const id = setInterval(() => setTick(t => t+1), 1000);
    return () => clearInterval(id);
  }, [parental.isUnlocked, parental.unlockedUntil]);

  const isUnlocked = parental.isUnlocked && parental.unlockedUntil ? Date.now() < parental.unlockedUntil : false;
  const blocked = parental.enabled && isAdult && !isUnlocked;
  // force re-render each second to auto-lock after 15min
  void tick;

  const isHls = source.forceHls ?? /\.m3u8(\?|$)/i.test(source.url);

  useEffect(() => {
    const storedVolume = Number(window.localStorage.getItem(VOLUME_KEY));
    if (Number.isFinite(storedVolume) && storedVolume > 0) setVolume(storedVolume);
    setMuted(window.localStorage.getItem(MUTED_KEY) === "1");
  }, []);

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
      if (isHls) {
        if (video.canPlayType("application/vnd.apple.mpegurl") && !window.MediaSource) {
          video.src = source.url;
          return;
        }
        const mod = await import("hls.js");
        const Hls = mod.default;
        if (disposed) return;
        if (!Hls.isSupported()) {
          video.src = source.url;
          return;
        }
        const isLiveStream = source.isLive;
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          
