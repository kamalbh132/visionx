import { requireAuth } from "@/core/lib/auth-guard";
import prisma from "@/core/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type Ctx = { params: Promise<{ fileId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const { fileId } = await ctx.params;

    const file = await prisma.sharedFile.findUnique({ where: { id: fileId } });
    if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });

    const comments = await prisma.fileComment.findMany({
      where: { fileId },
      include: {
        user: { select: { id: true, username: true, avatarColor: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(comments);
  } catch (e) {
    console.error("[FILE_COMMENTS_GET]", e);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const { fileId } = await ctx.params;
    const { content } = await req.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
    }
    if (content.length > 1000) {
      return NextResponse.json({ error: "Comment too long (max 1000 chars)" }, { status: 400 });
    }

    const file = await prisma.sharedFile.findUnique({ where: { id: fileId } });
    if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });

    const comment = await prisma.fileComment.create({
      data: { fileId, userId: user.id, content: content.trim() },
      include: {
        user: { select: { id: true, username: true, avatarColor: true } },
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (e) {
    console.error("[FILE_COMMENTS_POST]", e);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
