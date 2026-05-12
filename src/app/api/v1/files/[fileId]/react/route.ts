import { requireAuth } from "@/core/lib/auth-guard";
import prisma from "@/core/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type Ctx = { params: Promise<{ fileId: string }> };

const ALLOWED_EMOJIS = ["👍", "❤️", "🔥", "😮", "👏", "🎉"];

export async function POST(req: NextRequest, ctx: Ctx) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const { fileId } = await ctx.params;
    const { emoji } = await req.json();

    if (!ALLOWED_EMOJIS.includes(emoji)) {
      return NextResponse.json({ error: "Invalid emoji" }, { status: 400 });
    }

    const file = await prisma.sharedFile.findUnique({ where: { id: fileId } });
    if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Toggle — if already reacted with same emoji, remove it
    const existing = await prisma.fileReaction.findUnique({
      where: { fileId_userId_emoji: { fileId, userId: user.id, emoji } },
    });

    if (existing) {
      await prisma.fileReaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.fileReaction.create({ data: { fileId, userId: user.id, emoji } });
    }

    const reactions = await prisma.fileReaction.findMany({
      where: { fileId },
      include: { user: { select: { id: true, username: true } } },
    });

    return NextResponse.json({ reactions });
  } catch (e) {
    console.error("[FILE_REACT]", e);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
