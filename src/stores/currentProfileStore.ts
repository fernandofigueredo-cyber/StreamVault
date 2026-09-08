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

type Snapshot = {
  profile: CurrentProfile;
  disabledMap: Record<string, boolean>;
  /** false até o localStorage ser lido — o player NÃO deve bloquear antes disso. */
  hydrated: boolean;
};

const SERVER_SNAPSHOT: Snapshot = { profile: null, disabledMap: {}, hydrated: false };

let snapshot: Snapshot = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function commit(next: Partial<Snapshot>) {
  // nova referência = React detecta a mudança
  snapshot = { ...snapshot, ...next };
  emit();
}

function persist() {
  if (typeof window === 'undefined') return;
  try {
    if (snapshot.profile) localStorage.setItem(KEY, JSON.stringify(snapshot.profile));
    else localStorage.removeItem(KEY);
    localStorage.setItem(DISABLED_KEY, JSON.stringify(snapshot.disabledMap));
  } catch {
    /* quota / modo privado */
  }
}

function loadFromStorage() {
  if (typeof window === 'undefined') return;
  let profile: CurrentProfile = null;
  let disabledMap: Record<string, boolean> = {};
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) profile = JSON.parse(raw);
    const dm = localStorage.getItem(DISABLED_KEY);
    if (dm) disabledMap = JSON.parse(dm);
  } catch {
    /* json inválido */
  }
  snapshot = { profile, disabledMap, hydrated: true };
  emit();
}

// carrega assim que o módulo entra no cliente
if (typeof window !== 'undefined') {
  loadFromStorage();

  // sincroniza entre abas
  window.addEventListener('storage', (e) => {
    if (e.key === KEY || e.key === DISABLED_KEY) loadFromStorage();
  });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useCurrentProfile() {
  const snap = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => SERVER_SNAPSHOT,
  );

  const setProfile = useCallback((p: CurrentProfile) => {
    commit({ profile: p, hydrated: true });
    persist();
  }, []);

  const clearProfile = useCallback(() => {
    commit({ profile: null });
    persist();
  }, []);

  const disableParentalForCurrent = useCallback(() => {
    const p = snapshot.profile;
    if (!p) return;
    commit({ disabledMap: { ...snapshot.disabledMap, [String(p.id)]: true } });
    persist();
  }, []);

  const enableParentalForCurrent = useCallback(() => {
    const p = snapshot.profile;
    if (!p) return;
    const next = { ...snapshot.disabledMap };
    delete next[String(p.id)];
    commit({ disabledMap: next });
    persist();
  }, []);

  const isParentalDisabledForCurrent = snap.profile
    ? !!snap.disabledMap[String(snap.profile.id)]
    : false;

  return {
    profile: snap.profile,
    /** 🔑 use isto no player: enquanto false, NÃO bloqueie nada */
    hydrated: snap.hydrated,
    setProfile,
    clearProfile,
    isParentalDisabledForCurrent,
    disableParentalForCurrent,
    enableParentalForCurrent,
  };
}
