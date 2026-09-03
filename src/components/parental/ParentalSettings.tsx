'use client';
import { useState } from 'react';
import { useParentalStore } from '@/stores/parentalStore';
import { hashPin } from '@/lib/parental';

export function ParentalSettings() {
  const parental = useParentalStore();
  const [newPin, setNewPin] = useState('');
  const [msg, setMsg] = useState('');

  async function savePin() {
    if (newPin.length !== 4) { setMsg('PIN precisa ter 4 dígitos'); return; }
    const h = await hashPin(newPin);
    parental.setPin(h);
    setNewPin('');
    setMsg('PIN salvo! Ative o controle.');
  }

  return (
    <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-white space-y-5">
      <h3 className="font-bold text-lg">Controle Parental</h3>
      <div className="flex justify-between items-center">
        <span>Ativar controle</span>
        <button onClick={() => parental.setEnabled(!parental.enabled)} className={`w-12 h-7 rounded-full p-1 transition ${parental.enabled ? 'bg-violet-600' : 'bg-zinc-700'}`}>
          <div className={`w-5 h-5 bg-white rounded-full transition ${parental.enabled ? 'translate-x-5' : ''}`} />
        </button>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm">Esconder conteúdo adulto</span>
        <button onClick={() => parental.setHideAdult(!parental.hideAdult)} className={`w-12 h-7 rounded-full p-1 transition ${parental.hideAdult ? 'bg-violet-600' : 'bg-zinc-700'}`}>
          <div className={`w-5 h-5 bg-white rounded-full transition ${parental.hideAdult ? 'translate-x-5' : ''}`} />
        </button>
      </div>
      <div className="flex gap-2">
        <input value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g,''))} maxLength={4} placeholder="Novo PIN" className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none" />
        <button onClick={savePin} className="px-5 py-3 rounded-xl bg-violet-600 font-bold">Salvar</button>
      </div>
      {msg && <p className="text-sm text-green-400">{msg}</p>}
      <button onClick={() => parental.lock()} className="w-full py-2 rounded-xl bg-zinc-800 text-sm">Trancar agora</button>
    </div>
  );
}
