'use client';
import { useSyncExternalStore, useCallback } from 'react';

export type CurrentProfile = {
  id: number;
  name: string;
  isKids: boolean;
  hasPin: boolean;
} | null;

const KEY = 'streamvault.currentProfile';
const DISABLED_KEY = 'streamvault.parentalDisabledPerProfile';

let current: CurrentProfile = null;
let disabledMap: Record<string, boolean> = {};
const listeners = new Set<() => void>();

function load() {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) current = JSON.parse(raw);
    const dm = localStorage.getItem(DISABLED_KEY);
    if (dm) disabledMap = JSON.parse(dm);
  } catch {}
}
function save() {
  if (typeof window === 'undefined') return;
  try {
    if (current) localStorage.setItem(KEY, JSON.stringify(current));
    else localStorage.removeItem(KEY);
    localStorage.setItem(DISABLED_KEY, JSON.stringify(disabledMap));
  } catch {}
}
function emit() { listeners.forEach(l => l()); }

if (typeof window !== 'undefined') load();

export function useCurrentProfile() {
  const snap = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => current,
    () => null,
  );

  const setProfile = useCallback((p: CurrentProfile) => {
    current = p; save(); emit();
  }, []);
  const clearProfile = useCallback(() => {
    current = null; save(); emit();
  }, []);

  const isParentalDisabledForCurrent = current ? !!disabledMap[String(current.id)] : false;

  const disableParentalForCurrent = useCallback(() => {
    if (!current) return;
    disabledMap = { ...disabledMap, [String(current.id)]: true };
    save(); emit();
  }, []);
  const enableParentalForCurrent = useCallback(() => {
    if (!current) return;
    const next = { ...disabledMap };
    delete next[String(current.id)];
    disabledMap = next;
    save(); emit();
  }, []);

  return {
    profile: snap,
    setProfile,
    clearProfile,
    isParentalDisabledForCurrent,
    disableParentalForCurrent,
    enableParentalForCurrent,
  };
}
