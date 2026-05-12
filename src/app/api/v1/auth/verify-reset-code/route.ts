import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();
    if (!email || !code) {
      return NextResponse.json({ error: "Email and code are required" }, { status: 400 });
    }

    const token = await prisma.passwordResetToken.findFirst({
      where: {
        email: email.toLowerCase(),
        code,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!token) {
      return NextResponse.json({ error: "Invalid or expired code. Please try again." }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[VERIFY_RESET_CODE]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
