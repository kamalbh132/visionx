import { requireAuth } from "@/core/lib/auth-guard";
import prisma from "@/core/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { hash, compare } from "bcryptjs";

const updateProfileSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
  bio: z.string().max(300).optional().nullable(),
  avatarColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true, username: true, email: true, role: true,
        isVerified: true, bio: true, avatarColor: true,
        createdAt: true,
        _count: { select: { assignedTasks: true, createdTasks: true, projectMemberships: true } },
      },
    });
    if (!dbUser) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(dbUser);
  } catch {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json();

    // Password change
    if (body.currentPassword !== undefined) {
      const parsed = changePasswordSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
      }
      const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { password: true } });
      if (!dbUser?.password) return NextResponse.json({ error: "No password set (OAuth account)" }, { status: 400 });
      const valid = await compare(parsed.data.currentPassword, dbUser.password);
      if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      const hashed = await hash(parsed.data.newPassword, 12);
      await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
      return NextResponse.json({ ok: true });
    }

    // Profile update
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    // Check username uniqueness
    if (parsed.data.username) {
      const existing = await prisma.user.findFirst({
        where: { username: parsed.data.username, NOT: { id: user.id } },
      });
      if (existing) return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(parsed.data.username ? { username: parsed.data.username } : {}),
        ...(parsed.data.bio !== undefined ? { bio: parsed.data.bio } : {}),
        ...(parsed.data.avatarColor ? { avatarColor: parsed.data.avatarColor } : {}),
      },
      select: { id: true, username: true, email: true, role: true, bio: true, avatarColor: true },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
