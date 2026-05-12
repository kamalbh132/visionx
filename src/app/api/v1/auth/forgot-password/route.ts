import { NextRequest, NextResponse } from "next/server";
import prisma from "@/core/lib/prisma";
import { sendPasswordResetEmail } from "@/core/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    // Return a clear error if email not found — user needs to know
    if (!user) {
      return NextResponse.json({ error: "No account found with this email address" }, { status: 404 });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.passwordResetToken.updateMany({
      where: { email: email.toLowerCase(), used: false },
      data: { used: true },
    });

    await prisma.passwordResetToken.create({
      data: { email: email.toLowerCase(), code, expiresAt },
    });

    try {
      await sendPasswordResetEmail(email, code);
    } catch (emailError: any) {
      // Log the real error so you can debug in terminal
      console.error("[FORGOT_PASSWORD] Email send failed:", emailError?.message ?? emailError);
      return NextResponse.json(
        { error: `Email failed: ${emailError?.message ?? "Check EMAIL_USER and EMAIL_PASS in .env"}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[FORGOT_PASSWORD]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
