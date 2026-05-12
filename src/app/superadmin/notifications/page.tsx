import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/core/lib/auth";
import { NotificationsPage } from "@/features/notifications/components/NotificationsPage";

export const metadata = { title: "Notifications — VisionX" };

export default async function SuperadminNotificationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");
  return <NotificationsPage />;
}
