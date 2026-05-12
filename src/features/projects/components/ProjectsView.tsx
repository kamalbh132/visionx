"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Briefcase, CalendarDays, CheckCircle2, Clock, Loader2, FolderOpen } from "lucide-react";
import { CreateProjectModal } from "./CreateProjectModal";

interface Project {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  dueDate?: string | null;
  _count?: { tasks: number };
}

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  ACTIVE:    { label: "Active",    color: "bg-emerald-50 text-emerald-700 border-emerald-200",  dot: "bg-emerald-500" },
  COMPLETED: { label: "Completed", color: "bg-blue-50 text-blue-700 border-blue-200",           dot: "bg-blue-500" },
  ON_HOLD:   { label: "On Hold",   color: "bg-amber-50 text-amber-700 border-amber-200",        dot: "bg-amber-500" },
};

export function ProjectsView({ role, userId }: { role: string; userId: string }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/projects");
      if (res.ok) setProjects(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-white">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Projects</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="h-16 w-16 rounded-2xl bg-violet-50 flex items-center justify-center mb-4">
              <FolderOpen className="h-8 w-8 text-violet-400" />
            </div>
            <p className="text-slate-700 font-medium">No projects yet</p>
            <p className="text-slate-400 text-sm mt-1">Create your first project to get started</p>
            <button
              onClick={() => setModalOpen(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors"
            >
              <Plus size={15} /> New Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {projects.map((p) => {
              const cfg = statusConfig[p.status] ?? statusConfig.ACTIVE;
              return (
                <Link key={p.id} href={`/projects/${p.id}`}>
                  <div className="group bg-white rounded-xl border border-slate-100 hover:border-violet-200 hover:shadow-md transition-all duration-200 p-5 cursor-pointer h-full flex flex-col">
                    {/* Icon + Status */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="h-10 w-10 rounded-lg bg-violet-50 flex items-center justify-center">
                        <Briefcase size={18} className="text-violet-500" />
                      </div>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.color}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </div>

                    {/* Name */}
                    <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2 group-hover:text-violet-700 transition-colors">
                      {p.name}
                    </h3>
                    {p.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{p.description}</p>
                    )}

                    {/* Footer */}
                    <div className="mt-auto pt-4 flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        {p._count?.tasks ?? 0} tasks
                      </span>
                      {p.dueDate && (
                        <span className="flex items-center gap-1">
                          <CalendarDays size={12} />
                          {new Date(p.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <CreateProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => { setModalOpen(false); load(); }}
      />
    </div>
  );
}
