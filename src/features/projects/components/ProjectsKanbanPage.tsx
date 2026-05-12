"use client";

import { useState, useCallback, useRef, useMemo, useEffect, memo } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus, AlertTriangle, CalendarDays, User, MoreHorizontal, Loader2,
  FolderOpen, ChevronRight, Search, Settings, X,
  Clock, CheckCircle2, Circle, ArrowRight, ArrowLeft, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { CreateTaskModal } from "./CreateTaskModal";
import { CreateProjectModal } from "./CreateProjectModal";
import { EditProjectModal } from "./EditProjectModal";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { ProjectDetailPanel } from "./ProjectDetailPanel";

// Notify sidebar when a project is created
function notifySidebar(project: any) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("visionx:project-created", { detail: project }));
  }
}

interface TaskUser { id: string; username: string }
interface Review { id: string; comment: string; reviewer: TaskUser; createdAt: string }
interface Task {
  id: string; title: string; description?: string | null;
  status: string; priority: string; deadline?: string | null;
  isCritical: boolean; assignedTo?: TaskUser | null;
  createdBy?: TaskUser | null; reviews: Review[];
  projectId: string;
}
interface ProjectMember { user: { id: string; username: string; role: string } }
interface Project {
  id: string; name: string; description?: string | null;
  status: string; dueDate?: string | null;
  _count?: { tasks: number }; members: ProjectMember[]; tasks: Task[];
}

