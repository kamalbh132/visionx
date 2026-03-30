
"use client";

import { useState } from "react";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { toast } from "sonner";
import { X, Search, Users, MessageSquare, Check, Loader2 } from "lucide-react";
import { cn } from "@/core/lib/utils";

type User = {
  id: string;
  username: string;
  email: string;
  role: string;
};

type Props = {
  onClose: () => void;
  onCreated: (conv: any) => void;
  currentUserId: string;
};

export function NewConversationModal({ onClose, onCreated, currentUserId }: Props) {
  const [mode, setMode] = useState<"dm" | "group">("dm");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [groupName, setGroupName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/v1/users?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const users = await res.json();
        setSearchResults(users);
      }
    } finally {
      setSearching(false);
    }
  };

  const toggleUser = (user: User) => {
    if (mode === "dm") {
      setSelectedUsers([user]);
    } else {
      setSelectedUsers((prev) =>
        prev.find((u) => u.id === user.id)
          ? prev.filter((u) => u.id !== user.id)
          : [...prev, user]
      );
    }
  };

  const isSelected = (userId: string) =>
    selectedUsers.some((u) => u.id === userId);

  const handleCreate = async () => {
    if (selectedUsers.length === 0) {
      toast.error("Select at least one user");
      return;
    }
    if (mode === "group" && !groupName.trim()) {
      toast.error("Group name is required");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/v1/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: mode === "group" ? "GROUP" : "DIRECT",
          name: mode === "group" ? groupName.trim() : undefined,
          memberIds: selectedUsers.map((u) => u.id),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("[NewConversationModal] API error:", res.status, err);
        toast.error(err?.error ?? `Error ${res.status} — check browser console`);
        setCreating(false);
        return;
      }
      const conv = await res.json();
      onCreated(conv);
      toast.success(
        mode === "group" ? "Group created!" : "Conversation started!"
      );
    } catch (e) {
      console.error("[NewConversationModal] fetch error:", e);
      toast.error("Network error — could not create conversation");
    } finally {
      setCreating(false);
    }
  };

  const roleBadgeColor: Record<string, string> = {
    SUPERADMIN: "bg-purple-100 text-purple-700",
    ADMIN: "bg-blue-100 text-blue-700",
    USER: "bg-slate-100 text-slate-500",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-bold text-lg">New Message</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {/* Mode Tabs */}
          <div className="flex rounded-lg border p-1 gap-1">
            <button
              onClick={() => { setMode("dm"); setSelectedUsers([]); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors",
                mode === "dm"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-slate-700"
              )}
            >
              <MessageSquare className="h-4 w-4" />
              Direct Message
            </button>
            <button
              onClick={() => { setMode("group"); setSelectedUsers([]); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors",
                mode === "group"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-slate-700"
              )}
            >
              <Users className="h-4 w-4" />
              Group Chat
            </button>
          </div>

          {/* Group Name (group mode only) */}
          {mode === "group" && (
            <Input
              placeholder="Group name *"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          )}

          {/* Selected users chips */}
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((u) => (
                <span
                  key={u.id}
                  className="flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-1 rounded-full"
                >
                  {u.username}
                  <button
                    onClick={() => toggleUser(u)}
                    className="hover:text-red-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Results */}
          <div className="max-h-52 overflow-y-auto space-y-1">
            {searching && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No users found
              </p>
            )}
            {searchResults.map((user) => (
              <button
                key={user.id}
                onClick={() => toggleUser(user)}
                className={cn(
                  "w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors text-left",
                  isSelected(user.id) && "bg-primary/5"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-linear-to-br from-primary to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{user.username}</p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded font-medium",
                          roleBadgeColor[user.role] || roleBadgeColor.USER
                        )}
                      >
                        {user.role}
                      </span>
                    </div>
                  </div>
                </div>
                {isSelected(user.id) && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={selectedUsers.length === 0 || creating}
          >
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "group" ? "Create Group" : "Start Chat"}
          </Button>
        </div>
      </div>
    </div>
  );
}