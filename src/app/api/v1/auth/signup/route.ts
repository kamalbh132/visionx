import { hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/lib/prisma";
import { parseBody, signupSchema } from "@/core/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = parseBody(signupSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { username, email, password } = parsed.data;
    const hashedPassword = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: "USER",
        isVerified: false,
      },
      select: { id: true, username: true, email: true, role: true, isVerified: true, createdAt: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Username or email already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
