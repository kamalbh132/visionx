import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/lib/prisma";
import { hash } from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { email, code, newPassword } = await req.json();

    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Find valid token
    const token = await prisma.passwordResetToken.findFirst({
      where: {
        email: email.toLowerCase(),
        code,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!token) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
    }

    // Mark token as used
    await prisma.passwordResetToken.update({
      where: { id: token.id },
      data: { used: true },
    });

    // Update password
    const hashed = await hash(newPassword, 12);
    await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { password: hashed },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[RESET_PASSWORD]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
