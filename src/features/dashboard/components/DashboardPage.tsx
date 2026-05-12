"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Users, Briefcase, CheckCircle2, Clock, AlertTriangle,
  ArrowRight, TrendingUp, UserCheck, Layers, CalendarDays,
  Bell, Plus, ShieldCheck,
} from "lucide-react";

interface Notification { id: string; title: string; message: string | null; isRead: boolean; createdAt: string | Date }
interface TaskUser { id: string; username: string }
interface Task {
  id: string; title: string; status: string; priority: string;
  deadline?: string | Date | null;
  project?: { id: string; name: string } | null;
  assignedTo?: TaskUser | null;
  createdBy?: TaskUser | null;
}
interface Project {
  id: string; name: string; status: string; dueDate?: string | Date | null;
  _count: { tasks: number };
  tasks: { status: string }[];
}
interface UserRow { id: string; username: string; email: string; role: string; isVerified: boolean; createdAt: string | Date }

type SuperAdminData = {
  totalUsers: number; pendingUsers: number; totalProjects: number; totalTasks: number;
  recentUsers: UserRow[]; tasksByStatus: { status: string; _count: { id: number } }[];
  recentNotifications: Notification[]; unreadCount: number; completedThisWeek: number;
};
type AdminData = {
  totalUsers: number; pendingUsers: number; overdueCount: number;
  myTasks: Task[]; myProjects: Project[]; recentUsers: UserRow[];
  recentNotifications: Notification[]; unreadCount: number;
};
type UserData = {
  myTasks: Task[]; myProjects: Project[];
  recentNotifications: Notification[]; unreadCount: number; dueToday: number;
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  TODO:              { label: "To Do",       color: "#3b82f6", bg: "#eff6ff" },
  IN_PROGRESS:       { label: "In Progress", color: "#f59e0b", bg: "#fffbeb" },
  REVIEW_SUPERADMIN: { label: "Review",      color: "#8b5cf6", bg: "#f5f3ff" },
  COMPLETED:         { label: "Done",        color: "#10b981", bg: "#ecfdf5" },
};

const PRIORITY_COLOR: Record<string, string> = {
  HIGH: "#ef4444", MEDIUM: "#f59e0b", LOW: "#94a3b8",
};

// ── Stat Card ─────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon: Icon, accent }: {
  label: string; value: string | number; sub?: string;
  color: string; icon: React.ComponentType<{ size?: number }>; accent?: boolean;
}) {
  return (
    <div className={`bg-white rounded-2xl p-5 flex items-start justify-between shadow-sm hover:shadow-md transition-all
      border-l-4 border border-slate-100`}
      style={{ borderLeftColor: color }}
    >
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
      <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
        <Icon size={20} style={{ color }} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status, color: "#64748b", bg: "#f1f5f9" };
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: cfg.color, background: cfg.bg }}>
      {cfg.label}
    </span>
  );
}

