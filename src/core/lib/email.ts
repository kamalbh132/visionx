import nodemailer from "nodemailer";

export async function sendPasswordResetEmail(email: string, code: string) {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    throw new Error("EMAIL_USER or EMAIL_PASS not set in .env");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // SSL
    auth: { user, pass },
  });

  // Verify connection before sending
  await transporter.verify();

  await transporter.sendMail({
    from: `"VisionX" <${user}>`,
    to: email,
    subject: "Your VisionX password reset code",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8f9fc;border-radius:16px;">
        <div style="text-align:center;margin-bottom:24px;">
          <div style="display:inline-block;background:#6366f1;color:white;font-weight:800;font-size:20px;padding:10px 20px;border-radius:12px;letter-spacing:-0.5px;">
            VisionX
          </div>
        </div>
        <div style="background:white;border-radius:12px;padding:32px;border:1px solid #e2e8f0;">
          <h2 style="margin:0 0 8px;font-size:20px;color:#0f172a;">Reset your password</h2>
          <p style="margin:0 0 24px;color:#64748b;font-size:14px;">
            Use the code below to reset your password. It expires in <strong>10 minutes</strong>.
          </p>
          <div style="text-align:center;margin:24px 0;">
            <div style="display:inline-block;background:#f5f3ff;border:2px dashed #8b5cf6;border-radius:12px;padding:16px 40px;">
              <span style="font-size:36px;font-weight:900;letter-spacing:12px;color:#6366f1;">${code}</span>
            </div>
          </div>
          <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;text-align:center;">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      </div>
    `,
  });
}
