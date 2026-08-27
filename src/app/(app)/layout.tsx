import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getCurrentUser } from "@/lib/auth";
import { ensureBootstrapped } from "@/db/bootstrap";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  try {
    await ensureBootstrapped();
  } catch {
    /* the database may still be warming up */
  }
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <AppShell user={{ id: user.id, name: user.name, email: user.email }}>{children}</AppShell>;
}
