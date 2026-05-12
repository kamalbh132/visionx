import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/core/lib/auth";
import { FilesPage } from "@/features/files/components/FilesPage";

export const metadata = { title: "Files — VisionX" };

export default async function FilesRoute() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");
  return <FilesPage myId={session.user.id} myRole={session.user.role} />;
}
