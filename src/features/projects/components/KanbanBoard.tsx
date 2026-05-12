"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, AlertTriangle, CalendarDays, User, MoreHorizontal, Loader2 } from "lucide-react";
import { CreateTaskModal } from "./CreateTaskModal";

interface TaskUser { id: string; username: string }
interface Task {
  id: string; title: string; description?: string | null;
  status: string; priority: string; deadline?: string | null;
  isCritical: boolean; assignedTo?: TaskUser | null;
  createdBy?: TaskUser | null; reviews: any[];
}
interface Project {
  id: string; name: string; description?: string | null; status: string; tasks: Task[];
}

const COLUMNS = [
  { id: "TODO",              label: "To Do",       color: "#3b82f6", lightBg: "#eff6ff", countBg: "bg-blue-100 text-blue-700",     dot: "bg-blue-500" },
  { id: "IN_PROGRESS",       label: "In Progress", color: "#f59e0b", lightBg: "#fffbeb", countBg: "bg-amber-100 text-amber-700",   dot: "bg-amber-500" },
  { id: "REVIEW_SUPERADMIN", label: "Review",      color: "#8b5cf6", lightBg: "#f5f3ff", countBg: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
  { id: "COMPLETED",         label: "Completed",   color: "#10b981", lightBg: "#ecfdf5", countBg: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
] as const;

const PRIORITY_CFG: Record<string, { label: string; cls: string }> = {
  LOW:    { label: "Low",    cls: "bg-slate-100 text-slate-500" },
  MEDIUM: { label: "Medium", cls: "bg-amber-100 text-amber-700" },
  HIGH:   { label: "High",   cls: "bg-red-100 text-red-600" },
};

function TaskCard({ task, myRole, myId, onMove, onDelete, onDragStart }: {
  task: Task; myRole: string; myId: string;
  onMove: (id: string, status: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDragStart: (task: Task) => void;
}) {
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);

  const isAssigned = task.assignedTo?.id === myId;
  const isCreator  = task.createdBy?.id === myId;
  const canAct     = myRole === "SUPERADMIN" || myRole === "ADMIN" || isAssigned || isCreator;
  const canDelete  = myRole === "SUPERADMIN" || myRole === "ADMIN" || isCreator;

  const colIdx  = COLUMNS.findIndex((c) => c.id === task.status);
  const nextCol = COLUMNS[colIdx + 1] as typeof COLUMNS[number] | undefined;
  const prevCol = COLUMNS[colIdx - 1] as typeof COLUMNS[number] | undefined;

  const move = async (status: string) => {
    setBusy(true); setMenu(false);
    await onMove(task.id, status);
    setBusy(false);
  };

  const pCfg = PRIORITY_CFG[task.priority] ?? PRIORITY_CFG.MEDIUM;
  const overdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== "COMPLETED";

  return (
    <div
      draggable={canAct}
      onDragStart={() => canAct && onDragStart(task)}
      className={`group bg-white rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all duration-150 p-4 ${canAct ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-1.5 flex-1 min-w-0">
          {task.isCritical && <AlertTriangle size={13} className="text-red-500 shrink-0 mt-0.5" />}
          <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">{task.title}</p>
        </div>
        {canAct && (
          <div className="relative shrink-0">
            <button
              onClick={() => setMenu((v) => !v)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-slate-100 text-slate-400 transition-all"
            >
              <MoreHorizontal size={14} />
            </button>
            {menu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                <div className="absolute right-0 top-7 z-20 bg-white rounded-xl border border-slate-100 shadow-2xl py-1.5 w-48 text-sm">
                  {nextCol && (
                    <button onClick={() => move(nextCol.id)} className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2">
                      <span style={{ color: nextCol.color }}>→</span> Move to {nextCol.label}
                    </button>
                  )}
                  {prevCol && myRole === "SUPERADMIN" && (
                    <button onClick={() => move(prevCol.id)} className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-500 flex items-center gap-2">
                      ← Back to {prevCol.label}
                    </button>
                  )}
                  {canDelete && (
                    <>
                      <div className="my-1 border-t border-slate-100" />
                      <button onClick={async () => { setMenu(false); await onDelete(task.id); }} className="w-full text-left px-3.5 py-2 hover:bg-red-50 text-red-500">
                        Delete task
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {task.description && <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">{task.description}</p>}

      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pCfg.cls}`}>{pCfg.label}</span>
        {task.isCritical && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">Critical</span>}
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400">
        {task.assignedTo ? (
          <span className="flex items-center gap-1.5">
            <span className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-[10px] shrink-0">
              {task.assignedTo.username.charAt(0).toUpperCase()}
            </span>
            <span className="truncate max-w-[80px]">{task.assignedTo.username}</span>
          </span>
        ) : (
          <span className="flex items-center gap-1"><User size={11} /> Unassigned</span>
        )}
        {task.deadline && (
          <span className={`flex items-center gap-1 ${overdue ? "text-red-500 font-semibold" : ""}`}>
            <CalendarDays size={11} />
            {new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
      </div>

      {busy && <div className="mt-2 flex items-center gap-1.5 text-xs text-indigo-500"><Loader2 size={11} className="animate-spin" /> Moving…</div>}
    </div>
  );
}

function KanbanColumn({ col, tasks, myRole, myId, onMove, onDelete, onAddTask, onDragStart, onDrop }: {
  col: typeof COLUMNS[number]; tasks: Task[]; myRole: string; myId: string;
  onMove: (id: string, status: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddTask: (colId: string) => void;
  onDragStart: (task: Task) => void;
  onDrop: (targetColId: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className="flex flex-col w-[272px] shrink-0"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={() => { setDragOver(false); onDrop(col.id); }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2.5 rounded-t-xl border-t-[3px] mb-3 transition-colors"
        style={{ borderTopColor: col.color, background: dragOver ? col.lightBg : `${col.color}0d` }}
      >
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${col.dot}`} />
          <span className="text-sm font-bold text-slate-700">{col.label}</span>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.countBg}`}>{tasks.length}</span>
      </div>

      {/* Cards drop zone */}
      <div
        className={`flex flex-col gap-3 flex-1 min-h-[80px] rounded-xl p-1 -m-1 transition-all duration-150 ${dragOver ? "ring-2 ring-inset" : ""}`}
        style={dragOver ? { ringColor: col.color, backgroundColor: `${col.color}08` } : {}}
      >
        {tasks.map((task) => (
          <TaskCard
            key={task.id} task={task} myRole={myRole} myId={myId}
            onMove={onMove} onDelete={onDelete} onDragStart={onDragStart}
          />
        ))}
      </div>

      {/* Add task */}
      <button
        onClick={() => onAddTask(col.id)}
        className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600 hover:bg-white transition-all text-sm w-full"
      >
        <Plus size={14} /> Add Task
      </button>
    </div>
  );
}

export function KanbanBoard({ project: initialProject, myRole, myId }: {
  project: Project; myRole: string; myId: string;
}) {
  const [tasks, setTasks] = useState<Task[]>(initialProject.tasks);
  const [modalOpen, setModalOpen] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState("TODO");
  const dragTask = useRef<Task | null>(null);

  const handleMove = useCallback(async (taskId: string, status: string) => {
    // Optimistic update
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status } : t));
    const res = await fetch(`/api/v1/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, ...updated } : t));
    }
  }, []);

  const handleDelete = useCallback(async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    await fetch(`/api/v1/tasks/${taskId}`, { method: "DELETE" });
  }, []);

  const handleDrop = useCallback(async (targetColId: string) => {
    const task = dragTask.current;
    if (!task || task.status === targetColId) return;

    const isAssigned = task.assignedTo?.id === myId;
    const isCreator  = task.createdBy?.id === myId;
    const canAct     = myRole === "SUPERADMIN" || myRole === "ADMIN" || isAssigned || isCreator;
    if (!canAct) return;

    if (myRole !== "SUPERADMIN") {
      const fromIdx = COLUMNS.findIndex((c) => c.id === task.status);
      const toIdx   = COLUMNS.findIndex((c) => c.id === targetColId);
      if (toIdx !== fromIdx + 1) return;
    }

    dragTask.current = null;
    await handleMove(task.id, targetColId);
  }, [myRole, myId, handleMove]);

  const totalTasks     = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;
  const progress       = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b bg-white shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/projects" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-700 transition-colors shrink-0">
            <ArrowLeft size={15} /> Projects
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-sm font-semibold text-slate-800 truncate">{initialProject.name}</span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-full px-3 py-1.5">
            <div className="h-1.5 w-20 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: "linear-gradient(90deg,#6366f1,#10b981)" }}
              />
            </div>
            <span className="text-xs font-semibold text-slate-600">{progress}%</span>
            <span className="text-xs text-slate-400">{completedTasks}/{totalTasks}</span>
          </div>

          <button
            onClick={() => { setDefaultStatus("TODO"); setModalOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus size={15} /> Add Task
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-auto px-8 py-6">
        <div className="flex gap-5 min-w-max pb-4">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              col={col}
              tasks={tasks.filter((t) => t.status === col.id)}
              myRole={myRole}
              myId={myId}
              onMove={handleMove}
              onDelete={handleDelete}
              onAddTask={(colId) => { setDefaultStatus(colId); setModalOpen(true); }}
              onDragStart={(task) => { dragTask.current = task; }}
              onDrop={handleDrop}
            />
          ))}
        </div>
      </div>

      <CreateTaskModal
        open={modalOpen}
        projectId={initialProject.id}
        myRole={myRole}
        defaultStatus={defaultStatus}
        onClose={() => setModalOpen(false)}
        onCreated={(task) => { setTasks((prev) => [...prev, task]); setModalOpen(false); }}
      />
    </div>
  );
}
