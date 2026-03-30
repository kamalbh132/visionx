import { getServerSession } from "next-auth";
import { authOptions } from "@/core/lib/auth";
import prisma from "@/core/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { content } = body;

    const message = await prisma.message.findUnique({
      where: { id },
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    if (message.senderId !== userId) {
      return NextResponse.json({ error: "Not your message" }, { status: 403 });
    }

    const updated = await prisma.message.update({
      where: { id },
      data: { content, isEdited: true },
      include: { sender: { select: { id: true, username: true } } },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const message = await prisma.message.findUnique({
      where: { id },
      include: {
        conversation: {
          include: { members: { where: { userId } } },
        },
      },
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    const isOwn = message.senderId === userId;
    const isAdmin = message.conversation.members[0]?.isAdmin;
    const isSuperAdmin = session.user.role === "SUPERADMIN";

    if (!isOwn && !isAdmin && !isSuperAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.message.update({
      where: { id },
      data: { isDeleted: true, content: null },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
