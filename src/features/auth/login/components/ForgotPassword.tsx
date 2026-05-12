"use client";

import { useState } from "react";
import { Mail, Lock, ArrowLeft, Loader2, CheckCircle2, KeyRound } from "lucide-react";

type Step = "email" | "code" | "newpassword" | "done";

interface Props {
  onBack: () => void;
}

export function ForgotPassword({ onBack }: Props) {
  const [step, setStep]           = useState<Step>("email");
  const [email, setEmail]         = useState("");
  const [code, setCode]           = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // ── Step 1: Send code to email ──
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep("code");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify code ──
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) { setError("Enter the 6-digit code"); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/v1/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep("newpassword");
    } catch (err: any) {
      setError(err.message ?? "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Set new password ──
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setError("Passwords don't match"); return; }
    if (newPassword.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep("done");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Back button */}
      {step !== "done" && (
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
        >
          <ArrowLeft size={15} /> Back to login
        </button>
      )}

      {/* ── Step: Email ── */}
      {step === "email" && (
        <form onSubmit={handleSendCode} className="space-y-5">
          <div className="text-center mb-6">
            <div className="h-14 w-14 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-3">
              <Mail size={24} className="text-violet-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Forgot password?</h2>
            <p className="text-sm text-slate-500 mt-1">
              Enter your email and we'll send you a 6-digit code
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Email address
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : null}
            {loading ? "Sending…" : "Send reset code"}
          </button>
        </form>
      )}

      {/* ── Step: Code ── */}
      {step === "code" && (
        <form onSubmit={handleVerifyCode} className="space-y-5">
          <div className="text-center mb-6">
            <div className="h-14 w-14 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-3">
              <KeyRound size={24} className="text-violet-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Check your email</h2>
            <p className="text-sm text-slate-500 mt-1">
              We sent a 6-digit code to <span className="font-semibold text-slate-700">{email}</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">Expires in 10 minutes</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              6-digit code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-2xl font-bold text-center tracking-[0.5em] text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <button
            type="submit"
            disabled={code.length !== 6 || loading}
            className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : null}
            {loading ? "Verifying…" : "Verify code"}
          </button>

          <button
            type="button"
            onClick={() => { setStep("email"); setCode(""); setError(null); }}
            className="w-full text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Didn't receive it? Try again
          </button>
        </form>
      )}

      {/* ── Step: New password ── */}
      {step === "newpassword" && (
        <form onSubmit={handleResetPassword} className="space-y-5">
          <div className="text-center mb-6">
            <div className="h-14 w-14 rounded-2xl bg-violet-100 flex items-center justify-center mx-auto mb-3">
              <Lock size={24} className="text-violet-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Set new password</h2>
            <p className="text-sm text-slate-500 mt-1">Must be at least 8 characters</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              New password
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
                required
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Confirm password
            </label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                required
                className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all
                  ${confirmPassword && confirmPassword !== newPassword
                    ? "border-red-300 focus:border-red-400"
                    : "border-slate-200 focus:border-violet-400"}`}
              />
            </div>
            {confirmPassword && confirmPassword !== newPassword && (
              <p className="text-xs text-red-500 mt-1">Passwords don't match</p>
            )}
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <button
            type="submit"
            disabled={loading || !newPassword || newPassword !== confirmPassword}
            className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : null}
            {loading ? "Saving…" : "Reset password"}
          </button>
        </form>
      )}

      {/* ── Step: Done ── */}
      {step === "done" && (
        <div className="text-center space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle2 size={28} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Password reset!</h2>
          <p className="text-sm text-slate-500">
            Your password has been updated. You can now log in with your new password.
          </p>
          <button
            onClick={onBack}
            className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors"
          >
            Back to login
          </button>
        </div>
      )}
    </div>
  );
}
