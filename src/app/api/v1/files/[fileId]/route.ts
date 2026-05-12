import { requireAuth } from "@/core/lib/auth-guard";
import prisma from "@/core/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";

type Ctx = { params: Promise<{ fileId: string }> };

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const { fileId } = await ctx.params;
    const file = await prisma.sharedFile.findUnique({ where: { id: fileId } });
    if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const canDelete = file.uploadedById === user.id || user.role === "SUPERADMIN" || user.role === "ADMIN";
    if (!canDelete) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Delete physical file if not a drive link
    if (file.type !== "DRIVE_LINK" && file.fileUrl.startsWith("/uploads/")) {
      try {
        await unlink(path.join(process.cwd(), "public", file.fileUrl));
      } catch { /* file may not exist */ }
    }

    await prisma.sharedFile.delete({ where: { id: fileId } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("[FILE_DELETE]", e);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
