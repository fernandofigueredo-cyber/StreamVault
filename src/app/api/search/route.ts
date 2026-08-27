import { getCurrentUser, unauthorized } from "@/lib/auth";
import { searchEverything } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 1) return Response.json({ items: [], groups: {} });

  const items = await searchEverything(user.id, q);
  const groups = items.reduce<Record<string, typeof items>>((acc, item) => {
    const key = item.kind === "episode" ? "series" : item.kind;
    acc[key] = acc[key] ?? [];
    acc[key].push(item);
    return acc;
  }, {});

  return Response.json({ items, groups });
}
