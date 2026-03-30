"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard, Users, Settings, Briefcase,
  ChevronLeft, ChevronRight, MessageSquareText, Menu, BellRing,
} from "lucide-react";
import { cn } from "@/core/lib/utils";
import UserMenu from "./user-menu";

type RouteItem = {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  href: string;
  roles: string[];
};

const ALL_ROUTES: RouteItem[] = [
  { label: "Dashboard",        icon: LayoutDashboard,   href: "__dashboard__",      roles: ["USER", "ADMIN", "SUPERADMIN"] },
  { label: "Projects",         icon: Briefcase,         href: "/projects",          roles: ["USER", "ADMIN", "SUPERADMIN"] },
  { label: "Admin Management", icon: Users,             href: "/superadmin/admins", roles: ["SUPERADMIN"] },
  { label: "User Management",  icon: Users,             href: "__usermgmt__",       roles: ["ADMIN", "SUPERADMIN"] },
  { label: "Messages",         icon: MessageSquareText, href: "/messages",          roles: ["USER", "ADMIN", "SUPERADMIN"] },
  { label: "Notifications",    icon: BellRing,          href: "__notifications__",  roles: ["USER", "ADMIN", "SUPERADMIN"] },
  { label: "Settings",         icon: Settings,          href: "__settings__",       roles: ["USER", "ADMIN", "SUPERADMIN"] },
];

function resolveHref(href: string, role: string): string {
  if (href === "__dashboard__") {
    return role === "SUPERADMIN" ? "/superadmin/dashboard" : role === "ADMIN" ? "/admin/dashboard" : "/user/dashboard";
  }
  if (href === "__notifications__") {
    return role === "SUPERADMIN" ? "/superadmin/notifications" : role === "ADMIN" ? "/admin/notifications" : "/user/notifications";
  }
  if (href === "__settings__") {
    return role === "SUPERADMIN" ? "/superadmin/settings" : role === "ADMIN" ? "/admin/settings" : "/user/settings";
  }
  if (href === "__usermgmt__") {
    return role === "SUPERADMIN" ? "/superadmin/users" : "/admin/users";
  }
  return href;
}

// Skeleton shown while session is loading — same dimensions as real sidebar
function SidebarSkeleton({ collapsed }: { collapsed: boolean }) {
  return (
    <aside className={cn(
      "relative flex flex-col h-screen bg-white border-r shadow-sm shrink-0",
      collapsed ? "w-20" : "w-64"
    )}>
      <div className="h-16 flex items-center px-6 border-b">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-white p-1 rounded-md shrink-0">
            <Menu size={20} />
          </div>
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

export default function Sidebar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Show skeleton immediately — no blank space while session loads
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
        <div className={cn(
          "flex items-center gap-2 font-bold text-xl text-primary overflow-hidden whitespace-nowrap",
          isCollapsed && "justify-center"
        )}>
          <div className="bg-primary text-white p-1 rounded-md shrink-0">
            <Menu size={20} />
          </div>
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
      <div className="flex-1 flex flex-col gap-1 p-3 overflow-y-auto">
        {routes.map((route) => {
          const isActive = pathname === route.href || pathname.startsWith(route.href + "/");
          return (
            <Link
              key={route.href}
              href={route.href}
              title={isCollapsed ? route.label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-150 group",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
                isCollapsed && "justify-center px-2"
              )}
            >
              <route.icon size={20} className={cn(isActive ? "text-primary" : "text-slate-500 group-hover:text-slate-900")} />
              {!isCollapsed && <span>{route.label}</span>}
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t bg-gray-50/50">
        <div className={cn("flex items-center gap-3", isCollapsed ? "justify-center" : "justify-between")}>
          <UserMenu user={session.user} collapsed={isCollapsed} />
        </div>
      </div>
    </aside>
  );
}
