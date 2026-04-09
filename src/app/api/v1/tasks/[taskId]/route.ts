import { requireAuth } from "@/core/lib/auth-guard";
import prisma from "@/core/lib/prisma";
import { NextResponse } from "next/server";
import { createNotifications } from "@/core/lib/notifications";
import { parseBody, updateTaskSchema } from "@/core/lib/validation";

type Ctx = { params: Promise<{ taskId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { taskId } = await ctx.params;
    const { user, error } = await requireAuth();
    if (error) return error;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: { select: { id: true, userId: true, name: true } },
        assignedTo: { select: { id: true, username: true, role: true } },
        createdBy:  { select: { id: true, username: true, role: true } },
        reviews: {
          include: { reviewer: { select: { id: true, username: true, role: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const canView =
      user.role === "SUPERADMIN" ||
      task.assignedToId === user.id ||
      task.createdById  === user.id ||
      task.project.userId === user.id;
    if (!canView) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json(task);
  } catch (error) {
    console.error("[TASK_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { taskId } = await ctx.params;
    const { user, error } = await requireAuth();
    if (error) return error;

    const body = await req.json();
    const parsed = parseBody(updateTaskSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { status, deadline } = parsed.data;
    if (!status && !deadline) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

    const existing = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { select: { userId: true } } },
    });
    if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const isAssigned   = existing.assignedToId === user.id;
    const isSuperAdmin = user.role === "SUPERADMIN";

    if (!isSuperAdmin && !isAssigned) {
      return NextResponse.json({ error: "Only the assigned user can move this task" }, { status: 403 });
    }

    const updates: { status?: string; isCompleted?: boolean; deadline?: Date } = {};

    if (deadline) {
      if (!isSuperAdmin) return NextResponse.json({ error: "Only SUPERADMIN can change deadlines" }, { status: 403 });
      const parsed = new Date(deadline);
      if (Number.isNaN(parsed.getTime())) return NextResponse.json({ error: "Invalid deadline" }, { status: 400 });
      updates.deadline = parsed;
    }

    if (status) {
      const allStatuses = ["TODO", "IN_PROGRESS", "REVIEW_SUPERADMIN", "COMPLETED"];
      if (!allStatuses.includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

      if (!isSuperAdmin) {
        // Non-superadmin: forward-only, one step at a time
        const forwardMap: Record<string, string> = {
          TODO:              "IN_PROGRESS",
          IN_PROGRESS:       "REVIEW_SUPERADMIN",
          REVIEW_SUPERADMIN: "COMPLETED",
        };
        if (forwardMap[existing.status] !== status) {
          return NextResponse.json(
            { error: `You can only move this task to "${forwardMap[existing.status] ?? "nowhere"}"` },
            { status: 400 }
          );
        }
      }
      // SUPERADMIN can move freely in any direction — no restriction

      updates.status = status;
      updates.isCompleted = status === "COMPLETED";
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: updates,
      include: {
        assignedTo: { select: { id: true, username: true } },
        createdBy:  { select: { id: true, username: true } },
        reviews: {
          include: { reviewer: { select: { id: true, username: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (status === "REVIEW_SUPERADMIN" || status === "COMPLETED") {
      const superAdmins = await prisma.user.findMany({ where: { role: "SUPERADMIN" }, select: { id: true } });
      await createNotifications({
        userIds: superAdmins.map((u) => u.id),
        title: "Task status updated",
        message: `Task "${task.title}" moved to ${status.replace(/_/g, " ")}.`,
        link: "/projects",
        actorId: user.id,
      });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("[TASK_PATCH]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const { taskId } = await ctx.params;
    const { user, error } = await requireAuth();
    if (error) return error;

    const task = await prisma.task.findUnique({ where: { id: taskId }, include: { project: { select: { userId: true } } } });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const canDelete = user.role === "SUPERADMIN" || task.project.userId === user.id || task.createdById === user.id;
    if (!canDelete) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.task.delete({ where: { id: taskId } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[TASK_DELETE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
