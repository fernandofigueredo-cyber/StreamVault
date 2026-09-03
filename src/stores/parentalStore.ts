'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type ParentalState = {
  enabled: boolean;
  pinHash: string | null;
  isUnlocked: boolean;
  unlockedUntil: number | null;
  hideAdult: boolean;
  failedAttempts: number;
  lockoutUntil: number | null;
  setEnabled: (v: boolean) => void;
  setPin: (hash: string) => void;
  setHideAdult: (v: boolean) => void;
  unlock: () => void;
  lock: () => void;
  addFailedAttempt: () => void;
}

export const useParentalStore = create<ParentalState>()(
  persist(
    (set, get) => ({
      enabled: false,
      pinHash: null,
      isUnlocked: false,
      unlockedUntil: null,
      hideAdult: true,
      failedAttempts: 0,
      lockoutUntil: null,
      setEnabled: (enabled) => set({ enabled }),
      setPin: (pinHash) => set({ pinHash, failedAttempts: 0, lockoutUntil: null }),
      setHideAdult: (hideAdult) => set({ hideAdult }),
      unlock: () => set({ isUnlocked: true, unlockedUntil: Date.now() + 15 * 60 * 1000, failedAttempts: 0 }),
      lock: () => set({ isUnlocked: false, unlockedUntil: null }),
      addFailedAttempt: () => {
        const attempts = get().failedAttempts + 1;
        if (attempts >= 3) {
          set({ failedAttempts: attempts, lockoutUntil: Date.now() + 30 * 1000 });
        } else {
          set({ failedAttempts: attempts });
        }
      }
    }),
    { 
      name: 'streamvault-parental-v1',
      storage: createJSONStorage(() => localStorage), // <--- ESSA LINHA CONSERTA O BUILD NA VERCEL
    }
  )
);
