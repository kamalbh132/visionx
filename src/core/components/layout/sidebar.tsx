"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard, Users, Settings, Briefcase,
  ChevronLeft, ChevronRight, MessageSquareText, Menu, BellRing, FolderOpen,
  Clock,
} from "lucide-react";
import { cn } from "@/core/lib/utils";
import UserMenu from "./user-menu";

type RouteItem = {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  href: string;
  roles: string[];
};

interface Project {
  id: string; name: string; dueDate?: string | null;
  tasks: { status: string }[];
}

const ALL_ROUTES: RouteItem[] = [
  { label: "Dashboard",        icon: LayoutDashboard,   href: "/dashboard",         roles: ["USER", "ADMIN", "SUPERADMIN"] },
  { label: "Projects",         icon: Briefcase,         href: "/projects",          roles: ["USER", "ADMIN", "SUPERADMIN"] },
  { label: "Admin Management", icon: Users,             href: "/superadmin/admins", roles: ["SUPERADMIN"] },
  { label: "User Management",  icon: Users,             href: "__usermgmt__",       roles: ["ADMIN", "SUPERADMIN"] },
  { label: "Messages",         icon: MessageSquareText, href: "/messages",          roles: ["USER", "ADMIN", "SUPERADMIN"] },
  { label: "Files",            icon: FolderOpen,        href: "/files",             roles: ["USER", "ADMIN", "SUPERADMIN"] },
  { label: "Notifications",    icon: BellRing,          href: "/notifications",     roles: ["USER", "ADMIN", "SUPERADMIN"] },
  { label: "Settings",         icon: Settings,          href: "/settings",          roles: ["USER", "ADMIN", "SUPERADMIN"] },
];

function resolveHref(href: string, role: string): string {
  if (href === "__usermgmt__") {
    return role === "SUPERADMIN" ? "/superadmin/users" : "/admin/users";
  }
  return href;
}

function SidebarSkeleton({ collapsed }: { collapsed: boolean }) {
  return (
    <aside className={cn("relative flex flex-col h-screen bg-white border-r shadow-sm shrink-0", collapsed ? "w-20" : "w-64")}>
      <div className="h-16 flex items-center px-6 border-b">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-white p-1 rounded-md shrink-0"><Menu size={20} /></div>
          {!collapsed && <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />}
        </div>
      </div>
      <div className="flex-1 p-3 space-y-1">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={cn("flex items-center gap-3 px-3 py-3 rounded-lg", collapsed && "justify-center")}>
            <div className="h-5 w-5 rounded bg-slate-100 animate-pulse shrink-0" />
            {!collapsed && <div className="h-3 rounded bg-slate-100 animate-pulse" style={{ width: `${55 + (i % 3) * 20}px` }} />}
          </div>
        ))}
      </div>
      <div className="p-4 border-t">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-slate-100 animate-pulse shrink-0" />
          {!collapsed && <div className="space-y-1.5 flex-1">
            <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
            <div className="h-2.5 w-16 bg-slate-100 rounded animate-pulse" />
          </div>}
        </div>
      </div>
    </aside>
  );
}

// ── Custom event for sidebar refresh ─────────────────────
const PROJECT_CREATED_EVENT = "visionx:project-created";

export function notifySidebarProjectCreated(project: { id: string; name: string; dueDate?: string | null; tasks: { status: string }[] }) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PROJECT_CREATED_EVENT, { detail: project }));
  }
}

