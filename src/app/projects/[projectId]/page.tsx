import { getServerSession } from "next-auth";
import { authOptions } from "@/core/lib/auth";
import prisma from "@/core/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { KanbanBoard } from "@/features/projects/components/KanbanBoard";

export default async function ProjectKanbanPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");

  const userId = session.user.id;
  const role = session.user.role;

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ...(role === "SUPERADMIN" ? {} : role === "ADMIN" ? {} : { userId }),
    },
    include: {
      tasks: {
        ...(role === "USER" ? { where: { assignedToId: userId } } : {}),
        include: {
          assignedTo: { select: { id: true, username: true } },
          createdBy: { select: { id: true, username: true } },
          reviews: {
            include: { reviewer: { select: { id: true, username: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!project) return notFound();

  return (
    <KanbanBoard
      project={project as any}
      myRole={role}
      myId={userId}
    />
  );
}
