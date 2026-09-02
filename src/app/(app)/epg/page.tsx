import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { channels, epgPrograms } from "@/db/schema";
import { and, asc, eq, gt, lt } from "drizzle-orm";
import EpgGrid from "@/components/EpgGrid";

export const dynamic = "force-dynamic";

export default async function EpgPage() {
  const user = await requireUser();

  const now = new Date();
  const from = new Date(now.getTime() - 2 * 3600000);
  const to   = new Date(now.getTime() + 6 * 3600000);

  // Load live channels with EPG
  const liveChannels = await db
    .select()
    .from(channels)
    .where(and(eq(channels.userId, user.id), eq(channels.kind, "live")))
    .orderBy(asc(channels.sortOrder), asc(channels.name))
    .limit(80);

  const channelIds = liveChannels.map((c) => c.id);

  const programs = channelIds.length
    ? await db
        .select()
        .from(epgPrograms)
        .where(
          and(
            eq(epgPrograms.userId, user.id),
            lt(epgPrograms.startsAt, to),
            gt(epgPrograms.endsAt, from),
          ),
        )
        .orderBy(asc(epgPrograms.startsAt))
    : [];

  const programsByChannel = new Map<number, typeof programs>();
  programs.forEach((p) => {
    if (!programsByChannel.has(p.itemId)) programsByChannel.set(p.itemId, []);
    programsByChannel.get(p.itemId)!.push(p);
  });

  const epgChannels = liveChannels
    .filter((c) => (programsByChannel.get(c.id)?.length ?? 0) > 0)
    .map((c) => ({
      id: c.id,
      name: c.name,
      logo: c.logo,
      programs: (programsByChannel.get(c.id) ?? []).map((p) => ({
        id: p.id,
        itemId: p.itemId,
        title: p.title,
        description: p.description,
        startsAt: p.startsAt.toISOString(),
        endsAt: p.endsAt.toISOString(),
      })),
    }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Guia de Programação</h1>
        <p className="mt-1 text-sm text-slate-400">
          Todos os canais ao vivo com os programas actuais e próximos. Clique num canal para assistir.
        </p>
      </div>

      {epgChannels.length === 0 ? (
        <div className="card flex flex-col items-center justify-center rounded-3xl px-6 py-16 text-center">
          <p className="text-lg font-semibold text-white">Sem dados EPG disponíveis</p>
          <p className="mt-2 max-w-md text-sm text-slate-400">
            O EPG é preenchido automaticamente quando importa uma lista Xtream Codes com URL XMLTV
            configurado. Os canais M3U simples não têm guia de programação.
          </p>
        </div>
      ) : (
        <EpgGrid channels={epgChannels} />
      )}
    </div>
  );
}
