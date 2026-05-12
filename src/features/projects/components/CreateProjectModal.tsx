"use client";

import { useState, useEffect } from "react";
import { X, Loader2, UserPlus, UserMinus } from "lucide-react";

interface User { id: string; username: string; role: string }

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (project: any) => void;
}

export function CreateProjectModal({ open, onClose, onCreated }: CreateProjectModalProps) {
  const [name, setName]               = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate]         = useState("");
  const [memberIds, setMemberIds]     = useState<string[]>([]);
  const [allUsers, setAllUsers]       = useState<User[]>([]);
  const [userSearch, setUserSearch]   = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/v1/users")
      .then((r) => r.json())
      .then((d) => setAllUsers(Array.isArray(d) ? d : []));
  }, [open]);

  const reset = () => {
    setName(""); setDescription(""); setDueDate("");
    setMemberIds([]); setUserSearch(""); setError(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const toggleMember = (uid: string) => {
    setMemberIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/v1/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, dueDate: dueDate || null, memberIds }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      reset();
      onCreated(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const filteredUsers = allUsers.filter((u) =>
    u.username.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-base font-bold text-slate-900">New Project</h2>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Project Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Website Redesign"
              required
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
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

          {/* Member assignment */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Assign Members
                {memberIds.length > 0 && (
                  <span className="ml-2 normal-case font-normal text-violet-600">({memberIds.length} selected)</span>
                )}
              </label>
              {filteredUsers.length > 0 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMemberIds(filteredUsers.map((u) => u.id))}
                    className="text-[10px] font-semibold text-violet-600 hover:text-violet-700 transition-colors"
                  >
                    Select all
                  </button>
                  {memberIds.length > 0 && (
                    <>
                      <span className="text-slate-300 text-[10px]">·</span>
                      <button
                        type="button"
                        onClick={() => setMemberIds([])}
                        className="text-[10px] font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                      >
                        Clear
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            <input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search users…"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
            />
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {filteredUsers.map((u) => {
                const isMember = memberIds.includes(u.id);
                return (
                  <div
                    key={u.id}
                    onClick={() => toggleMember(u.id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                      isMember
                        ? "border-violet-200 bg-violet-50"
                        : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isMember ? "bg-violet-200 text-violet-700" : "bg-slate-100 text-slate-500"
                      }`}>
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-slate-800">{u.username}</span>
                      <span className="text-xs text-slate-400 capitalize">{u.role.toLowerCase()}</span>
                    </div>
                    {isMember
                      ? <UserMinus size={13} className="text-violet-500 shrink-0" />
                      : <UserPlus  size={13} className="text-slate-400 shrink-0" />
                    }
                  </div>
                );
              })}
              {filteredUsers.length === 0 && (
                <p className="text-center text-sm text-slate-400 py-3">No users found</p>
              )}
            </div>
          </div>

          {error && (
            <div className="px-3 py-2.5 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">{error}</div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={handleClose} className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