const COLUMNS = [
  { id: "TODO",              label: "To Do",       color: "#3b82f6", lightBg: "#eff6ff", countCls: "bg-blue-100 text-blue-700",       dot: "bg-blue-500",    icon: Circle },
  { id: "IN_PROGRESS",       label: "In Progress", color: "#f59e0b", lightBg: "#fffbeb", countCls: "bg-amber-100 text-amber-700",     dot: "bg-amber-500",   icon: ArrowRight },
  { id: "REVIEW_SUPERADMIN", label: "Review",      color: "#8b5cf6", lightBg: "#f5f3ff", countCls: "bg-purple-100 text-purple-700",   dot: "bg-purple-500",  icon: ArrowRight },
  { id: "COMPLETED",         label: "Completed",   color: "#10b981", lightBg: "#ecfdf5", countCls: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500", icon: CheckCircle2 },
] as const;

const PRIORITY_CFG: Record<string, { label: string; cls: string; dot: string }> = {
  LOW:    { label: "Low",    cls: "bg-slate-100 text-slate-500",  dot: "bg-slate-400" },
  MEDIUM: { label: "Medium", cls: "bg-amber-100 text-amber-700",  dot: "bg-amber-500" },
  HIGH:   { label: "High",   cls: "bg-red-100 text-red-600",      dot: "bg-red-500" },
};

// ── Delete Confirm Inline ──────────────────────────────────
function DeleteConfirm({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="px-3.5 py-2.5 bg-red-50 border-t border-red-100">
      <p className="text-xs text-red-700 font-medium mb-2">Delete this task?</p>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 text-xs py-1 rounded-md border border-slate-200 text-slate-600 hover:bg-white transition-colors">Cancel</button>
        <button onClick={onConfirm} className="flex-1 text-xs py-1 rounded-md bg-red-500 hover:bg-red-600 text-white transition-colors">Delete</button>
      </div>
    </div>
  );
}

// ── Task Card ─────────────────────────────────────────────
const TaskCard = memo(function TaskCard({ task, myRole, myId, onMove, onDelete, onDragStart, onView }: {
  task: Task; myRole: string; myId: string;
  onMove: (id: string, status: string, originalStatus: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDragStart: (task: Task) => void;
  onView: (task: Task) => void;
}) {
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isSuperAdmin = myRole === "SUPERADMIN";
  const isAssigned   = task.assignedTo?.id === myId;
  const canAct       = isSuperAdmin || isAssigned;
  const colIdx       = COLUMNS.findIndex((c) => c.id === task.status);
  const nextCol      = COLUMNS[colIdx + 1] as typeof COLUMNS[number] | undefined;
  const prevCol      = COLUMNS[colIdx - 1] as typeof COLUMNS[number] | undefined;
  const canMoveForward = canAct && !!nextCol;
  const canMoveBack    = isSuperAdmin && !!prevCol;
  const pCfg           = PRIORITY_CFG[task.priority] ?? PRIORITY_CFG.MEDIUM;
  const overdue        = task.deadline && new Date(task.deadline) < new Date() && task.status !== "COMPLETED";
  const daysLeft       = task.deadline
    ? Math.ceil((new Date(task.deadline).getTime() - Date.now()) / 86400000)
    : null;

  const move = async (status: string) => {
    setBusy(true); setMenu(false);
    await onMove(task.id, status, task.status);
    setBusy(false);
  };

  useEffect(() => {
    if (!menu) return;
    const handler = () => setMenu(false);
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menu]);

  return (
    <div
      draggable={canAct}
      onDragStart={(e) => { if (canAct) { e.stopPropagation(); onDragStart(task); } }}
      onClick={() => onView(task)}
      className={`group bg-white rounded-2xl border transition-all duration-150 overflow-hidden
        ${canAct ? "cursor-pointer" : "cursor-pointer"}
        ${task.isCritical ? "border-red-200" : "border-slate-100"}
        hover:border-violet-200 hover:shadow-lg hover:-translate-y-0.5`}
    >
      {task.isCritical && <div className="h-0.5 bg-linear-to-r from-red-500 to-orange-400" />}

      <div className="px-3 py-2.5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-1.5 mb-1.5">
          <div className="flex items-start gap-1 flex-1 min-w-0">
            {task.isCritical && <AlertTriangle size={11} className="text-red-500 shrink-0 mt-0.5" />}
            <p className="text-xs font-semibold text-slate-800 leading-snug line-clamp-2">{task.title}</p>
          </div>
          {canAct && (
            <div className="relative shrink-0" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => { setMenu((v) => !v); setConfirmDelete(false); }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-slate-100 text-slate-400 transition-all"
              >
                <MoreHorizontal size={12} />
              </button>
              {menu && (
                <div className="absolute right-0 top-6 z-30 bg-white rounded-xl border border-slate-100 shadow-2xl py-1.5 w-48 text-sm overflow-hidden">
                  {canMoveForward && (
                    <button onClick={() => move(nextCol!.id)} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 flex items-center gap-2">
                      <ArrowRight size={12} style={{ color: nextCol!.color }} />
                      Move to {nextCol!.label}
                    </button>
                  )}
                  {canMoveBack && (
                    <button onClick={() => move(prevCol!.id)} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-500 flex items-center gap-2">
                      <ArrowLeft size={12} style={{ color: prevCol!.color }} />
                      Back to {prevCol!.label}
                    </button>
                  )}
                  {isSuperAdmin && (
                    <>
                      <div className="my-1 border-t border-slate-100" />
                      <button onClick={() => setConfirmDelete(true)} className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-500 flex items-center gap-2">
                        <Trash2 size={12} /> Delete task
                      </button>
                    </>
                  )}
                  {!canMoveForward && !canMoveBack && !isSuperAdmin && (
                    <p className="px-3 py-1.5 text-slate-400 text-xs">No actions available</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {task.description && (
          <p className="text-[11px] text-slate-400 line-clamp-1 mb-2 leading-relaxed">{task.description}</p>
        )}

        <div className="flex flex-wrap gap-1 mb-2">
          <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${pCfg.cls}`}>
            <span className={`h-1 w-1 rounded-full ${pCfg.dot}`} />
            {pCfg.label}
          </span>
          {task.isCritical && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">Critical</span>
          )}
          {task.reviews.length > 0 && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-50 text-slate-500">
              {task.reviews.length} review{task.reviews.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-50">
          {task.assignedTo ? (
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <span className={`h-4 w-4 rounded-full flex items-center justify-center font-bold text-[9px] shrink-0
                ${isAssigned ? "bg-violet-200 text-violet-700" : "bg-indigo-100 text-indigo-600"}`}>
                {task.assignedTo.username.charAt(0).toUpperCase()}
              </span>
              <span className="truncate max-w-[70px]">{task.assignedTo.username}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] text-slate-400"><User size={10} /> Unassigned</span>
          )}
          {task.deadline && (
            <span className={`flex items-center gap-1 text-[11px] font-medium
              ${overdue ? "text-red-500" : daysLeft !== null && daysLeft <= 2 ? "text-amber-600" : "text-slate-400"}`}>
              <CalendarDays size={10} />
              {overdue ? `${Math.abs(daysLeft!)}d overdue`
                : daysLeft === 0 ? "Today"
                : daysLeft === 1 ? "Tomorrow"
                : new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
      </div>

      {confirmDelete && (
        <DeleteConfirm
          onConfirm={async () => { setMenu(false); setConfirmDelete(false); await onDelete(task.id); }}
          onCancel={() => { setConfirmDelete(false); setMenu(false); }}
        />
      )}
      {busy && (
        <div className="px-4 py-2 bg-indigo-50 flex items-center gap-1.5 text-xs text-indigo-600">
          <Loader2 size={11} className="animate-spin" /> Moving…
        </div>
      )}
    </div>
  );
});

// ── Kanban Column ─────────────────────────────────────────
const KanbanColumn = memo(function KanbanColumn({ col, tasks, myRole, myId, onMove, onDelete, onAddTask, onDragStart, onDrop, onView }: {
  col: typeof COLUMNS[number]; tasks: Task[]; myRole: string; myId: string;
  onMove: (id: string, status: string, originalStatus: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddTask: (colId: string) => void;
  onDragStart: (task: Task) => void;
  onDrop: (colId: string) => void;
  onView: (task: Task) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const ColIcon = col.icon;
  const isTodo = col.id === "TODO";

  return (
    <div
      style={{ display: "flex", flexDirection: "column", width: 280, flexShrink: 0, height: "100%" }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false); }}
      onDrop={() => { setDragOver(false); onDrop(col.id); }}
    >
      {/* Column header */}
      <div
        style={{
          flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px", borderRadius: 16, marginBottom: 10,
          background: dragOver ? col.lightBg : `${col.color}08`,
          borderStyle: "solid", borderWidth: 1,
          borderColor: dragOver ? col.color : `${col.color}20`,
          borderTopWidth: 3, borderTopColor: col.color,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ColIcon size={14} style={{ color: col.color }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#334155" }}>{col.label}</span>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.countCls}`}>{tasks.length}</span>
      </div>

      {/* Scrollable cards — fixed card size, scrolls when overflow */}
      <div
        style={{
          flex: "1 1 0", minHeight: 0, overflowY: "auto", overflowX: "hidden",
          display: "flex", flexDirection: "column", gap: 8,
          padding: 4,
          borderRadius: 16,
          background: dragOver ? "rgba(248,250,252,0.8)" : "transparent",
          boxShadow: dragOver ? "inset 0 0 0 2px #cbd5e1" : "none",
        }}
      >
        {tasks.length === 0 && !dragOver && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 0", border: "2px dashed #f1f5f9", borderRadius: 16 }}>
            <ColIcon size={18} style={{ color: "#e2e8f0", marginBottom: 6 }} />
            <p style={{ fontSize: 11, color: "#cbd5e1", fontWeight: 500 }}>No tasks here</p>
          </div>
        )}
        {tasks.map((task) => (
          <TaskCard
            key={task.id} task={task} myRole={myRole} myId={myId}
            onMove={onMove} onDelete={onDelete} onDragStart={onDragStart} onView={onView}
          />
        ))}
        {dragOver && (
          <div style={{ height: 48, borderRadius: 12, border: "2px dashed #cbd5e1", background: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <p style={{ fontSize: 11, color: "#94a3b8" }}>Drop here</p>
          </div>
        )}
      </div>

      {/* Add Task — only on To Do column */}
      {isTodo && (
        <button
          onClick={() => onAddTask(col.id)}
          style={{ marginTop: 8, flexShrink: 0, display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 12, border: "1.5px dashed #e2e8f0", background: "transparent", cursor: "pointer", fontSize: 12, color: "#94a3b8", width: "100%" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#a78bfa"; (e.currentTarget as HTMLButtonElement).style.color = "#7c3aed"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(245,243,255,0.5)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e2e8f0"; (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
        >
          <Plus size={13} /> Add Task
        </button>
      )}
    </div>
  );
});

// ── Main Page ─────────────────────────────────────────────
export function ProjectsKanbanPage({
  projects: initialProjects, myRole, myId, initialProjectId,
}: {
  projects: Project[]; myRole: string; myId: string; initialProjectId?: string;
}) {
  const isSuperAdmin = myRole === "SUPERADMIN";
  const searchParams = useSearchParams();

  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [activeId, setActiveId] = useState<string | null>(
    initialProjectId ?? initialProjects[0]?.id ?? null
  );

  // React to URL ?project= changes (sidebar clicks do client-side nav)
  useEffect(() => {
    const urlProjectId = searchParams.get("project");
    if (urlProjectId) {
      // If the project exists in our list, switch to it
      const exists = projects.find((p) => p.id === urlProjectId);
      if (exists) {
        setActiveId(urlProjectId);
      }
    }
  }, [searchParams, projects]);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [projModalOpen, setProjModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState("TODO");
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [boardSearch, setBoardSearch]     = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [detailTask, setDetailTask]       = useState<Task | null>(null);
  const [showMembers, setShowMembers]     = useState(false);
  const [showProjectDetail, setShowProjectDetail] = useState(false);
  const dragTask = useRef<{ task: Task; originalStatus: string } | null>(null);

  const activeProject = useMemo(() => projects.find((p) => p.id === activeId) ?? null, [projects, activeId]);

  const filteredTasks = useMemo(() => {
    let tasks = activeProject?.tasks ?? [];
    if (boardSearch) tasks = tasks.filter((t) => t.title.toLowerCase().includes(boardSearch.toLowerCase()));
    if (filterPriority !== "ALL") tasks = tasks.filter((t) => t.priority === filterPriority);
    return tasks;
  }, [activeProject, boardSearch, filterPriority]);

  const completedTasks = useMemo(() => filteredTasks.filter((t) => t.status === "COMPLETED").length, [filteredTasks]);
  const totalTasks     = filteredTasks.length;
  const progress       = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const filteredProjects = useMemo(() =>
    projects.filter((p) => p.name.toLowerCase().includes(sidebarSearch.toLowerCase())),
    [projects, sidebarSearch]
  );

  // Escape key closes modals
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (detailTask) { setDetailTask(null); return; }
      if (editModalOpen) { setEditModalOpen(false); return; }
      if (taskModalOpen) { setTaskModalOpen(false); return; }
      if (projModalOpen) { setProjModalOpen(false); return; }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [detailTask, editModalOpen, taskModalOpen, projModalOpen]);

  // ── handleMove — captures original status before optimistic update ──
  const handleMove = useCallback(async (taskId: string, newStatus: string, originalStatus: string) => {
    setProjects((prev) => prev.map((p) => ({
      ...p, tasks: p.tasks.map((t) => t.id === taskId ? { ...t, status: newStatus } : t),
    })));
    try {
      const res = await fetch(`/api/v1/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const d = await res.json();
        // Revert to original status
        setProjects((prev) => prev.map((p) => ({
          ...p, tasks: p.tasks.map((t) => t.id === taskId ? { ...t, status: originalStatus } : t),
        })));
        toast.error(d.error ?? "Failed to move task");
      } else {
        const updated = await res.json();
        setProjects((prev) => prev.map((p) => ({
          ...p, tasks: p.tasks.map((t) => t.id === taskId ? { ...t, ...updated } : t),
        })));
        // Update detail panel if open
        if (detailTask?.id === taskId) setDetailTask((prev) => prev ? { ...prev, ...updated } : null);
      }
    } catch {
      setProjects((prev) => prev.map((p) => ({
        ...p, tasks: p.tasks.map((t) => t.id === taskId ? { ...t, status: originalStatus } : t),
      })));
      toast.error("Network error — task reverted");
    }
  }, [detailTask]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    const res = await fetch(`/api/v1/tasks/${taskId}`, { method: "DELETE" });
    if (res.ok) {
      setProjects((prev) => prev.map((p) => ({ ...p, tasks: p.tasks.filter((t) => t.id !== taskId) })));
      if (detailTask?.id === taskId) setDetailTask(null);
      toast.success("Task deleted");
    } else {
      toast.error("Failed to delete task");
    }
  }, [detailTask]);

  const handleDrop = useCallback((colId: string) => {
    const ref = dragTask.current;
    if (!ref || ref.task.status === colId) return;
    const { task, originalStatus } = ref;
    const isAssigned = task.assignedTo?.id === myId;
    if (!isSuperAdmin && !isAssigned) return;
    if (!isSuperAdmin) {
      const fwd: Record<string, string> = { TODO: "IN_PROGRESS", IN_PROGRESS: "REVIEW_SUPERADMIN", REVIEW_SUPERADMIN: "COMPLETED" };
      if (fwd[task.status] !== colId) { toast.error("You can only move tasks forward one step"); return; }
    }
    handleMove(task.id, colId, originalStatus);
    dragTask.current = null;
  }, [isSuperAdmin, myId, handleMove]);

  const handleTaskCreated = useCallback((task: any) => {
    setProjects((prev) => prev.map((p) =>
      p.id === task.projectId
        ? { ...p, tasks: [...p.tasks, task], _count: { tasks: (p._count?.tasks ?? 0) + 1 } }
        : p
    ));
    setTaskModalOpen(false);
    toast.success("Task created");
  }, []);

  const handleProjectCreated = useCallback((project: any) => {
    setProjects((prev) => [project, ...prev]);
    setActiveId(project.id);
    setProjModalOpen(false);
    notifySidebar(project);
    toast.success("Project created");
  }, []);

  const handleProjectUpdated = useCallback((updated: any) => {
    setProjects((prev) => prev.map((p) => p.id === updated.id ? updated : p));
    setEditModalOpen(false);
    toast.success("Project updated");
  }, []);

  const handleProjectDeleted = useCallback((id: string) => {
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== id);
      setActiveId(next[0]?.id ?? null);
      return next;
    });
    setEditModalOpen(false);
    toast.success("Project deleted");
  }, []);

  const isProjectOverdue = (p: Project) => p.dueDate && new Date(p.dueDate) < new Date() && p.status !== "COMPLETED";

  return (
    <div className="flex h-full overflow-hidden" style={{ background: "#f4f6fb" }}>

      {/* ── Board only — no left sidebar, projects are in the main sidebar ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* ── Top bar: search + project name + actions ── */}
        <div className="shrink-0 px-6 py-3.5 border-b border-slate-100 bg-white flex items-center justify-between gap-4">
          {/* Left: search + add */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                placeholder="Search projects…"
                className="pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 w-36"
              />
              {sidebarSearch && (
                <button onClick={() => setSidebarSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={10} />
                </button>
              )}
            </div>
            {isSuperAdmin && (
              <button
                onClick={() => setProjModalOpen(true)}
                className="h-7 w-7 rounded-lg bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center transition-colors shadow-sm"
                title="New Project"
              >
                <Plus size={14} />
              </button>
            )}
          </div>

          {/* Center: active project name */}
          {activeProject ? (
            <div className="flex-1 flex items-center gap-2 min-w-0 justify-center">
              <button
                onClick={() => setShowProjectDetail(true)}
                className="text-base font-bold text-slate-900 truncate hover:text-violet-700 transition-colors text-left"
              >
                {activeProject.name}
              </button>
              {isProjectOverdue(activeProject) && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100 shrink-0">
                  Overdue
                </span>
              )}
              {activeProject.dueDate && !isProjectOverdue(activeProject) && (
                <span className="text-xs text-slate-400 shrink-0 flex items-center gap-1">
                  <CalendarDays size={11} />
                  Due {new Date(activeProject.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
              {activeProject.description && (
                <span className="text-xs text-slate-400 truncate hidden sm:block">— {activeProject.description}</span>
              )}
            </div>
          ) : (
            <div className="flex-1" />
          )}

          {/* Right: board controls */}
          {activeProject && (
            <div className="flex items-center gap-3 shrink-0">
              {/* Progress */}
              <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-100">
                <div className="w-20 h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${progress}%`, background: progress === 100 ? "#10b981" : "linear-gradient(90deg,#8b5cf6,#6366f1)" }} />
                </div>
                <span className="text-xs font-bold text-slate-600 tabular-nums">{progress}%</span>
                <span className="text-xs text-slate-400">{completedTasks}/{totalTasks}</span>
              </div>

              {/* Member avatars */}
              <div className="relative">
                <button onClick={() => setShowMembers((v) => !v)}
                  className="flex -space-x-1.5 hover:opacity-80 transition-opacity" title="View members">
                  {activeProject.members.slice(0, 5).map((m) => (
                    <div key={m.user.id}
                      className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-600 border-2 border-white flex items-center justify-center text-[10px] font-bold">
                      {m.user.username.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {activeProject.members.length > 5 && (
                    <div className="h-7 w-7 rounded-full bg-slate-100 text-slate-500 border-2 border-white flex items-center justify-center text-[9px] font-bold">
                      +{activeProject.members.length - 5}
                    </div>
                  )}
                </button>
                {showMembers && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setShowMembers(false)} />
                    <div className="absolute right-0 top-9 z-30 bg-white rounded-2xl border border-slate-100 shadow-2xl w-56 py-2 overflow-hidden">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-3.5 pb-2 pt-1">
                        Members ({activeProject.members.length})
                      </p>
                      <div className="max-h-64 overflow-y-auto">
                        {activeProject.members.length === 0
                          ? <p className="text-xs text-slate-400 px-3.5 py-2">No members assigned</p>
                          : activeProject.members.map((m) => (
                            <div key={m.user.id} className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50">
                              <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                                {m.user.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-800">{m.user.username}</p>
                                <p className="text-xs text-slate-400 capitalize">{m.user.role.toLowerCase()}</p>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Filter */}
              <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30">
                <option value="ALL">All priorities</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              {/* Task search */}
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={boardSearch} onChange={(e) => setBoardSearch(e.target.value)}
                  placeholder="Filter tasks…"
                  className="pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 w-28" />
                {boardSearch && (
                  <button onClick={() => setBoardSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X size={11} />
                  </button>
                )}
              </div>

              <button onClick={() => { setDefaultStatus("TODO"); setTaskModalOpen(true); }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors shadow-sm">
                <Plus size={13} /> Add Task
              </button>
            </div>
          )}
        </div>

        {activeProject ? (
          <>
            {/* Kanban Columns */}
            <div style={{ flex: "1 1 0", minHeight: 0, overflow: "hidden", padding: "20px" }}>
              <div style={{ display: "flex", gap: 16, height: "100%", overflowX: "auto", overflowY: "hidden" }}>
                {COLUMNS.map((col) => (
                  <KanbanColumn
                    key={col.id}
                    col={col}
                    tasks={filteredTasks.filter((t) => t.status === col.id)}
                    myRole={myRole}
                    myId={myId}
                    onMove={handleMove}
                    onDelete={handleDeleteTask}
                    onAddTask={(colId) => { setDefaultStatus(colId); setTaskModalOpen(true); }}
                    onDragStart={(task) => { dragTask.current = { task, originalStatus: task.status }; }}
                    onDrop={handleDrop}
                    onView={setDetailTask}
                  />
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="h-16 w-16 rounded-2xl bg-violet-50 flex items-center justify-center mb-4">
              <FolderOpen size={28} className="text-violet-300" />
            </div>
            <p className="text-slate-600 font-semibold">No project selected</p>
            <p className="text-sm text-slate-400 mt-1">
              {isSuperAdmin ? "Create a project to get started." : "You haven't been assigned to any projects yet."}
            </p>
            {isSuperAdmin && (
              <button
                onClick={() => setProjModalOpen(true)}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors shadow-sm"
              >
                <Plus size={14} /> New Project
              </button>
            )}
          </div>
        )}
      </main>

      {/* ── Modals ── */}
      {taskModalOpen && activeProject && (
        <CreateTaskModal
          open={taskModalOpen}
          projectId={activeProject.id}
          myRole={myRole}
          defaultStatus={defaultStatus}
          onClose={() => setTaskModalOpen(false)}
          onCreated={handleTaskCreated}
        />
      )}
      {isSuperAdmin && projModalOpen && (
        <CreateProjectModal
          open={projModalOpen}
          onClose={() => setProjModalOpen(false)}
          onCreated={handleProjectCreated}
        />
      )}
      {isSuperAdmin && editModalOpen && activeProject && (
        <EditProjectModal
          open={editModalOpen}
          project={activeProject}
          onClose={() => setEditModalOpen(false)}
          onUpdated={handleProjectUpdated}
          onDeleted={handleProjectDeleted}
        />
      )}
      {detailTask && (
        <TaskDetailPanel
          task={detailTask}
          myRole={myRole}
          myId={myId}
          onClose={() => setDetailTask(null)}
          onMove={handleMove}
          onDelete={handleDeleteTask}
        />
      )}
      {showProjectDetail && activeProject && (
        <ProjectDetailPanel
          project={activeProject}
          myRole={myRole}
          onClose={() => setShowProjectDetail(false)}
          onUpdated={handleProjectUpdated}
        />
      )}
    </div>
  );
}