function SectionHeader({ title, href, badge }: { title: string; href?: string; badge?: number }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="h-4 w-1 rounded-full bg-violet-500" />
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        {badge !== undefined && badge > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white">{badge}</span>
        )}
      </div>
      {href && (
        <Link href={href} className="text-xs text-violet-600 hover:text-violet-700 flex items-center gap-1 font-medium">
          View all <ArrowRight size={11} />
        </Link>
      )}
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  const overdue = task.deadline && new Date(task.deadline as string) < new Date() && task.status !== "COMPLETED";
  const daysLeft = task.deadline
    ? Math.ceil((new Date(task.deadline as string).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="flex items-center justify-between py-2.5 px-2 -mx-2 rounded-xl hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 cursor-default">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-2 w-2 rounded-full shrink-0" style={{
          background: STATUS_CFG[task.status]?.color ?? "#94a3b8"
        }} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-700 truncate">{task.title}</p>
          {task.project && <p className="text-[11px] text-slate-400 truncate">{task.project.name}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-3">
        {task.priority && (
          <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: PRIORITY_COLOR[task.priority] ?? "#94a3b8" }} title={task.priority} />
        )}
        {task.deadline && (
          <span className={`text-[10px] font-medium flex items-center gap-0.5 ${overdue ? "text-red-500" : daysLeft === 0 ? "text-amber-600" : "text-slate-400"}`}>
            {overdue && <AlertTriangle size={10} />}
            {overdue ? `${Math.abs(daysLeft!)}d late`
              : daysLeft === 0 ? "Today"
              : daysLeft === 1 ? "Tomorrow"
              : new Date(task.deadline as string).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
        <StatusBadge status={task.status} />
      </div>
    </div>
  );
}

function ProjectBar({ project }: { project: Project }) {
  const done  = project.tasks.filter((t) => t.status === "COMPLETED").length;
  const total = project.tasks.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  const overdue = project.dueDate && new Date(project.dueDate as string) < new Date();

  return (
    <Link href="/projects" className="block group">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-5 w-5 rounded-md flex items-center justify-center text-[9px] font-bold text-white shrink-0"
            style={{ background: pct === 100 ? "#10b981" : "#8b5cf6" }}>
            {project.name.charAt(0).toUpperCase()}
          </div>
          <p className="text-xs font-semibold text-slate-700 truncate group-hover:text-violet-700 transition-colors">{project.name}</p>
          {overdue && <AlertTriangle size={10} className="text-red-400 shrink-0" />}
        </div>
        <span className="text-[10px] text-slate-400 shrink-0 ml-2 tabular-nums">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: pct === 100 ? "#10b981" : "linear-gradient(90deg,#8b5cf6,#6366f1)" }} />
      </div>
      <p className="text-[10px] text-slate-400 mt-1">{done}/{total} tasks</p>
    </Link>
  );
}


