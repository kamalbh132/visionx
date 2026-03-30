
import { getServerSession } from "next-auth";
import { authOptions } from "@/core/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

const ALLOWED: Record<string, string> = {
  "image/jpeg": "IMAGE",
  "image/jpg": "IMAGE",
  "image/png": "IMAGE",
  "image/gif": "IMAGE",
  "image/webp": "IMAGE",
  "video/mp4": "VIDEO",
  "video/webm": "VIDEO",
  "video/quicktime": "VIDEO",
  "application/pdf": "PDF",
  "text/plain": "FILE",
  "application/msword": "FILE",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "FILE",
  "application/vnd.ms-excel": "FILE",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "FILE",
  "application/zip": "FILE",
  "application/x-zip-compressed": "FILE",
  // Voice messages
  "audio/webm": "VOICE",
  "audio/ogg": "VOICE",
  "audio/mpeg": "VOICE",
  "audio/mp4": "VOICE",
  "audio/wav": "VOICE",
};

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });

    const type = ALLOWED[file.type];
    if (!type) return NextResponse.json({ error: `File type not allowed: ${file.type}` }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const ext = file.name.split(".").pop() || "bin";
    const name = `${randomUUID()}.${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads", "messages");

    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), Buffer.from(bytes));

    return NextResponse.json({
      fileUrl: `/uploads/messages/${name}`,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      type,
    });
  } catch (err) {
    console.error("[UPLOAD]", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
