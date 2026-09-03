'use client';
import { useSyncExternalStore, useCallback } from 'react';

type ParentalState = {
  enabled: boolean;
  pinHash: string | null;
  isUnlocked: boolean;
  unlockedUntil: number | null;
  hideAdult: boolean;
  failedAttempts: number;
  lockoutUntil: number | null;
}

const STORAGE_KEY = 'streamvault-parental-v1';

const DEFAULT: ParentalState = {
  enabled: false,
  pinHash: null,
  isUnlocked: false,
  unlockedUntil: null,
  hideAdult: true,
  failedAttempts: 0,
  lockoutUntil: null,
};

let state: ParentalState = DEFAULT;
let listeners = new Set<() => void>();

function load() {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = { ...DEFAULT, ...JSON.parse(raw) };
  } catch {}
}
function save() {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}
function setState(patch: Partial<ParentalState>) {
  state = { ...state, ...patch };
  save();
  listeners.forEach(l => l());
}

if (typeof window !== 'undefined') load();

export function useParentalStore() {
  const snap = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => state,
    () => DEFAULT
  );

  const setEnabled = useCallback((enabled: boolean) => setState({ enabled }), []);
  const setPin = useCallback((pinHash: string) => setState({ pinHash, failedAttempts: 0, lockoutUntil: null }), []);
  const setHideAdult = useCallback((hideAdult: boolean) => setState({ hideAdult }), []);
  const unlock = useCallback(() => setState({ isUnlocked: true, unlockedUntil: Date.now() + 15 * 60 * 1000, failedAttempts: 0 }), []);
  const lock = useCallback(() => setState({ isUnlocked: false, unlockedUntil: null }), []);
  const addFailedAttempt = useCallback(() => {
    const attempts = state.failedAttempts + 1;
    if (attempts >= 3) setState({ failedAttempts: attempts, lockoutUntil: Date.now() + 30 * 1000 });
    else setState({ failedAttempts: attempts });
  }, []);

  return { ...snap, setEnabled, setPin, setHideAdult, unlock, lock, addFailedAttempt };
}
