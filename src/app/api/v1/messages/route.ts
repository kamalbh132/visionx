import { requireAuth } from "@/core/lib/auth-guard";
import prisma from "@/core/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { parseBody, sendMessageSchema } from "@/core/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    const body = await req.json();
    const parsed = parseBody(sendMessageSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { conversationId, content, type = "TEXT", fileUrl, fileName, fileSize, mimeType, replyToId } = parsed.data;

    if (!content && !fileUrl) {
      return NextResponse.json({ error: "content or fileUrl required" }, { status: 400 });
    }

    // Sanitize text content — strip null bytes
    const safeContent = content ? content.replace(/\0/g, "").trim() : null;
    if (type === "TEXT" && !safeContent) {
      return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
    }

    const membership = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId: user.id } },
    });
    if (!membership) {
      return NextResponse.json({ error: "Not a member of this conversation" }, { status: 403 });
    }

    // Validate replyToId belongs to same conversation
    if (replyToId) {
      const replyMsg = await prisma.message.findUnique({
        where: { id: replyToId },
        select: { conversationId: true },
      });
      if (!replyMsg || replyMsg.conversationId !== conversationId) {
        return NextResponse.json({ error: "Invalid reply target" }, { status: 400 });
      }
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: user.id,
        type: type ?? "TEXT",
        content: safeContent,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileSize: fileSize || null,
        mimeType: mimeType || null,
        replyToId: replyToId || null,
      },
      include: {
        sender: { select: { id: true, username: true, email: true, role: true } },
        replyTo: { include: { sender: { select: { id: true, username: true } } } },
      },
    });

    // Update conversation timestamp in background — don't await
    prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    }).catch(() => {});

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("[MESSAGES_POST]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
