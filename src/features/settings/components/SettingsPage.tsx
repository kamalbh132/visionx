"use client";

import { useState } from "react";
import { User, Lock, Shield, Loader2, Check, Briefcase, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: string;
  bio: string | null;
  avatarColor: string | null;
  isVerified: boolean;
  createdAt: string;
  _count: { assignedTasks: number; createdTasks: number; projectMemberships: number };
}

const AVATAR_COLORS = [
  "#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981",
  "#3b82f6","#ef4444","#14b8a6","#f97316","#84cc16",
];

const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Lock },
  { id: "account",  label: "Account",  icon: Shield },
] as const;

export function SettingsPage({ initialProfile }: { initialProfile: UserProfile }) {
  const [tab, setTab]               = useState<"profile" | "security" | "account">("profile");
  const [profile, setProfile]       = useState(initialProfile);

  // Profile form
  const [username, setUsername]     = useState(initialProfile.username);
  const [bio, setBio]               = useState((initialProfile as any).bio ?? "");
  const [avatarColor, setAvatarColor] = useState((initialProfile as any).avatarColor ?? AVATAR_COLORS[0]);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form
  const [currentPw, setCurrentPw]   = useState("");
  const [newPw, setNewPw]           = useState("");
  const [confirmPw, setConfirmPw]   = useState("");
  const [savingPw, setSavingPw]     = useState(false);

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), bio: bio.trim() || null, avatarColor }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setProfile((prev) => ({ ...prev, ...data }));
      toast.success("Profile updated");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    if (newPw !== confirmPw) { toast.error("Passwords don't match"); return; }
    if (newPw.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setSavingPw(true);
    try {
      const res = await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      toast.success("Password changed");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to change password");
    } finally {
      setSavingPw(false);
    }
  };

  const initials = profile.username.slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col h-full bg-[#f4f6fb]">
      {/* Header */}
      <div className="shrink-0 bg-white border-b border-slate-100 px-8 py-5">
        <h1 className="text-lg font-bold text-slate-900">Settings</h1>
        <p className="text-xs text-slate-400 mt-0.5">Manage your account preferences</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-8 py-8">
          {/* Profile card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 mb-6 flex items-center gap-5">
            <div
              className="h-16 w-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white shrink-0 shadow-sm"
              style={{ background: avatarColor }}
            >
              {initials}
            </div>
            <div>
              <p className="text-base font-bold text-slate-900">{profile.username}</p>
              <p className="text-sm text-slate-500">{profile.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 capitalize">
                  {profile.role.toLowerCase()}
                </span>
                {profile.isVerified && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <CheckCircle2 size={12} /> Verified
                  </span>
                )}
              </div>
            </div>
            {/* Stats */}
            <div className="ml-auto flex gap-6 text-center">
              <div>
                <p className="text-lg font-bold text-slate-900">{profile._count.projectMemberships}</p>
                <p className="text-[11px] text-slate-400">Projects</p>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">{profile._count.assignedTasks}</p>
                <p className="text-[11px] text-slate-400">Tasks</p>
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">{profile._count.createdTasks}</p>
                <p className="text-[11px] text-slate-400">Created</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-white rounded-2xl border border-slate-100 p-1 mb-6">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all
                    ${tab === t.id ? "bg-violet-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
                >
                  <Icon size={14} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Profile Tab */}
          {tab === "profile" && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
                <input
                  value={profile.email}
                  disabled
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-100 text-sm text-slate-400 bg-slate-50 cursor-not-allowed"
                />
                <p className="text-[11px] text-slate-400 mt-1">Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  maxLength={300}
                  placeholder="Tell your team a bit about yourself…"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                />
                <p className="text-[11px] text-slate-400 mt-1 text-right">{bio.length}/300</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Avatar Color</label>
                <div className="flex gap-2 flex-wrap">
                  {AVATAR_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setAvatarColor(c)}
                      className="h-8 w-8 rounded-xl transition-transform hover:scale-110"
                      style={{ background: c, outline: avatarColor === c ? `3px solid ${c}` : "none", outlineOffset: 2 }}
                    >
                      {avatarColor === c && <Check size={14} className="text-white mx-auto" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={saveProfile}
                  disabled={savingProfile}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {tab === "security" && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-4">Change Password</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Current Password</label>
                    <input
                      type="password"
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">New Password</label>
                    <input
                      type="password"
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      placeholder="Repeat new password"
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all
                        ${confirmPw && confirmPw !== newPw ? "border-red-300 focus:border-red-400" : "border-slate-200 focus:border-violet-400"}`}
                    />
                    {confirmPw && confirmPw !== newPw && (
                      <p className="text-xs text-red-500 mt-1">Passwords don't match</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  onClick={changePassword}
                  disabled={savingPw || !currentPw || !newPw || newPw !== confirmPw}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {savingPw ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                  Update Password
                </button>
              </div>
            </div>
          )}

          {/* Account Tab */}
          {tab === "account" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-100 p-6">
                <h3 className="text-sm font-bold text-slate-800 mb-4">Account Information</h3>
                <div className="space-y-3">
                  {[
                    { label: "Account ID", value: profile.id },
                    { label: "Role", value: profile.role },
                    { label: "Status", value: profile.isVerified ? "Verified" : "Pending verification" },
                    { label: "Member since", value: new Date(profile.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{row.label}</span>
                      <span className="text-sm text-slate-700 font-medium">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-red-50 rounded-2xl border border-red-100 p-6">
                <h3 className="text-sm font-bold text-red-700 mb-1">Danger Zone</h3>
                <p className="text-xs text-red-500 mb-4">These actions are irreversible. Please be certain.</p>
                <button
                  onClick={() => toast.error("Contact your administrator to delete your account")}
                  className="px-4 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-100 transition-colors"
                >
                  Request Account Deletion
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
