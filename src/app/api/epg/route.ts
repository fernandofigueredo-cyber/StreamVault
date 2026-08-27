import { getCurrentUser, unauthorized } from "@/lib/auth";
import { getEpgSchedule, getNowNext } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const channelId = Number(searchParams.get("channelId"));
  if (!Number.isFinite(channelId) || channelId <= 0) {
    return Response.json({ error: "channelId is required." }, { status: 400 });
  }

  const scope = searchParams.get("scope") ?? "day";
  const programs =
    scope === "now" ? await getNowNext(user.id, channelId) : await getEpgSchedule(user.id, channelId);
  return Response.json({ programs });
}
