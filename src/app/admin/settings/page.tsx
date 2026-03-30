import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/core/lib/auth";
import prisma from "@/core/lib/prisma";
import { SettingsPage } from "@/features/settings/components/SettingsPage";

export const metadata = { title: "Settings — VisionX" };

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");

  const profile = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, username: true, email: true, role: true,
      isVerified: true, bio: true, avatarColor: true, createdAt: true,
      _count: { select: { assignedTasks: true, createdTasks: true, projectMemberships: true } },
    },
  });

  if (!profile) redirect("/auth/login");

  return <SettingsPage initialProfile={profile as any} />;
}
