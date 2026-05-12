import { getServerSession } from "next-auth";
import { authOptions } from "@/core/lib/auth";
import prisma from "@/core/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const roleFilter = searchParams.get("role");

    const users = await prisma.user.findMany({
      where: {
        isVerified: true,
        id: { not: userId },
        ...(roleFilter ? { role: roleFilter as any } : {}),
        OR: query
          ? [
              { username: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ]
          : undefined,
      },
      select: { id: true, username: true, email: true, role: true },
      take: 20,
      orderBy: { username: "asc" },
    });

    return NextResponse.json(users);
  } catch {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
