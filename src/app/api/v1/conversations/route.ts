// src/app/api/v1/conversations/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/core/lib/auth";
import prisma from "@/core/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";

// GET: List all conversations for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        members: { some: { userId } },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, email: true, role: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            sender: { select: { id: true, username: true } },
          },
        },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(conversations);
  } catch (error) {
    console.error("[CONVERSATIONS_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

// POST: Create a new conversation (DM or Group)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, name, description, memberIds } = body;

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json({ error: "memberIds required" }, { status: 400 });
    }

    // For DM: check if conversation already exists between these two users
    if (type === "DIRECT") {
      const targetId = memberIds[0];
      if (!targetId) {
        return NextResponse.json({ error: "Target user required for DM" }, { status: 400 });
      }
      if (targetId === userId) {
        return NextResponse.json({ error: "Cannot start DM with yourself" }, { status: 400 });
      }

      const targetExists = await prisma.user.findUnique({
        where: { id: targetId },
        select: { id: true, isVerified: true },
      });
      if (!targetExists || !targetExists.isVerified) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const existingCandidates = await prisma.conversation.findMany({
        where: {
          type: "DIRECT",
          AND: [
            { members: { some: { userId } } },
            { members: { some: { userId: targetId } } },
          ],
        },
        include: {
          members: {
            select: { userId: true },
          },
        },
      });

      const existingId = existingCandidates.find((c) => c.members.length === 2)?.id;
      if (existingId) {
        const existing = await prisma.conversation.findUnique({
          where: { id: existingId },
          include: {
            members: {
              include: {
                user: { select: { id: true, username: true, email: true, role: true } },
              },
            },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: { sender: { select: { id: true, username: true } } },
            },
          },
        });
        if (existing) return NextResponse.json(existing);
      }
    }

    if (type === "GROUP" && !name) {
      return NextResponse.json({ error: "Group name required" }, { status: 400 });
    }

    // Include current user in members
    const allMemberIds = Array.from(new Set([userId, ...memberIds]));

    const conversation = await prisma.conversation.create({
      data: {
        type: type || "DIRECT",
        name: type === "GROUP" ? name : null,
        description: description || null,
        createdById: userId,
        members: {
          create: allMemberIds.map((memberId: string) => ({
            userId: memberId,
            isAdmin: memberId === userId,
          })),
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, username: true, email: true, role: true } },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { sender: { select: { id: true, username: true } } },
        },
      },
    });

    return NextResponse.json(conversation, { status: 201 });
  } catch (error: unknown) {
    const err = error as Prisma.PrismaClientKnownRequestError | Error;
    const code = "code" in err ? err.code : undefined;
    const message = err instanceof Error ? err.message : "Internal Error";
    console.error("[CONVERSATIONS_POST] ERROR:", message, code, error);
    return NextResponse.json({ 
      error: message,
      code,
    }, { status: 500 });
  }
}
