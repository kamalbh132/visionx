import { requireAuth } from "@/core/lib/auth-guard";
import prisma from "@/core/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const MAX_SIZE = 100 * 1024 * 1024; // 100MB

const MIME_TO_TYPE: Record<string, string> = {
  "application/pdf": "PDF",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOC",
  "application/vnd.ms-powerpoint": "PPTX",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
  "application/vnd.ms-excel": "DOC",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "DOC",
  "text/plain": "DOC",
  "image/jpeg": "IMAGE", "image/jpg": "IMAGE", "image/png": "IMAGE",
  "image/gif": "IMAGE", "image/webp": "IMAGE", "image/svg+xml": "IMAGE",
  "video/mp4": "VIDEO", "video/webm": "VIDEO", "video/quicktime": "VIDEO",
  "video/x-msvideo": "VIDEO",
};

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const type   = searchParams.get("type");
    const search = searchParams.get("q");
    const cursor = searchParams.get("cursor");
    const limit  = 20;

    const files = await prisma.sharedFile.findMany({
      where: {
        ...(type && type !== "ALL" ? { type: type as any } : {}),
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      },
      include: {
        uploadedBy: { select: { id: true, username: true, avatarColor: true } },
        reactions: { include: { user: { select: { id: true, username: true } } } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = files.length > limit;
    const items   = hasMore ? files.slice(0, limit) : files;

    return NextResponse.json({ files: items, hasMore, nextCursor: hasMore ? items[items.length - 1].id : null });
  } catch (e) {
    console.error("[FILES_GET]", e);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const contentType = req.headers.get("content-type") ?? "";

    // ── Drive link ──
    if (contentType.includes("application/json")) {
      const { name, description, driveUrl } = await req.json();
      if (!name || !driveUrl) return NextResponse.json({ error: "Name and URL required" }, { status: 400 });

      const file = await prisma.sharedFile.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          type: "DRIVE_LINK",
          fileUrl: driveUrl,
          uploadedById: user.id,
        },
        include: {
          uploadedBy: { select: { id: true, username: true, avatarColor: true } },
          reactions: { include: { user: { select: { id: true, username: true } } } },
          _count: { select: { comments: true } },
        },
      });
      return NextResponse.json(file, { status: 201 });
    }

    // ── File upload ──
    const formData = await req.formData();
    const uploadedFile = formData.get("file") as File;
    const name        = (formData.get("name") as string) || uploadedFile?.name;
    const description = (formData.get("description") as string) || null;

    if (!uploadedFile) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (uploadedFile.size > MAX_SIZE) return NextResponse.json({ error: "File too large (max 100MB)" }, { status: 400 });

    const fileType = MIME_TO_TYPE[uploadedFile.type] ?? "OTHER";
    const ext  = uploadedFile.name.split(".").pop() || "bin";
    const uuid = randomUUID();
    const filename = `${uuid}.${ext}`;
    const dir  = path.join(process.cwd(), "public", "uploads", "files");

    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), Buffer.from(await uploadedFile.arrayBuffer()));

    const file = await prisma.sharedFile.create({
      data: {
        name: (name || uploadedFile.name).trim(),
        description: description?.trim() || null,
        type: fileType as any,
        fileUrl: `/uploads/files/${filename}`,
        fileSize: uploadedFile.size,
        mimeType: uploadedFile.type,
        uploadedById: user.id,
      },
      include: {
        uploadedBy: { select: { id: true, username: true, avatarColor: true } },
        reactions: { include: { user: { select: { id: true, username: true } } } },
        _count: { select: { comments: true } },
      },
    });

    return NextResponse.json(file, { status: 201 });
  } catch (e) {
    console.error("[FILES_POST]", e);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
