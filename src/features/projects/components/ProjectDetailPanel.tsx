"use client";

import { useState, useEffect } from "react";
import { X, CalendarDays, Users, FileText, Settings, UserMinus, UserPlus, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Member { id: string; username: string; role: string }
interface ProjectMember { user: Member }
interface Project {
  id: string; name: string; description?: string | null;
  status: string; dueDate?: string | null;
  members: ProjectMember[];
  tasks: { status: string }[];
}

interface Props {
  project: Project;
  myRole: string;
  onClose: () => void;
  onUpdated: (updated: any) => void;
}

export function ProjectDetailPanel({ project, myRole, onClose, onUpdated }: Props) {
  const isSuperAdmin = myRole === "SUPERADMIN";
  const [tab, setTab]             = useState<"details" | "members">("details");
  const [allUsers, setAllUsers]   = useState<Member[]>([]);
  const [memberIds, setMemberIds] = useState<string[]>(project.members.map((m) => m.user.id));
  const [userSearch, setUserSearch] = useState("");
  const [saving, setSaving]       = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const done  = project.tasks.filter((t) => t.status === "COMPLETED").length;
  const total = project.tasks.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  const overdue = project.dueDate && new Date(project.dueDate) < new Date();

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  useEffect(() => {
    if (tab !== "members" || !isSuperAdmin) return;
    setLoadingUsers(true);
    fetch("/api/v1/users")
      .then((r) => r.json())
      .then((d) => { setAllUsers(Array.isArray(d) ? d : []); setLoadingUsers(false); })
      .catch(() => setLoadingUsers(false));
  }, [tab, isSuperAdmin]);

  const toggleMember = (uid: string) => {
    setMemberIds((prev) => prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]);
  };

  const saveMembers = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onUpdated(data);
      toast.success("Members updated");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = allUsers.filter((u) =>
    u.username.toLowerCase().includes(userSearch.toLowerCase())
  );

  const currentMembers = project.members.map((m) => m.user);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[380px] z-50 bg-white shadow-2xl flex flex-col border-l border-slate-100">
        {/* Header */}
        <div className="shrink-0 px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-xl bg-violet-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
              {project.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{project.name}</p>
              <p className="text-xs text-slate-400 capitalize">{project.status.toLowerCase().replace("_", " ")}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 shrink-0">
          {([
            { id: "details", label: "Details", icon: FileText },
            { id: "members", label: "Members", icon: Users },
          ] as const).map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors
                  ${tab === t.id ? "text-violet-700 border-b-2 border-violet-600" : "text-slate-500 hover:text-slate-700"}`}>
                <Icon size={13} /> {t.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {tab === "details" && (
            <div className="space-y-5">
              {/* Progress */}
              <div className="bg-slate-50 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-600">Progress</span>
                  <span className="text-xs font-bold text-slate-700">{pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-200 overflow-hidden mb-1">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: pct === 100 ? "#10b981" : "linear-gradient(90deg,#8b5cf6,#6366f1)" }} />
                </div>
                <p className="text-xs text-slate-400">{done} of {total} tasks completed</p>
              </div>

              {/* Description */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Description</p>
                {project.description
                  ? <p className="text-sm text-slate-700 leading-relaxed">{project.description}</p>
                  : <p className="text-sm text-slate-400 italic">No description provided.</p>
                }
              </div>

              {/* Due date */}
              {project.dueDate && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Due Date</p>
                  <div className={`flex items-center gap-2 text-sm font-medium ${overdue ? "text-red-600" : "text-slate-700"}`}>
                    <CalendarDays size={14} />
                    {new Date(project.dueDate).toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })}
                    {overdue && <span className="text-xs text-red-500 font-normal">(overdue)</span>}
                  </div>
                </div>
              )}

              {/* Task breakdown */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Task Breakdown</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "To Do",       status: "TODO",              color: "#3b82f6", bg: "#eff6ff" },
                    { label: "In Progress", status: "IN_PROGRESS",       color: "#f59e0b", bg: "#fffbeb" },
                    { label: "Review",      status: "REVIEW_SUPERADMIN", color: "#8b5cf6", bg: "#f5f3ff" },
                    { label: "Completed",   status: "COMPLETED",         color: "#10b981", bg: "#ecfdf5" },
                  ].map((s) => {
                    const count = project.tasks.filter((t) => t.status === s.status).length;
                    return (
                      <div key={s.status} className="rounded-xl p-3" style={{ background: s.bg }}>
                        <p className="text-lg font-bold" style={{ color: s.color }}>{count}</p>
                        <p className="text-xs text-slate-600 font-medium">{s.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Current members preview */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Members ({currentMembers.length})
                </p>
                {currentMembers.length === 0
                  ? <p className="text-sm text-slate-400 italic">No members assigned</p>
                  : (
                    <div className="space-y-2">
                      {currentMembers.map((m) => (
                        <div key={m.id} className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {m.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-800">{m.username}</p>
                            <p className="text-xs text-slate-400 capitalize">{m.role.toLowerCase()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                }
                {isSuperAdmin && (
                  <button onClick={() => setTab("members")}
                    className="mt-3 flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-700 font-medium">
                    <Settings size={11} /> Manage members
                  </button>
                )}
              </div>
            </div>
          )}

          {tab === "members" && (
            <div className="space-y-4">
              {!isSuperAdmin ? (
                <div className="space-y-2">
                  {currentMembers.map((m) => (
                    <div key={m.id} className="flex items-center gap-2.5 py-2 border-b border-slate-50 last:border-0">
                      <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                        {m.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{m.username}</p>
                        <p className="text-xs text-slate-400 capitalize">{m.role.toLowerCase()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-500">{memberIds.length} member{memberIds.length !== 1 ? "s" : ""} selected</p>
                  <div className="relative">
                    <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search users…"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400" />
                  </div>
                  <div className="space-y-1.5 max-h-72 overflow-y-auto">
                    {loadingUsers && <p className="text-xs text-slate-400 text-center py-4">Loading users…</p>}
                    {!loadingUsers && filteredUsers.map((u) => {
                      const isMember = memberIds.includes(u.id);
                      return (
                        <div key={u.id} onClick={() => toggleMember(u.id)}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-xl border cursor-pointer transition-all
                            ${isMember ? "border-violet-200 bg-violet-50" : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"}`}>
                          <div className="flex items-center gap-2.5">
                            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold
                              ${isMember ? "bg-violet-200 text-violet-700" : "bg-slate-100 text-slate-500"}`}>
                              {u.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800">{u.username}</p>
                              <p className="text-xs text-slate-400 capitalize">{u.role.toLowerCase()}</p>
                            </div>
                          </div>
                          {isMember
                            ? <UserMinus size={14} className="text-violet-500 shrink-0" />
                            : <UserPlus  size={14} className="text-slate-400 shrink-0" />
                          }
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer — save members button for SUPERADMIN */}
        {tab === "members" && isSuperAdmin && (
          <div className="shrink-0 px-5 py-4 border-t border-slate-100">
            <button onClick={saveMembers} disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {saving ? "Saving…" : "Save Members"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
