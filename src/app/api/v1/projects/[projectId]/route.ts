import { getServerSession } from "next-auth";
import { authOptions } from "@/core/lib/auth";
import prisma from "@/core/lib/prisma";
import { NextResponse } from "next/server";

type Ctx = { params: Promise<{ projectId: string }> };

// PATCH — rename, change description/dueDate, update members
export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { projectId } = await ctx.params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "SUPERADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const { name, description, dueDate, memberIds } = body;

    // Update project fields
    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(name        !== undefined ? { name }                              : {}),
        ...(description !== undefined ? { description: description || null }  : {}),
        ...(dueDate     !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
      },
    });

    // Replace members if provided
    if (Array.isArray(memberIds)) {
      const users = await prisma.user.findMany({
        where: { id: { in: memberIds }, isVerified: true, role: { in: ["ADMIN", "USER"] } },
        select: { id: true },
      });
      const validIds = users.map((u) => u.id);

      await prisma.projectMember.deleteMany({ where: { projectId } });
      if (validIds.length > 0) {
        await prisma.projectMember.createMany({
          data: validIds.map((uid) => ({ projectId, userId: uid })),
          skipDuplicates: true,
        });
      }
    }

    const result = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        _count: { select: { tasks: true } },
        members: { include: { user: { select: { id: true, username: true, role: true } } } },
        tasks: {
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
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[PROJECT_PATCH]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// DELETE — remove project (SUPERADMIN only)
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const { projectId } = await ctx.params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "SUPERADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.project.delete({ where: { id: projectId } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[PROJECT_DELETE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
