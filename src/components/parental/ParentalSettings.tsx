'use client';
import { useState } from 'react';
import { useParentalStore } from '@/stores/parentalStore';
import { hashPin } from '@/lib/parental';

export function ParentalSettings() {
  const parental = useParentalStore();
  const hasPin = !!parental.pinHash;

  // Modal para confirmar PIN ao desativar
  const [askDisable, setAskDisable] = useState(false);
  const [pinToDisable, setPinToDisable] = useState('');
  const [disableError, setDisableError] = useState('');

  // Formulário definir/alterar PIN
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinMsg, setPinMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  function toggleEnabled() {
    // LIGAR sempre livre
    if (!parental.enabled) {
      if (!hasPin) {
        setPinMsg({ type: 'err', text: 'Define um PIN antes de ativar o controle.' });
        return;
      }
      parental.setEnabled(true);
      return;
    }
    // DESLIGAR: se tem PIN, exige confirmação
    if (hasPin) {
      setAskDisable(true);
      setPinToDisable('');
      setDisableError('');
    } else {
      parental.setEnabled(false);
    }
  }

  async function confirmDisable() {
    if (pinToDisable.length !== 4) {
      setDisableError('Digite o PIN de 4 dígitos');
      return;
    }
    const h = await hashPin(pinToDisable);
    if (h === parental.pinHash) {
      parental.setEnabled(false);
      parental.lock();
      setAskDisable(false);
      setPinToDisable('');
      setDisableError('');
    } else {
      setDisableError('PIN incorreto');
      setPinToDisable('');
    }
  }

  async function savePin() {
    setPinMsg(null);

    // Se já existe PIN, precisa validar o atual
    if (hasPin) {
      if (currentPin.length !== 4) {
        setPinMsg({ type: 'err', text: 'Digite o PIN atual (4 dígitos).' });
        return;
      }
      const h = await hashPin(currentPin);
      if (h !== parental.pinHash) {
        setPinMsg({ type: 'err', text: 'PIN atual incorreto.' });
        return;
      }
    }

    if (newPin.length !== 4) {
      setPinMsg({ type: 'err', text: 'O novo PIN precisa ter 4 dígitos.' });
      return;
    }
    if (newPin !== confirmPin) {
      setPinMsg({ type: 'err', text: 'A confirmação não coincide com o novo PIN.' });
      return;
    }
    if (hasPin && newPin === currentPin) {
      setPinMsg({ type: 'err', text: 'O novo PIN deve ser diferente do atual.' });
      return;
    }

    const nh = await hashPin(newPin);
    parental.setPin(nh);
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setPinMsg({
      type: 'ok',
      text: hasPin ? 'PIN alterado com sucesso!' : 'PIN definido! Agora podes ativar o controle.',
    });
  }

  return (
    <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-white space-y-5">
      <h3 className="font-bold text-lg">Controle Parental</h3>

      {/* Ativar controle */}
      <div className="flex justify-between items-center gap-4">
        <div>
          <span className="block">Ativar controle</span>
          {parental.enabled && hasPin && (
            <span className="text-xs text-zinc-400">
              🔒 Protegido — PIN é exigido para desativar
            </span>
          )}
          {!hasPin && (
            <span className="text-xs text-amber-400">
              ⚠️ Define um PIN abaixo antes de ativar
            </span>
          )}
        </div>
        <button
          onClick={toggleEnabled}
          aria-label="Ativar controle parental"
          className={`shrink-0 w-12 h-7 rounded-full p-1 transition ${
            parental.enabled ? 'bg-violet-600' : 'bg-zinc-700'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition ${
              parental.enabled ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>

      {/* Esconder conteúdo adulto */}
      <div className="flex justify-between items-center gap-4">
        <span className="text-sm">Esconder conteúdo adulto</span>
        <button
          onClick={() => parental.setHideAdult(!parental.hideAdult)}
          aria-label="Esconder conteúdo adulto"
          className={`shrink-0 w-12 h-7 rounded-full p-1 transition ${
            parental.hideAdult ? 'bg-violet-600' : 'bg-zinc-700'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full transition ${
              parental.hideAdult ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>

      {/* Definir / Alterar PIN */}
      <div className="pt-4 border-t border-zinc-800 space-y-3">
        <h4 className="font-semibold text-sm">
          {hasPin ? '🔑 Alterar PIN' : '🔑 Definir PIN'}
        </h4>
        {hasPin && (
          <p className="text-xs text-zinc-400">
            Para alterar o PIN, precisa digitar o PIN atual.
          </p>
        )}

        {hasPin && (
          <input
            type="password"
            inputMode="numeric"
            value={currentPin}
            onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
            maxLength={4}
            placeholder="PIN atual"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none focus:border-violet-500"
          />
        )}

        <input
          type="password"
          inputMode="numeric"
          value={newPin}
          onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
          maxLength={4}
          placeholder="Novo PIN (4 dígitos)"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none focus:border-violet-500"
        />

        <input
          type="password"
          inputMode="numeric"
          value={confirmPin}
          onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
          maxLength={4}
          placeholder="Confirmar novo PIN"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none focus:border-violet-500"
        />

        <button
          onClick={savePin}
          className="w-full px-5 py-3 rounded-xl bg-violet-600 font-bold hover:bg-violet-500 transition"
        >
          {hasPin ? 'Alterar PIN' : 'Salvar PIN'}
        </button>

        {pinMsg && (
          <p
            className={`text-sm ${
              pinMsg.type === 'ok' ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {pinMsg.text}
          </p>
        )}
      </div>

      {/* Trancar agora */}
      <button
        onClick={() => parental.lock()}
        className="w-full py-2 rounded-xl bg-zinc-800 text-sm hover:bg-zinc-700 transition"
      >
        Trancar agora
      </button>

      {/* Modal: confirmar PIN para desativar */}
      {askDisable && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#1a1a1a] border border-zinc-800 p-6 text-white space-y-3">
            <h3 className="text-lg font-bold">🔒 Confirmar desativação</h3>
            <p className="text-sm text-zinc-400">
              Digite o PIN atual para desativar o controle parental.
            </p>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={pinToDisable}
              onChange={(e) => setPinToDisable(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && pinToDisable.length === 4) confirmDisable();
              }}
              maxLength={4}
              placeholder="****"
              className="w-full text-center text-3xl tracking-[0.6em] bg-zinc-900 border border-zinc-700 rounded-xl py-3 outline-none focus:border-violet-500"
            />
            {disableError && (
              <p className="text-sm text-red-500">{disableError}</p>
            )}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setAskDisable(false);
                  setPinToDisable('');
                  setDisableError('');
                }}
                className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDisable}
                disabled={pinToDisable.length !== 4}
                className="flex-1 py-3 rounded-xl bg-violet-600 font-bold disabled:opacity-50 hover:bg-violet-500 transition"
              >
                Desativar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
