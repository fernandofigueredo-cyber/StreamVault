'use client';
import { useState, useMemo } from 'react';
import { useParentalStore } from '@/stores/parentalStore';
import { isAdultContent } from '@/lib/parental';
import { PinGate } from './PinGate';

export function ParentalGuard({ item, children }: { item: any, children: React.ReactNode }) {
  const [showPin, setShowPin] = useState(false);
  const parental = useParentalStore();

  const itemIsAdult = useMemo(() => {
    if (item.isAdult === true) return true;
    if (item.isAdult === false) return false;
    return isAdultContent({
      category: item.groupTitle || item.category || item.genre || '',
      title: item.name || item.title || '',
      rating: item.rating || ''
    });
  }, [item]);

  const isUnlockValid = parental.unlockedUntil ? Date.now() < parental.unlockedUntil : false;
  const blocked = parental.enabled && itemIsAdult && !isUnlockValid;

  if (blocked && parental.hideAdult) return null;

  return (
    <div className="relative">
      <div className={blocked ? 'blur-[18px] pointer-events-none select-none' : ''}>
        {children}
      </div>
      {blocked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-xl gap-2 p-2">
          <span className="text-2xl">🔒</span>
          <button onClick={() => setShowPin(true)} className="text-xs bg-white text-black px-3 py-1 rounded-full font-bold">Desbloquear</button>
        </div>
      )}
      <PinGate open={showPin} onOpenChange={setShowPin} />
    </div>
  );
}
