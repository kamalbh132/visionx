import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/core/lib/auth";
import prisma from "@/core/lib/prisma";

type Role = "SUPERADMIN" | "ADMIN" | "USER";

const ROLE_LEVEL: Record<Role, number> = {
  USER: 1,
  ADMIN: 2,
  SUPERADMIN: 3,
};

// GET /api/v1/conversations/[id]  — fetch messages with pagination
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") ?? "40");
  const cursor = searchParams.get("cursor");

  // Verify membership
  const membership = await prisma.conversationMember.findFirst({
    where: { conversationId: id, userId },
  });
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    include: {
      sender: { select: { id: true, username: true, email: true, role: true } },
      replyTo: {
        include: {
          sender: { select: { id: true, username: true, email: true, role: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = messages.length > limit;
  if (hasMore) messages.pop();

  return NextResponse.json({
    messages,
    hasMore,
    nextCursor: hasMore ? messages[0]?.id ?? null : null,
  });
}

// PATCH /api/v1/conversations/[id]  — add or remove members
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const myRole = session.user.role as Role;
  const body = await req.json();

  const myMembership = await prisma.conversationMember.findFirst({
    where: { conversationId: id, userId },
  });
  if (!myMembership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  // ── ADD MEMBERS ──────────────────────────────────────────────────────────────
  if (body.addMemberIds && Array.isArray(body.addMemberIds)) {
    // Check actor is group admin OR superadmin
    const amGroupAdmin = myMembership?.isAdmin ?? false;
    if (!amGroupAdmin && myRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Not a group admin" }, { status: 403 });
    }

    // Fetch each target user and validate role is allowed
    const targetUsers: { id: string; role: Role }[] = await prisma.user.findMany({
      where: { id: { in: body.addMemberIds } },
      select: { id: true, role: true },
    });

    const myLevel = ROLE_LEVEL[myRole];
    for (const tu of targetUsers) {
      const tuLevel = ROLE_LEVEL[tu.role as Role] ?? 0;
      if (tuLevel > myLevel) {
        return NextResponse.json(
          { error: `You cannot add a ${tu.role} to this group` },
          { status: 403 }
        );
      }
    }

    await prisma.conversationMember.createMany({
      data: targetUsers.map((u) => ({
        conversationId: id,
        userId: u.id,
        isAdmin: false,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({ ok: true });
  }

  // ── REMOVE MEMBER ─────────────────────────────────────────────────────────────
  if (body.removeMemberId) {
    const targetId: string = body.removeMemberId;

    // Cannot remove yourself this way
    if (targetId === userId) {
      return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
    }

    // Fetch target user's role
    const targetUser = await prisma.user.findUnique({
      where: { id: targetId },
      select: { role: true },
    });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const targetRole = targetUser.role as Role;
    // SUPERADMIN can remove ADMIN and USER
    // ADMIN can remove USER only
    // USER cannot remove anyone
    if (myRole === "USER") {
      return NextResponse.json({ error: "Users cannot remove members" }, { status: 403 });
    }
    if (myRole === "ADMIN" && targetRole !== "USER") {
      return NextResponse.json(
        { error: "Admins can only remove USER members" },
        { status: 403 }
      );
    }
    // SUPERADMIN: can remove anyone below or equal (except another SUPERADMIN if desired — allow for now)

    await prisma.conversationMember.deleteMany({
      where: { conversationId: id, userId: targetId },
    });

    return NextResponse.json({ ok: true });
  }

  // ── UPDATE GROUP NAME ─────────────────────────────────────────────────────────
  if (body.name) {
    await prisma.conversation.update({
      where: { id },
      data: { name: body.name },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "No valid action" }, { status: 400 });
}
