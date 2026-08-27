import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureBootstrapped } from "@/db/bootstrap";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
  } catch {
    return Response.json({ ok: false, db: false }, { status: 500 });
  }

  let seeded = false;
  try {
    await ensureBootstrapped();
    seeded = true;
  } catch {
    seeded = false;
  }

  return Response.json({ ok: true, db: true, seeded });
}
