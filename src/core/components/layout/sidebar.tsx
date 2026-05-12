"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard, Users, Settings, Briefcase,
  ChevronLeft, ChevronRight, MessageSquareText, Menu, BellRing, FolderOpen,
  ChevronDown, Clock,
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

// ── Projects collapsible nav item ─────────────────────────
// Uses a custom event so ProjectsKanbanPage can notify the sidebar when a project is created
const PROJECT_CREATED_EVENT = "visionx:project-created";

export function notifySidebarProjectCreated(project: { id: string; name: string; dueDate?: string | null; tasks: { status: string }[] }) {
  window.dispatchEvent(new CustomEvent(PROJECT_CREATED_EVENT, { detail: project }));
}

function ProjectsNavItem({ route, isActive }: {
  route: RouteItem; isActive: boolean;
}) {
  const [open, setOpen]         = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const router = useRouter();

  const loadProjects = () => {
    fetch("/api/v1/projects")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { setProjects(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadProjects(); }, []);

  // Listen for new project created from the board
  useEffect(() => {
    const handler = (e: Event) => {
      const project = (e as CustomEvent).detail;
      setProjects((prev) => {
        if (prev.find((p) => p.id === project.id)) return prev;
        return [project, ...prev];
      });
    };
    window.addEventListener(PROJECT_CREATED_EVENT, handler);
    return () => window.removeEventListener(PROJECT_CREATED_EVENT, handler);
  }, []);

  const filtered = search
    ? projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : projects;

  return (
    <div>
      {/* Projects row */}
      <div className={cn(
        "flex items-center rounded-lg text-sm font-medium transition-all duration-150 group",
        isActive ? "bg-primary/10 text-primary" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      )}>
        <Link href="/projects" className="flex items-center gap-3 px-3 py-2.5 flex-1 min-w-0">
          <route.icon size={20} className={cn(isActive ? "text-primary" : "text-slate-500 group-hover:text-slate-900")} />
          <span>{route.label}</span>
        </Link>
        <button onClick={() => setOpen((v) => !v)} className="px-2 py-2.5 text-slate-400 hover:text-slate-600 transition-colors">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {/* Sub-section with vertical border */}
      {open && (
        <div className="ml-3 mt-1 pl-3 border-l-2 border-slate-100">
          {/* Search */}
          <div className="relative mb-1.5">
            <svg className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects…"
              className="w-full pl-6 pr-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-slate-50 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-violet-400 focus:border-violet-400 transition-all"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px]">✕</button>
            )}
          </div>

          {/* Project list */}
          <div className="space-y-0.5">
            {loading && Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5 animate-pulse">
                <div className="h-4 w-4 rounded bg-slate-100 shrink-0" />
                <div className="h-2.5 bg-slate-100 rounded flex-1" />
              </div>
            ))}

            {!loading && filtered.length === 0 && (
              <p className="text-[11px] text-slate-400 px-2 py-2 text-center">
                {search ? `No results for "${search}"` : "No projects yet"}
              </p>
            )}

            {!loading && filtered.slice(0, 12).map((p) => {
              const overdue = p.dueDate && new Date(p.dueDate) < new Date();
              return (
                <button
                  key={p.id}
                  onClick={() => router.push(`/projects?project=${p.id}`)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors text-left group/item"
                >
                  <div className="h-4 w-4 rounded bg-slate-200 text-slate-600 group-hover/item:bg-violet-100 group-hover/item:text-violet-700 flex items-center justify-center text-[8px] font-bold shrink-0 transition-colors">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs text-slate-600 group-hover/item:text-slate-900 truncate flex-1 transition-colors">
                    {p.name}
                  </span>
                  {overdue && <Clock size={9} className="text-red-400 shrink-0" />}
                </button>
              );
            })}
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
