import { NextResponse } from "next/server";
import prisma from "@/core/lib/prisma";
import { requireAuth } from "@/core/lib/auth-guard";

export async function GET() {
  const { user, error } = await requireAuth(["ADMIN", "SUPERADMIN"]);
  if (error) return error;

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      // Never return password hashes
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json(users);
  } catch {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
