"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Trash2, UserMinus, UserPlus } from "lucide-react";

interface Member { id: string; username: string; role: string }
interface Project {
  id: string; name: string; description?: string | null; dueDate?: string | null;
  members: { user: Member }[];
}

interface EditProjectModalProps {
  open: boolean;
  project: Project;
  onClose: () => void;
  onUpdated: (updated: any) => void;
  onDeleted: (id: string) => void;
}

export function EditProjectModal({ open, project, onClose, onUpdated, onDeleted }: EditProjectModalProps) {
  const [name, setName]               = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [dueDate, setDueDate]         = useState(
    project.dueDate ? new Date(project.dueDate).toISOString().split("T")[0] : ""
  );
  const [memberIds, setMemberIds]     = useState<string[]>(project.members.map((m) => m.user.id));
  const [allUsers, setAllUsers]       = useState<Member[]>([]);
  const [tab, setTab]                 = useState<"details" | "members">("details");
  const [saving, setSaving]           = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [userSearch, setUserSearch]   = useState("");

  useEffect(() => {
    if (!open) return;
    setName(project.name);
    setDescription(project.description ?? "");
    setDueDate(project.dueDate ? new Date(project.dueDate).toISOString().split("T")[0] : "");
    setMemberIds(project.members.map((m) => m.user.id));
    fetch("/api/v1/users")
      .then((r) => r.json())
      .then((d) => setAllUsers(Array.isArray(d) ? d : []));
  }, [open, project]);

  if (!open) return null;

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/v1/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, dueDate: dueDate || null, memberIds }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      onUpdated(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/projects/${project.id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      onDeleted(project.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
      setDeleting(false);
    }
  };

  const toggleMember = (uid: string) => {
    setMemberIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const filteredUsers = allUsers.filter((u) =>
    u.username.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-base font-bold text-slate-900">Edit Project</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 shrink-0">
          {(["details", "members"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? "text-violet-700 border-b-2 border-violet-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === "details" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                />
              </div>
            </div>
          )}

          {tab === "members" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                {memberIds.length} member{memberIds.length !== 1 ? "s" : ""} assigned
              </p>
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users…"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
              />
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {filteredUsers.map((u) => {
                  const isMember = memberIds.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all cursor-pointer ${
                        isMember
                          ? "border-violet-200 bg-violet-50"
                          : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                      }`}
                      onClick={() => toggleMember(u.id)}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          isMember ? "bg-violet-200 text-violet-700" : "bg-slate-100 text-slate-500"
                        }`}>
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
                {filteredUsers.length === 0 && (
                  <p className="text-center text-sm text-slate-400 py-4">No users found</p>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 px-3 py-2.5 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 shrink-0 gap-3">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Delete
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
