import { getServerSession } from "next-auth";
import { authOptions } from "@/core/lib/auth";
import { redirect } from "next/navigation";
import { MessagesLayout } from "@/features/messages/components/MessagesLayout";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return <MessagesLayout myId={session.user.id} />;
}