'use client';
import { useState, useEffect } from 'react';
import { useParentalStore } from '@/stores/parentalStore';
import { hashPin } from '@/lib/parental';

export function PinGate({ open, onOpenChange, onSuccess }: { open: boolean, onOpenChange: (v:boolean)=>void, onSuccess?: ()=>void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const { pinHash, unlock, addFailedAttempt, failedAttempts, lockoutUntil } = useParentalStore();
  const isLockedOut = lockoutUntil && Date.now() < lockoutUntil;

  useEffect(() => {
    if (!isLockedOut) return;
    const interval = setInterval(() => {
      const left = Math.ceil((lockoutUntil! - Date.now()) / 1000);
      setCountdown(left > 0 ? left : 0);
    }, 500);
    return () => clearInterval(interval);
  }, [isLockedOut, lockoutUntil]);

  async function handleConfirm() {
    if (!pinHash) { setError('Nenhum PIN configurado.'); return; }
    const h = await hashPin(pin);
    if (h === pinHash) {
      unlock();
      setPin(''); setError('');
      onOpenChange(false);
      onSuccess?.();
    } else {
      addFailedAttempt();
      setError(`PIN incorreto. ${failedAttempts + 1}/3`);
      setPin('');
    }
  }
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-[#1a1a1a] border border-zinc-800 p-6 text-white">
        <h2 className="text-lg font-bold mb-1">🔒 Conteúdo Bloqueado</h2>
        <p className="text-sm text-zinc-400 mb-4">Digite o PIN de 4 dígitos.</p>
        <input type="password" maxLength={4} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g,''))} placeholder="****" className="w-full text-center text-3xl tracking-[0.6em] bg-zinc-900 border border-zinc-700 rounded-xl py-3 mb-3 outline-none" autoFocus />
        {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
        {isLockedOut && <p className="text-sm text-yellow-500 mb-2">Aguarde {countdown}s</p>}
        <div className="flex gap-2">
          <button onClick={() => onOpenChange(false)} className="flex-1 py-3 rounded-xl bg-zinc-800">Cancelar</button>
          <button onClick={handleConfirm} disabled={pin.length !== 4 || !!isLockedOut} className="flex-1 py-3 rounded-xl bg-violet-600 disabled:opacity-50 font-bold">Desbloquear</button>
        </div>
      </div>
    </div>
  );
}
