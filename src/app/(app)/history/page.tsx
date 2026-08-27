import { requireUser } from "@/lib/auth";
import { listHistory } from "@/lib/queries";
import HistoryList from "@/components/HistoryList";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const user = await requireUser();
  const items = await listHistory(user.id, 60);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Continue watching</h1>
        <p className="mt-1 text-sm text-slate-400">
          Your playback positions are stored against your account and mirrored in this browser for instant resume.
        </p>
      </header>
      <HistoryList initialItems={items} />
    </div>
  );
}
