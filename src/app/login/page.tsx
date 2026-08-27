import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/auth";
import { ensureBootstrapped } from "@/db/bootstrap";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  try {
    await ensureBootstrapped();
  } catch {
    /* ignore — the health endpoint or a later request will seed */
  }
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  return (
    <main className="grid min-h-dvh place-items-center px-6 py-12">
      <AuthForm mode="login" />
    </main>
  );
}
