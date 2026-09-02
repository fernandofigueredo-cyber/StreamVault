import { requireUser } from "@/lib/auth";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import ProfileManager from "@/components/ProfileManager";

export const dynamic = "force-dynamic";

export default async function ProfilesPage() {
  const user = await requireUser();
  const userProfiles = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .orderBy(profiles.isDefault, profiles.createdAt);

  return <ProfileManager initialProfiles={userProfiles} />;
}
