"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./sidebar";

const NO_SIDEBAR_PATHS = ["/", "/auth/login", "/auth/signup", "/verification"];

// Pages that need full-width (no padding) — the Kanban board
const FULL_WIDTH_PATHS = ["/dashboard", "/projects", "/messages", "/files", "/notifications", "/settings", "/user/notifications", "/admin/notifications", "/superadmin/notifications", "/user/settings", "/admin/settings", "/superadmin/settings"];

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const hideSidebar = NO_SIDEBAR_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "?")
  );

  if (hideSidebar) return <>{children}</>;

  // Kanban board pages get no padding so the board fills the space
  const isFullWidth = FULL_WIDTH_PATHS.some((p) => pathname.startsWith(p));

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className={`flex-1 overflow-hidden ${isFullWidth ? "flex flex-col" : "overflow-y-auto p-8"}`}>
        {children}
      </main>
    </div>
  );
}
