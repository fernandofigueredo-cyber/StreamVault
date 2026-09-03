'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useParentalStore } from '@/stores/parentalStore';
import { hashPin } from '@/lib/parental';

export function PinGate({ open, onOpenChange, onSuccess }: { open: boolean, onOpenChange: (v:boolean)=>void, onSuccess?: ()=>void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const { pinHash, unlock, addFailedAttempt, failedAttempts, lockoutUntil } = useParentalStore();

  const isLockedOut = lockoutUntil && Date.now() < lockoutUntil;

  async function handleConfirm() {
    if (isLockedOut) return;
    if (!pinHash) return;
    const hash = await hashPin(pin);
    if (hash === pinHash) {
      unlock();
      setPin('');
      setError('');
      onOpenChange(false);
      onSuccess?.();
    } else {
      addFailedAttempt();
      setError(`PIN incorreto. Tentativa ${failedAttempts + 1}/3`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#121212] border-zinc-800 text-white">
        <DialogHeader><DialogTitle>🔒 Conteúdo Bloqueado</DialogTitle></DialogHeader>
        <p className="text-sm text-zinc-400">Digite o PIN de 4 dígitos para desbloquear por 15 minutos.</p>
        <Input type="password" maxLength={4} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,''))} placeholder="****" className="text-center text-2xl tracking-[0.5em]" />
        {error && <p className="text-sm text-red-500">{error}</p>}
        {isLockedOut && <p className="text-sm text-yellow-500">Muitas tentativas. Aguarde 30 segundos.</p>}
        <Button onClick={handleConfirm} disabled={pin.length !== 4 || !!isLockedOut} className="w-full bg-violet-600 hover:bg-violet-700">Desbloquear</Button>
      </DialogContent>
    </Dialog>
  );
}