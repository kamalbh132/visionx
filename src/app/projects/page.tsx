import { getServerSession } from "next-auth";
import { authOptions } from "@/core/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/core/lib/prisma";
import { ProjectsKanbanPage } from "@/features/projects/components/ProjectsKanbanPage";

export const metadata = { title: "Projects — VisionX" };

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");

  const userId = session.user.id;
  const role   = session.user.role;

  // SUPERADMIN sees projects they own; others see projects they're a member of
  const where =
    role === "SUPERADMIN"
      ? { userId }
      : { members: { some: { userId } } };

  const projects = await prisma.project.findMany({
    where,
    include: {
      _count: { select: { tasks: true } },
      members: { include: { user: { select: { id: true, username: true, role: true } } } },
      tasks: {
        ...(role !== "SUPERADMIN" ? { where: { assignedToId: userId } } : {}),
        include: {
          assignedTo: { select: { id: true, username: true } },
          createdBy:  { select: { id: true, username: true } },
          reviews: {
            include: { reviewer: { select: { id: true, username: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <ProjectsKanbanPage
        projects={projects as any}
        myRole={role}
        myId={userId}
      />
    </div>
  );
}
