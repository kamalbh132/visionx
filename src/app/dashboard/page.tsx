import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/core/lib/auth";
import prisma from "@/core/lib/prisma";
import { DashboardPage } from "@/features/dashboard/components/DashboardPage";

export const metadata = { title: "Dashboard — VisionX" };

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");

  const userId = session.user.id;
  const role   = session.user.role as "SUPERADMIN" | "ADMIN" | "USER";
  const now    = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd   = new Date(todayStart.getTime() + 86400000);

  if (role === "SUPERADMIN") {
    const [
      totalUsers, pendingUsers, totalProjects, totalTasks,
      recentUsers, tasksByStatus, recentNotifications, unreadCount,
      completedThisWeek,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isVerified: false } }),
      prisma.project.count(),
      prisma.task.count(),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" }, take: 6,
        select: { id: true, username: true, email: true, role: true, isVerified: true, createdAt: true },
      }),
      prisma.task.groupBy({ by: ["status"], _count: { id: true } }),
      prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 6 }),
      prisma.notification.count({ where: { userId, isRead: false } }),
      prisma.task.count({ where: { status: "COMPLETED", updatedAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
    ]);
    return (
      <DashboardPage role="SUPERADMIN" username={session.user.username ?? session.user.email ?? ""}
        data={{ totalUsers, pendingUsers, totalProjects, totalTasks, recentUsers, tasksByStatus, recentNotifications, unreadCount, completedThisWeek }}
      />
    );
  }

  if (role === "ADMIN") {
    const [
      totalUsers, pendingUsers, myTasks, myProjects,
      recentUsers, recentNotifications, unreadCount, overdueCount,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "USER" } }),
      prisma.user.count({ where: { isVerified: false, role: "USER" } }),
      prisma.task.findMany({
        where: { createdById: userId },
        orderBy: { createdAt: "desc" }, take: 6,
        include: { assignedTo: { select: { id: true, username: true } } },
      }),
      prisma.project.findMany({
        where: { members: { some: { userId } } },
        orderBy: { updatedAt: "desc" }, take: 4,
        include: { _count: { select: { tasks: true } }, tasks: { select: { status: true } } },
      }),
      prisma.user.findMany({
        where: { role: "USER", isVerified: false },
        orderBy: { createdAt: "desc" }, take: 5,
        select: { id: true, username: true, email: true, role: true, isVerified: true, createdAt: true },
      }),
      prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 6 }),
      prisma.notification.count({ where: { userId, isRead: false } }),
      prisma.task.count({ where: { createdById: userId, deadline: { lt: now }, status: { not: "COMPLETED" } } }),
    ]);
    return (
      <DashboardPage role="ADMIN" username={session.user.username ?? session.user.email ?? ""}
        data={{ totalUsers, pendingUsers, myTasks, myProjects, recentUsers, recentNotifications, unreadCount, overdueCount }}
      />
    );
  }

  // USER
  const [myTasks, myProjects, recentNotifications, unreadCount, dueToday] = await Promise.all([
    prisma.task.findMany({
      where: { assignedToId: userId },
      orderBy: { deadline: "asc" }, take: 8,
      include: {
        project: { select: { id: true, name: true } },
        createdBy: { select: { id: true, username: true } },
      },
    }),
    prisma.project.findMany({
      where: { members: { some: { userId } } },
      orderBy: { updatedAt: "desc" }, take: 4,
      include: { _count: { select: { tasks: true } }, tasks: { where: { assignedToId: userId }, select: { status: true } } },
    }),
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.notification.count({ where: { userId, isRead: false } }),
    prisma.task.count({ where: { assignedToId: userId, deadline: { gte: todayStart, lt: todayEnd }, status: { not: "COMPLETED" } } }),
  ]);

  return (
    <DashboardPage role="USER" username={session.user.username ?? session.user.email ?? ""}
      data={{ myTasks, myProjects, recentNotifications, unreadCount, dueToday }}
    />
  );
}
