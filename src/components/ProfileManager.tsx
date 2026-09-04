"use client";

import Link from "next/link";
import { useParentalStore } from "@/stores/parentalStore";
import { useCurrentProfile } from "@/stores/currentProfileStore";
import { hashPin } from "@/lib/parental";
import { useState } from "react";
import { Baby, Check, Pencil, Plus, Shield, Trash2, User, X } from "lucide-react";
import { cn, gradientFor, initialsOf } from "@/lib/utils";
import type { Profile } from "@/db/schema";

const AVATARS = ["🎬", "📺", "🎮", "🏆", "🌍", "🎵", "🌙", "⚡", "🦁", "🐉", "🚀", "🎯"];

export default function ProfileManager({ initialProfiles }: { initialProfiles: Profile[] }) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const parental = useParentalStore();
  const {
    profile: activeProfile,
    setProfile,
    isParentalDisabledForCurrent,
    disableParentalForCurrent,
    enableParentalForCurrent,
  } = useCurrentProfile();

  // Modal PIN (criação/edição)
  const [pendingProfileData, setPendingProfileData] = useState<null | { name: string; avatar: string; pin?: string; isKids: boolean; editingId: number | null }>(null);
  const [pinAuth, setPinAuth] = useState("");
  const [pinAuthError, setPinAuthError] = useState("");

  // Modal PIN (desativar parental no perfil atual)
  const [askDisableParental, setAskDisableParental] = useState(false);
  const [pinDisable, setPinDisable] = useState("");
  const [pinDisableError, setPinDisableError] = useState("");

  // Modal PIN (trocar de perfil quando saindo de Kids)
  const [pendingSwitchProfile, setPendingSwitchProfile] = useState<Profile | null>(null);
  const [pinSwitch, setPinSwitch] = useState("");
  const [pinSwitchError, setPinSwitchError] = useState("");

  async function create(data: { name: string; avatar: string; pin: string; isKids: boolean }) {
    const r = await fetch("/api/profiles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const res = (await r.json()) as { profile?: Profile; error?: string };
    if (!r.ok) { setNotice(res.error ?? "Erro ao criar perfil."); return; }
    setProfiles((prev) => [...prev, res.profile!]);
    setCreating(false);
    setNotice("Perfil criado com sucesso!");
  }

  async function update(id: number, data: Record<string, unknown>) {
    const r = await fetch(`/api/profiles/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const res = (await r.json()) as { profile?: Profile; error?: string };
    if (!r.ok) { setNotice(res.error ?? "Erro ao actualizar."); return; }
    setProfiles((prev) => prev.map((p) => (p.id === id ? (res.profile as Profile) : p)));
    setEditing(null);
    setNotice("Perfil actualizado!");
  }

  async function remove(id: number) {
    if (!window.confirm("Eliminar este perfil?")) return;
    const r = await fetch(`/api/profiles/${id}`, { method: "DELETE" });
    const res = (await r.json()) as { error?: string };
    if (!r.ok) { setNotice(res.error ?? "Erro ao eliminar."); return; }
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    setNotice("Perfil eliminado.");
  }

  async function setDefault(id: number) {
    await update(id, { isDefault: true });
    setProfiles((prev) => prev.map((p) => ({ ...p, isDefault: p.id === id })));
  }

  function useProfile(profile: Profile) {
    // Se está em Kids e quer trocar para outro → pede PIN parental
    if (activeProfile?.isKids && activeProfile.id !== profile.id) {
      if (!parental.pinHash) {
        setNotice("Erro: perfil Kids ativo sem PIN parental definido.");
        return;
      }
      setPendingSwitchProfile(profile);
      setPinSwitch("");
      setPinSwitchError("");
      return;
    }
    setProfile({ id: profile.id, name: profile.name, isKids: profile.isKids, hasPin: !!profile.pin });
    setNotice(`Perfil "${profile.name}" está agora em uso.`);
  }

  async function handlePinAuth() {
    if (!pendingProfileData) return;
    if (pinAuth.length !== 4) { setPinAuthError("Digite o PIN de 4 dígitos"); return; }
    const h = await hashPin(pinAuth);
    if (h !== parental.pinHash) { setPinAuthError("PIN incorreto"); setPinAuth(""); return; }
    const data = pendingProfileData;
    setPendingProfileData(null); setPinAuth(""); setPinAuthError("");
    if (data.editingId !== null) void update(data.editingId, { name: data.name, avatar: data.avatar, pin: data.pin, isKids: data.isKids });
    else void create({ name: data.name, avatar: data.avatar, pin: data.pin ?? "", isKids: data.isKids });
  }

  async function handleDisableParental() {
    if (pinDisable.length !== 4) { setPinDisableError("Digite o PIN de 4 dígitos"); return; }
    const h = await hashPin(pinDisable);
    if (h !== parental.pinHash) { setPinDisableError("PIN incorreto"); setPinDisable(""); return; }
    disableParentalForCurrent();
    setAskDisableParental(false); setPinDisable(""); setPinDisableError("");
    setNotice("Controle parental desativado neste perfil.");
  }

  async function handleSwitchProfile() {
    if (!pendingSwitchProfile) return;
    if (pinSwitch.length !== 4) { setPinSwitchError("Digite o PIN de 4 dígitos"); return; }
    const h = await hashPin(pinSwitch);
    if (h !== parental.pinHash) { setPinSwitchError("PIN incorreto"); setPinSwitch(""); return; }
    const p = pendingSwitchProfile;
    setPendingSwitchProfile(null); setPinSwitch(""); setPinSwitchError("");
    setProfile({ id: p.id, name: p.name, isKids: p.isKids, hasPin: !!p.pin });
    setNotice(`Perfil "${p.name}" está agora em uso.`);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Perfis</h1>
          <p className="mt-1 text-sm text-slate-400">Cada perfil tem os seus próprios favoritos, histórico e preferências.</p>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:bg-brand-600">
          <Plus className="h-4 w-4" /> Novo perfil
        </button>
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-200">
          <Check className="h-4 w-4 text-accent-400" /> {notice}
          <button type="button" onClick={() => setNotice(null)} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Barra do perfil ativo — desativar parental SÓ neste perfil */}
      {activeProfile && !activeProfile.isKids && parental.enabled && parental.pinHash && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="text-sm">
            <p className="font-semibold text-white">Perfil ativo: <span className="text-brand-300">{activeProfile.name}</span></p>
            <p className="text-xs text-slate-400">
              {isParentalDisabledForCurrent ? "🔓 Controle parental DESATIVADO neste perfil" : "🔒 Controle parental ativo neste perfil"}
            </p>
          </div>
          {isParentalDisabledForCurrent ? (
            <button type="button" onClick={() => { enableParentalForCurrent(); setNotice("Controle parental reativado."); }}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500">Reativar aqui</button>
          ) : (
            <button type="button" onClick={() => { setAskDisableParental(true); setPinDisable(""); setPinDisableError(""); }}
              className="rounded-xl bg-zinc-700 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-600">Desativar aqui</button>
          )}
        </div>
      )}

      {activeProfile?.isKids && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <Baby className="h-4 w-4" /> Perfil ativo: <b>{activeProfile.name}</b> · Modo crianças (adulto sempre bloqueado)
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {profiles.map((profile) => {
          const isActive = activeProfile?.id === profile.id;
          return (
            <article key={profile.id} className={cn("card rounded-2xl p-4 transition", isActive && "border-emerald-400/40 bg-emerald-500/10", profile.isDefault && !isActive && "border-brand-400/30 bg-brand-500/5")}>
              <div className="flex items-start gap-3">
                <div className={cn("grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-2xl", `bg-gradient-to-br ${gradientFor(profile.name)}`)}>
                  {profile.avatar || initialsOf(profile.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="truncate font-semibold text-white">{profile.name}</h3>
                    {profile.isDefault && <span className="rounded-md bg-brand-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand-300">Principal</span>}
                    {profile.isKids && <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-300">Crianças</span>}
                    {isActive && <span className="rounded-md bg-emerald-500/25 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-200">EM USO</span>}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {profile.pin ? "🔒 PIN activo" : "Sem PIN"}{profile.isKids ? " · Modo crianças" : ""}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 border-t border-white/6 pt-3">
                <button type="button" onClick={() => useProfile(profile)}
                  className={cn("flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition",
                    isActive ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-200"
                             : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10")}>
                  <User className="h-3.5 w-3.5" /> {isActive ? "Em uso" : "Usar este"}
                </button>

                {!profile.isDefault && (
                  <button type="button" onClick={() => void setDefault(profile.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10">
                    <Shield className="h-3.5 w-3.5" /> Tornar principal
                  </button>
                )}
                <button type="button" onClick={() => setEditing(profile.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10">
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </button>
                <button type="button" onClick={() => void remove(profile.id)}
                  className="ml-auto flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-rose-500/15 hover:text-rose-300">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {(creating || editing !== null) && (
        <ProfileForm profile={profiles.find((p) => p.id === editing)}
          onSave={(data) => {
            const d = data as { name: string; avatar: string; pin?: string; isKids: boolean };
            if (!d.isKids && parental.pinHash) {
              setPendingProfileData({ name: d.name, avatar: d.avatar, pin: d.pin, isKids: d.isKids, editingId: editing });
              setCreating(false); setEditing(null);
              return;
            }
            if (editing !== null) void update(editing, d);
            else void create({ name: d.name, avatar: d.avatar, pin: d.pin ?? "", isKids: d.isKids });
          }}
          onClose={() => { setCreating(false); setEditing(null); }}
        />
      )}

      {/* Modais PIN */}
      {pendingProfileData && (
        <PinModal title="🔒 Autorização necessária"
          subtitle={`Digite o PIN do Controle Parental para ${pendingProfileData.editingId !== null ? "atualizar" : "criar"} o perfil ${pendingProfileData.name}.`}
          value={pinAuth} error={pinAuthError} onChange={setPinAuth}
          onCancel={() => { setPendingProfileData(null); setPinAuth(""); setPinAuthError(""); }}
          onConfirm={handlePinAuth} confirmText="Confirmar" />
      )}

      {askDisableParental && (
        <PinModal title="🔓 Desativar controle parental"
          subtitle={`Digite o PIN para desativar o controle parental apenas no perfil ${activeProfile?.name}.`}
          value={pinDisable} error={pinDisableError} onChange={setPinDisable}
          onCancel={() => { setAskDisableParental(false); setPinDisable(""); setPinDisableError(""); }}
          onConfirm={handleDisableParental} confirmText="Desativar" />
      )}

      {pendingSwitchProfile && (
        <PinModal title="🔒 Sair do perfil Crianças"
          subtitle={`Digite o PIN parental para mudar para o perfil ${pendingSwitchProfile.name}.`}
          value={pinSwitch} error={pinSwitchError} onChange={setPinSwitch}
          onCancel={() => { setPendingSwitchProfile(null); setPinSwitch(""); setPinSwitchError(""); }}
          onConfirm={handleSwitchProfile} confirmText="Trocar" />
      )}
    </div>
  );
}

function PinModal({ title, subtitle, value, error, onChange, onCancel, onConfirm, confirmText }: {
  title: string; subtitle: string; value: string; error: string;
  onChange: (v: string) => void; onCancel: () => void; onConfirm: () => void; confirmText: string;
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-[#1a1a1a] border border-zinc-800 p-6 text-white space-y-3">
        <h3 className="text-lg font-bold">{title}</h3>
        <p className="text-sm text-zinc-400">{subtitle}</p>
        <input type="password" inputMode="numeric" autoFocus maxLength={4}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => { if (e.key === "Enter" && value.length === 4) onConfirm(); }}
          placeholder="****"
          className="w-full text-center text-3xl tracking-[0.6em] bg-zinc-900 border border-zinc-700 rounded-xl py-3 outline-none focus:border-brand-500" />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700">Cancelar</button>
          <button type="button" onClick={onConfirm} disabled={value.length !== 4}
            className="flex-1 py-3 rounded-xl bg-brand-500 font-bold text-white disabled:opacity-50 hover:bg-brand-600">{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

function ProfileForm({ profile, onSave, onClose }: {
  profile?: Profile;
  onSave: (data: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(profile?.name ?? "");
  const [avatar, setAvatar] = useState(profile?.avatar ?? "🎬");
  const [pin, setPin] = useState("");
  const [isKids, setIsKids] = useState(profile?.isKids ?? false);
  const parental = useParentalStore();
  const hasParentalPin = !!parental.pinHash;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-ink-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{profile ? "Editar perfil" : "Novo perfil"}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">Avatar</label>
          <div className="grid grid-cols-6 gap-2">
            {AVATARS.map((emoji) => (
              <button key={emoji} type="button" onClick={() => setAvatar(emoji)}
                className={cn("grid h-10 w-10 place-items-center rounded-xl border text-xl transition",
                  avatar === emoji ? "border-brand-400/50 bg-brand-500/20" : "border-white/10 bg-white/5 hover:bg-white/10")}>{emoji}</button>
            ))}
          </div>
        </div>

        <Field label="Nome">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: João"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white outline-none focus:border-brand-400/60 focus:ring-2 focus:ring-brand-500/20" />
        </Field>

        {isKids ? (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm">
            <p className="font-semibold text-emerald-200">🔒 Protegido pelo Controle Parental</p>
            <p className="mt-1 text-xs text-emerald-100/80">Este perfil vai usar o PIN definido nas Definições.</p>
            {!hasParentalPin && (
              <p className="mt-2 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                ⚠️ Ainda não definiste um PIN. <Link href="/settings" className="font-semibold underline hover:text-amber-100">Definir agora</Link>.
              </p>
            )}
          </div>
        ) : (
          <Field label="PIN (opcional — 4 dígitos)">
            <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              type="password" inputMode="numeric" placeholder="••••"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white outline-none focus:border-brand-400/60 focus:ring-2 focus:ring-brand-500/20" />
          </Field>
        )}

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10">
          <input type="checkbox" checked={isKids} onChange={(e) => setIsKids(e.target.checked)} className="h-4 w-4 accent-brand-500" />
          <div>
            <p className="text-sm font-semibold text-white">Modo crianças</p>
            <p className="text-xs text-slate-400">Restringe o acesso a conteúdo para adultos</p>
          </div>
          <Baby className="ml-auto h-5 w-5 text-emerald-400" />
        </label>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10">Cancelar</button>
          <button type="button"
            onClick={() => onSave({ name, avatar, pin: isKids ? undefined : (pin || undefined), isKids })}
            disabled={!name.trim() || (isKids && !hasParentalPin)}
            className="flex-1 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50">Guardar</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  );
}
