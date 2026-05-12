import prisma from "@/core/lib/prisma";
import { UsersClient } from "./users-table";
import { ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic"; // Ensure real-time data

export default async function UsersPage() {
  try {
    // 1. Fetch all users sorted by newest
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isVerified: true,
        createdAt: true,
      },
    });

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col gap-2">
           <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
           <p className="text-muted-foreground">
             Manage access, verify accounts, and update roles.
           </p>
        </div>

        {/* 2. Pass data to the client component */}
        <UsersClient initialUsers={users} />
      </div>
    );
  } catch (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-red-500 bg-red-50 rounded-lg border border-red-100">
        <ShieldAlert size={48} className="mb-4" />
        <h2 className="text-xl font-bold">Error Loading Users</h2>
        <p className="text-sm">Please try refreshing the page.</p>
      </div>
    );
  }
}