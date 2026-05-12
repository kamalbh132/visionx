"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  Search, 
  MoreHorizontal, 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  UserCog 
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/core/components/ui/dropdown-menu";
import { Button } from "@/core/components/ui/button";
import { Badge } from "@/core/components/ui/badge"; // Ensure you have this or use standard tailwind

type User = {
  id: string;
  username: string;
  email: string;
  role: string;
  isVerified: boolean;
  createdAt: Date;
};

export function UsersClient({ initialUsers }: { initialUsers: User[] }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState<string | null>(null);

  // Filter Logic
  const filteredUsers = users.filter((user) =>
    user.username.toLowerCase().includes(query.toLowerCase()) ||
    user.email.toLowerCase().includes(query.toLowerCase())
  );

  // Handle Verify Action
  const handleVerify = async (userId: string, currentStatus: boolean) => {
    setIsLoading(userId);
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // You might want to pass body if your API expects it, 
        // currently your API just sets it to true.
      });

      if (!res.ok) throw new Error("Failed to update");

      toast.success("User verified successfully");
      
      // Optimistic update locally
      setUsers(users.map(u => u.id === userId ? { ...u, isVerified: true } : u));
      router.refresh(); // Sync with server
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Toolbar */}
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search users..."
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm">Export CSV</Button>
        </div>
      </div>

      {/* 2. Table */}
      <div className="rounded-md border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b">
              <tr>
                <th className="h-12 px-4 font-medium align-middle">User</th>
                <th className="h-12 px-4 font-medium align-middle">Role</th>
                <th className="h-12 px-4 font-medium align-middle">Status</th>
                <th className="h-12 px-4 font-medium align-middle">Joined</th>
                <th className="h-12 px-4 font-medium align-middle text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    No users found matching "{query}"
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-semibold border">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900">{user.username}</span>
                          <span className="text-xs text-slate-500">{user.email}</span>
                        </div>
                      </div>
                    </td>
                    
                    <td className="p-4 align-middle">
                       <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border
                         ${user.role === 'SUPERADMIN' ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                           user.role === 'ADMIN' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                           'bg-slate-50 text-slate-600 border-slate-200'}`}>
                          {user.role}
                       </span>
                    </td>

                    <td className="p-4 align-middle">
                      {user.isVerified ? (
                        <div className="flex items-center gap-1.5 text-green-600 bg-green-50 w-fit px-2 py-1 rounded-full text-xs font-medium">
                          <CheckCircle2 size={14} /> Verified
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-yellow-600 bg-yellow-50 w-fit px-2 py-1 rounded-full text-xs font-medium">
                          <Shield size={14} /> Pending
                        </div>
                      )}
                    </td>

                    <td className="p-4 align-middle text-slate-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>

                    <td className="p-4 align-middle text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          
                          {/* Verification Toggle */}
                          {!user.isVerified && (
                             <DropdownMenuItem 
                               onClick={() => handleVerify(user.id, user.isVerified)}
                               disabled={isLoading === user.id}
                               className="text-green-600 focus:text-green-600 focus:bg-green-50 cursor-pointer"
                             >
                               <CheckCircle2 className="mr-2 h-4 w-4" />
                               Verify User
                             </DropdownMenuItem>
                          )}
                          
                          <DropdownMenuItem className="cursor-pointer">
                            <UserCog className="mr-2 h-4 w-4" />
                            Change Role
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Account
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="text-xs text-muted-foreground text-center">
        Showing {filteredUsers.length} of {users.length} users
      </div>
    </div>
  );
}