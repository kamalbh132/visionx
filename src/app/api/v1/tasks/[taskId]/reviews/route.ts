import { getServerSession } from "next-auth";
import { authOptions } from "@/core/lib/auth";
import prisma from "@/core/lib/prisma";
import { NextResponse } from "next/server";
import { createNotifications } from "@/core/lib/notifications";

export async function GET(
  req: Request,
  context: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await context.params;
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const role = session?.user?.role;
  if (!userId || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: { select: { userId: true } } },
  });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const canRead =
    role === "SUPERADMIN" ||
    task.assignedToId === userId ||
    task.project.userId === userId;
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const reviews = await prisma.taskReview.findMany({
    where: { taskId },
    include: {
      reviewer: { select: { id: true, username: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(reviews);
}

export async function POST(
  req: Request,
  context: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await context.params;
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const role = session?.user?.role;
  if (!userId || !role) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";
  if (!comment) {
    return NextResponse.json({ error: "Comment is required" }, { status: 400 });
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: { select: { userId: true } } },
  });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const canReview =
    role === "SUPERADMIN" ||
    task.assignedToId === userId ||
    (role === "USER" &&
      task.project.userId === userId &&
      task.status === "REVIEW_USER");
  if (!canReview) {
    return NextResponse.json(
      { error: "Review not allowed" },
      { status: 403 }
    );
  }

  const review = await prisma.taskReview.create({
    data: { taskId, reviewerId: userId, comment },
    include: {
      reviewer: { select: { id: true, username: true, role: true } },
    },
  });

  const superAdmins = await prisma.user.findMany({
    where: { role: "SUPERADMIN" },
    select: { id: true },
  });
  await createNotifications({
    userIds: [
      task.assignedToId || "",
      task.project.userId,
      ...superAdmins.map((u) => u.id),
    ],
    title: "New task review",
    message: `New review added for task "${task.title}".`,
  });

  return NextResponse.json(review, { status: 201 });
}
