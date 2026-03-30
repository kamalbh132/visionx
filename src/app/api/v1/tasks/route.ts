import { requireAuth } from "@/core/lib/auth-guard";
import prisma from "@/core/lib/prisma";
import { NextResponse } from "next/server";
import { createNotifications } from "@/core/lib/notifications";
import { parseBody, createTaskSchema } from "@/core/lib/validation";

export async function GET(req: Request) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;
    if (user.role === "USER") where.assignedToId = user.id;

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, username: true, role: true } },
        createdBy:  { select: { id: true, username: true, role: true } },
        reviews: {
          include: { reviewer: { select: { id: true, username: true, role: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("[TASKS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const body = await req.json();
    const parsed = parseBody(createTaskSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { title, description, priority, projectId, assignedToId, deadline, isCritical } = parsed.data;

    const parsedDeadline = new Date(deadline);
    if (Number.isNaN(parsedDeadline.getTime())) {
      return NextResponse.json({ error: "Invalid deadline" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, userId: true },
    });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    let normalizedAssignedToId: string | null = null;

    if (user.role === "SUPERADMIN") {
      if (!assignedToId) return NextResponse.json({ error: "Assignee is required" }, { status: 400 });
      const assignee = await prisma.user.findUnique({
        where: { id: assignedToId },
        select: { id: true, role: true, isVerified: true },
      });
      if (!assignee?.isVerified || !["ADMIN", "USER"].includes(assignee.role)) {
        return NextResponse.json({ error: "Assignee must be a verified ADMIN or USER" }, { status: 400 });
      }
      normalizedAssignedToId = assignee.id;
    } else if (user.role === "ADMIN") {
      if (assignedToId && assignedToId !== user.id) {
        const assignee = await prisma.user.findUnique({
          where: { id: assignedToId },
          select: { id: true, role: true, isVerified: true },
        });
        if (!assignee?.isVerified || assignee.role !== "USER") {
          return NextResponse.json({ error: "ADMIN can only assign to verified USERs" }, { status: 400 });
        }
        normalizedAssignedToId = assignee.id;
      } else {
        normalizedAssignedToId = user.id;
      }
    } else {
      normalizedAssignedToId = user.id;
    }

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        priority: priority || "MEDIUM",
        projectId,
        createdById: user.id,
        assignedToId: normalizedAssignedToId,
        isCompleted: false,
        status: "TODO",
        deadline: parsedDeadline,
        isCritical: isCritical || false,
      },
      include: {
        assignedTo: { select: { id: true, username: true, role: true } },
        createdBy:  { select: { id: true, username: true, role: true } },
        reviews: [],
      },
    });

    if (normalizedAssignedToId && normalizedAssignedToId !== user.id) {
      await createNotifications({
        userIds: [normalizedAssignedToId],
        title: "New task assigned",
        message: `You have been assigned to task "${task.title}".`,
        actorId: user.id,
      });
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("[TASKS_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
