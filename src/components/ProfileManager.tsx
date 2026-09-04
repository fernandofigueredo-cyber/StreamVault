"use client";

import Link from "next/link";
import { useParentalStore } from "@/stores/parentalStore";
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

  async function create(data: { name: string; avatar: string; pin: string; isKids: boolean }) {
    const r = await fetch("/api/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const res = (await r.json()) as { profile?: Profile; error?: string };
    if (!r.ok) { setNotice(res.error ?? "Erro ao criar perfil."); return; }
    setProfiles((prev) => [...prev, res.profile!]);
    setCreating(false);
    setNotice("Perfil criado com sucesso!");
  }

  async function update(id: number, data: Record<string, unknown>) {
    const r = await fetch(`/api/profiles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
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

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Perfis</h1>
          <p className="mt-1 text-sm text-slate-400">
            Cada perfil tem os seus próprios favoritos, histórico e preferências.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:bg-brand-600"
        >
          <Plus className="h-4 w-4" /> Novo perfil
        </button>
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-200">
          <Check className="h-4 w-4 text-accent-400" /> {notice}
          <button type="button" onClick={() => setNotice(null)} className="ml-auto"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {profiles.map((profile) => (
          <article key={profile.id} className={cn(
            "card rounded-2xl p-4 transition",
            profile.isDefault && "border-brand-400/30 bg-brand-500/5",
          )}>
            <div className="flex items-start gap-3">
              <div className={cn(
                "grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-2xl",
                `bg-gradient-to-br ${gradientFor(profile.name)}`,
              )}>
                {profile.avatar || initialsOf(profile.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-semibold text-white">{profile.name}</h3>
                  {profile.isDefault && (
                    <span className="rounded-md bg-brand-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand-300">
                      Principal
                    </span>
                  )}
                  {profile.isKids && (
                    <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                      Crianças
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {profile.pin ? "🔒 PIN activo" : "Sem PIN"}
                  {profile.isKids ? " · Modo crianças" : ""}
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-2 border-t border-white/6 pt-3">
              {!profile.isDefault && (
                <button
                  type="button"
                  onClick={() => void setDefault(profile.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10"
                >
                  <Shield className="h-3.5 w-3.5" /> Tornar principal
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditing(profile.id)}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10"
              >
                <Pencil className="h-3.5 w-3.5" /> Editar
              </button>
              <button
                type="button"
                onClick={() => void remove(profile.id)}
                className="ml-auto flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-rose-500/15 hover:text-rose-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </article>
        ))}
      </div>

      {(creating || editing !== null) && (
        <ProfileForm
          profile={profiles.find((p) => p.id === editing)}
          onSave={(data) => editing !== null ? void update(editing, data) : void create(data as { name: string; avatar: string; pin: string; isKids: boolean })}
          onClose={() => { setCreating(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function ProfileForm({
  profile,
  onSave,
  onClose,
}: {
  profile?: Profile;
  onSave: (data: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(profile?.name ?? "");
  const [avatar, setAvatar] = useState(profile?.avatar ?? "");
  const [pin, setPin] = useState("");
  const [isKids, setIsKids] = useState(profile?.isKids ?? false);
  const parental = useParentalStore();
  const hasParentalPin = !!parental.pinHash;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md animate-rise rounded-3xl border border-white/10 bg-ink-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">
            {profile ? "Editar perfil" : "Novo perfil"}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Avatar picker */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">Avatar</label>
            <div className="flex flex-wrap gap-2">
              {AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setAvatar(emoji)}
                  className={cn(
                    "grid h-10 w-10 place-items-center rounded-xl border text-xl transition",
                    avatar === emoji ? "border-brand-400/50 bg-brand-500/20" : "border-white/10 bg-white/5 hover:bg-white/10",
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <Field label="Nome">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: João"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white outline-none focus:border-brand-400/60 focus:ring-2 focus:ring-brand-500/20" />
          </Field>

          <Field label="PIN (opcional — 4 dígitos)">
            <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              type="password" inputMode="numeric" placeholder="••••"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white outline-none focus:border-brand-400/60 focus:ring-2 focus:ring-brand-500/20" />
          </Field>

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
              className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
              Cancelar
            </button>
            <button type="button"
              onClick={() => onSave({ name, avatar, pin: pin || undefined, isKids })}
              disabled={!name.trim()}
              className="flex-1 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50">
              Guardar
            </button>
          </div>
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
