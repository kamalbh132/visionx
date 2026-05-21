import { requireAuth } from "@/core/lib/auth-guard";
import prisma from "@/core/lib/prisma";
import { NextResponse } from "next/server";
import { parseBody, createProjectSchema } from "@/core/lib/validation";

const taskIncludes = {
  assignedTo: { select: { id: true, username: true } },
  createdBy:  { select: { id: true, username: true } },
  reviews: {
    include: { reviewer: { select: { id: true, username: true } } },
    orderBy: { createdAt: "desc" as const },
    take: 5,
  },
};

export async function GET() {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const where =
      user.role === "SUPERADMIN"
        ? { userId: user.id }
        : { members: { some: { userId: user.id } } };

    const projects = await prisma.project.findMany({
      where,
      include: {
        _count: { select: { tasks: true } },
        members: { include: { user: { select: { id: true, username: true, role: true } } } },
        tasks: {
          ...(user.role !== "SUPERADMIN" ? { where: { assignedToId: user.id } } : {}),
          include: taskIncludes,
          orderBy: { createdAt: "asc" as const },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("[PROJECTS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { user, error } = await requireAuth(["SUPERADMIN"]);
    if (error) return error;

    const body = await req.json();
    const parsed = parseBody(createProjectSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { name, description, dueDate, memberIds } = parsed.data;

    // Validate dueDate if provided
    let parsedDueDate: Date | null = null;
    if (dueDate) {
      parsedDueDate = new Date(dueDate);
      if (isNaN(parsedDueDate.getTime())) {
        return NextResponse.json({ error: "Invalid due date" }, { status: 400 });
      }
    }

    const validatedMemberIds: string[] = [];
    if (Array.isArray(memberIds) && memberIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: memberIds }, isVerified: true, role: { in: ["ADMIN", "USER"] } },
        select: { id: true },
      });
      validatedMemberIds.push(...users.map((u) => u.id));
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        dueDate: parsedDueDate,
        userId: user.id,
        members: {
          create: validatedMemberIds.map((uid) => ({ userId: uid })),
        },
      },
      include: {
        _count: { select: { tasks: true } },
        members: { include: { user: { select: { id: true, username: true, role: true } } } },
        tasks: { include: taskIncludes },
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("[PROJECTS_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
