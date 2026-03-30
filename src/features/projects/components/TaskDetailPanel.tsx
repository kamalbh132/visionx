"use client";

import { useState } from "react";
import { X, AlertTriangle, CalendarDays, User, ArrowRight, ArrowLeft, Trash2, Flag, MessageSquare } from "lucide-react";

interface TaskUser { id: string; username: string }
interface Review { id: string; comment: string; reviewer: TaskUser; createdAt: string }
interface Task {
  id: string; title: string; description?: string | null;
  status: string; priority: string; deadline?: string | null;
  isCritical: boolean; assignedTo?: TaskUser | null;
  createdBy?: TaskUser | null; reviews: Review[];
  projectId: string;
}

const COLUMNS = [
  { id: "TODO",              label: "To Do",       color: "#3b82f6" },
  { id: "IN_PROGRESS",       label: "In Progress", color: "#f59e0b" },
  { id: "REVIEW_SUPERADMIN", label: "Review",      color: "#8b5cf6" },
  { id: "COMPLETED",         label: "Completed",   color: "#10b981" },
];

const PRIORITY_CFG: Record<string, { label: string; cls: string }> = {
  LOW:    { label: "Low",    cls: "bg-slate-100 text-slate-500" },
  MEDIUM: { label: "Medium", cls: "bg-amber-100 text-amber-700" },
  HIGH:   { label: "High",   cls: "bg-red-100 text-red-600" },
};

export function TaskDetailPanel({ task, myRole, myId, onClose, onMove, onDelete }: {
  task: Task; myRole: string; myId: string;
  onClose: () => void;
  onMove: (id: string, status: string, originalStatus: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isSuperAdmin = myRole === "SUPERADMIN";
  const isAssigned   = task.assignedTo?.id === myId;
  const canAct       = isSuperAdmin || isAssigned;
  const colIdx       = COLUMNS.findIndex((c) => c.id === task.status);
  const nextCol      = COLUMNS[colIdx + 1];
  const prevCol      = COLUMNS[colIdx - 1];
  const pCfg         = PRIORITY_CFG[task.priority] ?? PRIORITY_CFG.MEDIUM;
  const overdue      = task.deadline && new Date(task.deadline) < new Date() && task.status !== "COMPLETED";
  const currentCol   = COLUMNS[colIdx];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[420px] z-50 bg-white shadow-2xl flex flex-col border-l border-slate-100 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1">
              {task.isCritical && (
                <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
                  <AlertTriangle size={10} /> Critical
                </span>
              )}
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pCfg.cls}`}>
                {pCfg.label}
              </span>
              {currentCol && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                  style={{ background: currentCol.color }}>
                  {currentCol.label}
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-slate-900 leading-snug">{task.title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Description */}
          {task.description ? (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Description</p>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{task.description}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">No description provided.</p>
          )}

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Assigned To</p>
              {task.assignedTo ? (
                <div className="flex items-center gap-2">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold
                    ${isAssigned ? "bg-violet-200 text-violet-700" : "bg-indigo-100 text-indigo-600"}`}>
                    {task.assignedTo.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-slate-700">{task.assignedTo.username}</span>
                </div>
              ) : (
                <span className="text-sm text-slate-400 flex items-center gap-1"><User size={12} /> Unassigned</span>
              )}
            </div>

            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Created By</p>
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                  {task.createdBy?.username.charAt(0).toUpperCase() ?? "?"}
                </div>
                <span className="text-sm font-medium text-slate-700">{task.createdBy?.username ?? "Unknown"}</span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Deadline</p>
              {task.deadline ? (
                <span className={`text-sm font-medium flex items-center gap-1.5 ${overdue ? "text-red-600" : "text-slate-700"}`}>
                  <CalendarDays size={13} />
                  {new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  {overdue && <span className="text-xs text-red-500">(overdue)</span>}
                </span>
              ) : (
                <span className="text-sm text-slate-400">No deadline</span>
              )}
            </div>

            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Priority</p>
              <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${pCfg.cls}`}>
                {pCfg.label}
              </span>
            </div>
          </div>

          {/* Move actions */}
          {canAct && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Move Task</p>
              <div className="flex gap-2">
                {isSuperAdmin && prevCol && (
                  <button
                    onClick={() => onMove(task.id, prevCol.id, task.status)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <ArrowLeft size={13} style={{ color: prevCol.color }} />
                    {prevCol.label}
                  </button>
                )}
                {nextCol && (
                  <button
                    onClick={() => onMove(task.id, nextCol.id, task.status)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm text-white font-medium transition-colors"
                    style={{ background: nextCol.color }}
                  >
                    {nextCol.label}
                    <ArrowRight size={13} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Reviews */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <MessageSquare size={12} />
              Reviews ({task.reviews.length})
            </p>
            {task.reviews.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No reviews yet.</p>
            ) : (
              <div className="space-y-2">
                {task.reviews.map((r) => (
                  <div key={r.id} className="bg-slate-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[9px] font-bold">
                        {r.reviewer.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold text-slate-700">{r.reviewer.username}</span>
                      <span className="text-[10px] text-slate-400 ml-auto">
                        {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{r.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        {isSuperAdmin && (
          <div className="shrink-0 px-6 py-4 border-t border-slate-100">
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium transition-colors"
              >
                <Trash2 size={14} /> Delete Task
              </button>
            ) : (
              <div className="bg-red-50 rounded-xl p-3 border border-red-100">
                <p className="text-sm text-red-700 font-medium mb-2 text-center">Are you sure? This cannot be undone.</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-white transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={async () => { await onDelete(task.id); onClose(); }}
                    className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