function NotifItem({ n }: { n: Notification }) {
  return (
    <div className="flex items-start gap-2.5 py-2.5 border-b border-slate-50 last:border-0">
      <div className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${n.isRead ? "bg-slate-200" : "bg-violet-500"}`} />
      <div className="min-w-0 flex-1">
        <p className={`text-xs font-semibold truncate ${n.isRead ? "text-slate-500" : "text-slate-800"}`}>{n.title}</p>
        {n.message && <p className="text-[11px] text-slate-400 truncate mt-0.5">{n.message}</p>}
        <p className="text-[10px] text-slate-400 mt-0.5">{formatDistanceToNow(new Date(n.createdAt as string), { addSuffix: true })}</p>
      </div>
    </div>
  );
}

// ── Dashboard Header ──────────────────────────────────────
function DashHeader({ username, role, actions }: {
  username: string; role: string;
  actions?: React.ReactNode;
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="shrink-0 bg-white border-b border-slate-100 px-8 py-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{greeting}, {username} 👋</h1>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
            <CalendarDays size={11} />
            {today}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {actions}
        </div>
      </div>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────
export function DashboardPage({ role, username, data }: {
  role: "SUPERADMIN" | "ADMIN" | "USER";
  username: string;
  data: SuperAdminData | AdminData | UserData;
}) {
  return (
    <div className="flex flex-col h-full bg-[#f4f6fb] overflow-y-auto">

      {/* ── SUPERADMIN ── */}
      {role === "SUPERADMIN" && (() => {
        const d = data as SuperAdminData;
        return (
          <>
            <DashHeader username={username} role={role} actions={
              <>
                <Link href="/superadmin/users"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors shadow-sm">
                  <UserCheck size={13} />
                  Verify Users
                  {d.pendingUsers > 0 && (
                    <span className="bg-white text-amber-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{d.pendingUsers}</span>
                  )}
                </Link>
                <Link href="/projects"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors shadow-sm">
                  <Plus size={13} /> New Project
                </Link>
              </>
            } />
            <div className="flex-1 px-8 py-6 space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Users"      value={d.totalUsers}         sub="All roles"           color="#6366f1" icon={Users} />
                <StatCard label="Pending Verify"   value={d.pendingUsers}       sub="Awaiting approval"   color="#f59e0b" icon={UserCheck} />
                <StatCard label="Total Projects"   value={d.totalProjects}      sub="All projects"        color="#10b981" icon={Briefcase} />
                <StatCard label="Completed / Week" value={d.completedThisWeek}  sub="Tasks done this week" color="#8b5cf6" icon={TrendingUp} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Task status breakdown */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5">
                  <SectionHeader title="Task Status Breakdown" />
                  <div className="grid grid-cols-2 gap-3">
                    {d.tasksByStatus.map((s) => {
                      const cfg = STATUS_CFG[s.status] ?? { label: s.status, color: "#64748b", bg: "#f1f5f9" };
                      return (
                        <div key={s.status} className="rounded-xl p-4" style={{ background: cfg.bg }}>
                          <p className="text-2xl font-bold" style={{ color: cfg.color }}>{s._count.id}</p>
                          <p className="text-xs font-semibold text-slate-600 mt-0.5">{cfg.label}</p>
                          <div className="mt-2 h-1 rounded-full bg-white/60 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, (s._count.id / (d.totalTasks || 1)) * 100)}%`, background: cfg.color }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Notifications */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5">
                  <SectionHeader title="Notifications" href="/notifications" badge={d.unreadCount} />
                  {d.recentNotifications.length === 0
                    ? <p className="text-xs text-slate-400 text-center py-6">All caught up!</p>
                    : d.recentNotifications.map((n) => <NotifItem key={n.id} n={n} />)
                  }
                </div>
              </div>

              {/* Recent signups */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5">
                <SectionHeader title="Recent Signups" href="/superadmin/users" />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {["User", "Email", "Role", "Status", "Joined"].map((h) => (
                          <th key={h} className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide pb-2.5 pr-4">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {d.recentUsers.map((u) => (
                        <tr key={u.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                          <td className="py-2.5 pr-4">
                            <div className="flex items-center gap-2.5">
                              <div className="h-7 w-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                                {u.username.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-semibold text-slate-800">{u.username}</span>
                            </div>
                          </td>
                          <td className="py-2.5 pr-4 text-slate-500 text-xs">{u.email}</td>
                          <td className="py-2.5 pr-4">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">{u.role.toLowerCase()}</span>
                          </td>
                          <td className="py-2.5 pr-4">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${u.isVerified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                              {u.isVerified ? "Verified" : "Pending"}
                            </span>
                          </td>
                          <td className="py-2.5 text-[11px] text-slate-400">{formatDistanceToNow(new Date(u.createdAt as string), { addSuffix: true })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* ── ADMIN ── */}
      {role === "ADMIN" && (() => {
        const d = data as AdminData;
        return (
          <>
            <DashHeader username={username} role={role} actions={
              <Link href="/projects"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors shadow-sm">
                <Plus size={13} /> Create Task
              </Link>
            } />
            <div className="flex-1 px-8 py-6 space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Users"    value={d.totalUsers}   sub="Registered"       color="#6366f1" icon={Users} />
                <StatCard label="Pending Verify" value={d.pendingUsers} sub="Need approval"     color="#f59e0b" icon={Clock} />
                <StatCard label="My Projects"    value={d.myProjects.length} sub="Assigned to you" color="#10b981" icon={Briefcase} />
                <StatCard label="Overdue Tasks"  value={d.overdueCount} sub="Past deadline"     color="#ef4444" icon={AlertTriangle} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Projects */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5">
                  <SectionHeader title="My Projects" href="/projects" />
                  {d.myProjects.length === 0
                    ? <p className="text-xs text-slate-400 text-center py-8">No projects assigned yet</p>
                    : <div className="space-y-4">{d.myProjects.map((p) => <ProjectBar key={p.id} project={p} />)}</div>
                  }
                </div>

                {/* Pending verifications */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5">
                  <SectionHeader title="Pending Verifications" href="/admin/users" badge={d.pendingUsers} />
                  {d.recentUsers.length === 0
                    ? <div className="flex flex-col items-center justify-center py-8 text-center">
                        <CheckCircle2 size={24} className="text-emerald-300 mb-2" />
                        <p className="text-xs text-slate-400">All users verified</p>
                      </div>
                    : d.recentUsers.map((u) => (
                        <div key={u.id} className="flex items-center justify-between py-2.5 px-2 -mx-2 rounded-xl hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
                              {u.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{u.username}</p>
                              <p className="text-[11px] text-slate-400">{formatDistanceToNow(new Date(u.createdAt as string), { addSuffix: true })}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Pending</span>
                        </div>
                      ))
                  }
                </div>
              </div>

              {/* Tasks + Notifications */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5">
                  <SectionHeader title="Recently Created Tasks" href="/projects" />
                  {d.myTasks.length === 0
                    ? <p className="text-xs text-slate-400 text-center py-6">No tasks created yet</p>
                    : d.myTasks.map((t) => <TaskRow key={t.id} task={t} />)
                  }
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-5">
                  <SectionHeader title="Notifications" href="/notifications" badge={d.unreadCount} />
                  {d.recentNotifications.length === 0
                    ? <p className="text-xs text-slate-400 text-center py-6">All caught up!</p>
                    : d.recentNotifications.map((n) => <NotifItem key={n.id} n={n} />)
                  }
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* ── USER ── */}
      {role === "USER" && (() => {
        const d = data as UserData;
        const overdueTasks = d.myTasks.filter((t) => t.deadline && new Date(t.deadline as string) < new Date() && t.status !== "COMPLETED");
        const completedCount = d.myTasks.filter((t) => t.status === "COMPLETED").length;
        const inProgressCount = d.myTasks.filter((t) => t.status === "IN_PROGRESS").length;

        return (
          <>
            <DashHeader username={username} role={role} actions={
              <Link href="/projects"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors shadow-sm">
                <Briefcase size={13} /> View My Tasks
              </Link>
            } />
            <div className="flex-1 px-8 py-6 space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="My Tasks"    value={d.myTasks.length}  sub="Assigned to you"  color="#6366f1" icon={Layers} />
                <StatCard label="In Progress" value={inProgressCount}   sub="Active now"       color="#f59e0b" icon={TrendingUp} />
                <StatCard label="Completed"   value={completedCount}    sub="Done"             color="#10b981" icon={CheckCircle2} />
                <StatCard label="Due Today"   value={d.dueToday}        sub="Need attention"   color={d.dueToday > 0 ? "#ef4444" : "#94a3b8"} icon={CalendarDays} />
              </div>

              {/* Due today banner */}
              {d.dueToday > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-amber-100 flex items-center justify-center">
                      <CalendarDays size={15} className="text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-800">
                        {d.dueToday} task{d.dueToday !== 1 ? "s" : ""} due today
                      </p>
                      <p className="text-xs text-amber-600">Don't let them slip!</p>
                    </div>
                  </div>
                  <Link href="/projects" className="text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1">
                    View <ArrowRight size={11} />
                  </Link>
                </div>
              )}

              {/* Overdue banner */}
              {overdueTasks.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-red-100 flex items-center justify-center">
                      <AlertTriangle size={15} className="text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-red-800">
                        {overdueTasks.length} overdue task{overdueTasks.length !== 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-red-500">These are past their deadline</p>
                    </div>
                  </div>
                  <Link href="/projects" className="text-xs font-semibold text-red-700 hover:text-red-900 flex items-center gap-1">
                    View <ArrowRight size={11} />
                  </Link>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Tasks */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5">
                  <SectionHeader title="My Tasks" href="/projects" />
                  {d.myTasks.length === 0
                    ? <div className="flex flex-col items-center justify-center py-12 text-center">
                        <CheckCircle2 size={32} className="text-emerald-300 mb-3" />
                        <p className="text-sm font-semibold text-slate-500">You're all caught up! 🎉</p>
                        <p className="text-xs text-slate-400 mt-1">No tasks assigned to you yet.</p>
                        <Link href="/projects" className="mt-3 text-xs text-violet-600 hover:underline font-medium">Browse projects →</Link>
                      </div>
                    : d.myTasks.map((t) => <TaskRow key={t.id} task={t} />)
                  }
                </div>

                {/* Right column */}
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-slate-100 p-5">
                    <SectionHeader title="My Projects" href="/projects" />
                    {d.myProjects.length === 0
                      ? <p className="text-xs text-slate-400 text-center py-4">No projects yet</p>
                      : <div className="space-y-4">{d.myProjects.map((p) => <ProjectBar key={p.id} project={p} />)}</div>
                    }
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-100 p-5">
                    <SectionHeader title="Notifications" href="/notifications" badge={d.unreadCount} />
                    {d.recentNotifications.length === 0
                      ? <p className="text-xs text-slate-400 text-center py-3">All caught up!</p>
                      : d.recentNotifications.map((n) => <NotifItem key={n.id} n={n} />)
                    }
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      })()}

    </div>
  );
}
