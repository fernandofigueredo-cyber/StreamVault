import { requireUser } from "@/lib/auth";
import SettingsPanel from "@/components/SettingsPanel";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-400">
          Account details and the device-level preferences StreamVault keeps in local storage.
        </p>
      </header>
      <SettingsPanel user={{ name: user.name, email: user.email }} />
    </div>
  );
}