// ── Projects floating popover nav item ────────────────────
function ProjectsNavItem({ route, isActive }: { route: RouteItem; isActive: boolean }) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [projects, setProjects]       = useState<Project[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/v1/projects")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { setProjects(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const project = (e as CustomEvent).detail;
      setProjects((prev) => prev.find((p) => p.id === project.id) ? prev : [project, ...prev]);
    };
    window.addEventListener(PROJECT_CREATED_EVENT, handler);
    return () => window.removeEventListener(PROJECT_CREATED_EVENT, handler);
  }, []);

  // Close on outside click (fallback for touch devices)
  useEffect(() => {
    if (!popoverOpen) return;
    const handler = (e: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [popoverOpen]);

  const filtered = search
    ? projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : projects;

  const navigate = (id: string) => {
    setPopoverOpen(false);
    router.push(`/projects?project=${id}`);
  };

  return (
    <div
      ref={triggerRef}
      className="relative"
      onMouseEnter={() => setPopoverOpen(true)}
      onMouseLeave={() => setPopoverOpen(false)}
    >
      {/* Projects row */}
      <div className={cn(
        "flex items-center rounded-lg text-sm font-medium transition-all duration-150 group",
        isActive ? "bg-primary/10 text-primary" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      )}>
        {/* Left: icon + label → navigate to /projects */}
        <Link href="/projects" className="flex items-center gap-3 px-3 py-2.5 flex-1 min-w-0">
          <route.icon size={20} className={cn(isActive ? "text-primary" : "text-slate-500 group-hover:text-slate-900")} />
          <span>{route.label}</span>
        </Link>
        {/* Right: chevron indicator */}
        <div className="px-2 py-2.5 text-slate-400">
          <ChevronRight size={14} className={cn("transition-transform duration-150", popoverOpen && "rotate-90")} />
        </div>
      </div>

      {/* Floating popover — appears to the right of the sidebar */}
      {popoverOpen && (
        <div
          className="fixed z-50"
          style={{
            left: triggerRef.current
              ? triggerRef.current.getBoundingClientRect().right + 8
              : 272,
            top: triggerRef.current
              ? triggerRef.current.getBoundingClientRect().top
              : 0,
          }}
          onMouseEnter={() => setPopoverOpen(true)}
          onMouseLeave={() => setPopoverOpen(false)}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-64 overflow-hidden"
            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
            {/* Header */}
            <div className="px-4 pt-3 pb-2 border-b border-slate-50">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Projects</p>
              {/* Search */}
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search projects…"
                  autoFocus
                  className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                />
                {search && (
                  <button onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                )}
              </div>
            </div>

            {/* Project list */}
            <div className="py-1.5 max-h-72 overflow-y-auto">
              {loading && Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2 animate-pulse">
                  <div className="h-6 w-6 rounded-lg bg-slate-100 shrink-0" />
                  <div className="h-3 bg-slate-100 rounded flex-1" />
                </div>
              ))}

              {!loading && filtered.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-6">
                  {search ? `No results for "${search}"` : "No projects yet"}
                </p>
              )}

              {!loading && filtered.map((p) => {
                const overdue = p.dueDate && new Date(p.dueDate) < new Date();
                const done  = p.tasks.filter((t) => t.status === "COMPLETED").length;
                const total = p.tasks.length;
                const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

                return (
                  <button
                    key={p.id}
                    onClick={() => navigate(p.id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left group/item"
                  >
                    {/* Avatar */}
                    <div className="h-7 w-7 rounded-lg bg-violet-100 text-violet-700 group-hover/item:bg-violet-600 group-hover/item:text-white flex items-center justify-center text-[10px] font-bold shrink-0 transition-colors">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    {/* Name + progress */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-slate-700 group-hover/item:text-slate-900 truncate transition-colors">
                          {p.name}
                        </span>
                        {overdue && <Clock size={10} className="text-red-400 shrink-0" />}
                      </div>
                      {total > 0 && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="flex-1 h-1 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, background: pct === 100 ? "#10b981" : "#8b5cf6" }} />
                          </div>
                          <span className="text-[10px] text-slate-400 tabular-nums shrink-0">{done}/{total}</span>
                        </div>
                      )}
                    </div>
                    <ChevronRight size={12} className="text-slate-300 group-hover/item:text-slate-500 shrink-0 transition-colors" />
                  </button>
                );
              })}
            </div>

            {/* Footer: view all */}
            <div className="border-t border-slate-50 px-4 py-2.5">
              <button
                onClick={() => { setPopoverOpen(false); router.push("/projects"); }}
                className="w-full text-xs font-semibold text-violet-600 hover:text-violet-700 text-left transition-colors"
              >
                View all projects →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (status === "loading") return <SidebarSkeleton collapsed={isCollapsed} />;
  if (!session?.user) return null;

  const role = session.user.role || "USER";
  const routes = ALL_ROUTES
    .filter((r) => r.roles.includes(role))
    .map((r) => ({ ...r, href: resolveHref(r.href, role) }));

  return (
    <aside className={cn(
      "relative flex flex-col h-screen bg-white border-r shadow-sm transition-all duration-300 ease-in-out shrink-0",
      isCollapsed ? "w-20" : "w-64"
    )}>
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b">
        <div className={cn("flex items-center gap-2 font-bold text-xl text-primary overflow-hidden whitespace-nowrap", isCollapsed && "justify-center")}>
          <div className="bg-primary text-white p-1 rounded-md shrink-0"><Menu size={20} /></div>
          {!isCollapsed && <span className="tracking-tight">VisionX</span>}
        </div>
      </div>

      {/* Toggle */}
      <button
        className="absolute -right-3 top-[72px] h-6 w-6 rounded-full border bg-white shadow-md z-10 hover:bg-gray-100 flex items-center justify-center transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Nav */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="flex flex-col gap-0.5 p-3">
          {routes.map((route) => {
            const isProjects = route.href === "/projects";
            const isActive   = pathname === route.href || pathname.startsWith(route.href + "/");

            if (isProjects && !isCollapsed) {
              return (
                <ProjectsNavItem
                  key={route.href}
                  route={route}
                  isActive={isActive}
                />
              );
            }

            return (
              <Link
                key={route.href}
                href={route.href}
                title={isCollapsed ? route.label : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group",
                  isActive ? "bg-primary/10 text-primary" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
                  isCollapsed && "justify-center px-2"
                )}
              >
                <route.icon size={20} className={cn(isActive ? "text-primary" : "text-slate-500 group-hover:text-slate-900")} />
                {!isCollapsed && <span>{route.label}</span>}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-gray-50/50 shrink-0">
        <div className={cn("flex items-center gap-3", isCollapsed ? "justify-center" : "justify-between")}>
          <UserMenu user={session.user} collapsed={isCollapsed} />
        </div>
      </div>
    </aside>
  );
}
