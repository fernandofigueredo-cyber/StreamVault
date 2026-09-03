import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type State = {
  enabled: boolean;
  pinHash: string | null;
  isUnlocked: boolean;
  unlockedUntil: number | null;
  hideAdult: boolean; // true = esconde, false = só borra
  setEnabled: (v: boolean) => void;
  setPin: (hash: string) => void;
  unlock: () => void;
  lock: () => void;
}

export const useParentalStore = create<State>()(persist((set) => ({
  enabled: false,
  pinHash: null,
  isUnlocked: false,
  unlockedUntil: null,
  hideAdult: false,
  setEnabled: (enabled) => set({ enabled }),
  setPin: (pinHash) => set({ pinHash }),
  unlock: () => set({ isUnlocked: true, unlockedUntil: Date.now() + 15 * 60 * 1000 }),
  lock: () => set({ isUnlocked: false, unlockedUntil: null }),
}), { name: 'streamvault-parental-v1' }));