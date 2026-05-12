import { requireAuth } from "@/core/lib/auth-guard";
import prisma from "@/core/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type Ctx = { params: Promise<{ fileId: string; commentId: string }> };

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const { commentId } = await ctx.params;

    const comment = await prisma.fileComment.findUnique({ where: { id: commentId } });
    if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const canDelete = comment.userId === user.id || user.role === "SUPERADMIN" || user.role === "ADMIN";
    if (!canDelete) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await prisma.fileComment.delete({ where: { id: commentId } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("[FILE_COMMENT_DELETE]", e);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
