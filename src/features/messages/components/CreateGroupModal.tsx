"use client";

import { useState } from "react";
import { Search, Check, X, Loader2, Users } from "lucide-react";
import { Conversation, UserInfo, Role, addableRoles } from "./types";
import { Avatar } from "./Avatar";
import { ModalWrapper } from "./NewDMModal";
import { toast } from "sonner";
import { cn } from "@/core/lib/utils";

const ROLE_BADGE: Record<Role, string> = {
  SUPERADMIN: "bg-purple-100 text-purple-700",
  ADMIN: "bg-blue-100 text-blue-700",
  USER: "bg-gray-100 text-gray-600",
};

type Props = {
  myRole: Role;
  onClose: () => void;
  onCreated: (conv: Conversation) => void;
};

export function CreateGroupModal({ myRole, onClose, onCreated }: Props) {
  const [groupName, setGroupName] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserInfo[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<UserInfo[]>([]);
  const [creating, setCreating] = useState(false);

  const allowed = addableRoles(myRole);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 1) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/v1/users?q=${encodeURIComponent(q.trim())}`);
      if (!res.ok) return;
      const users: UserInfo[] = await res.json();
      const filtered = users.filter(
        (u) => allowed.includes(u.role) && !selected.find((s) => s.id === u.id)
      );
      setResults(filtered);
    } finally {
      setSearching(false);
    }
  };

  const toggleUser = (user: UserInfo) => {
    setSelected((prev) =>
      prev.find((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
    setResults((prev) => prev.filter((u) => u.id !== user.id));
    setQuery("");
  };

  const removeSelected = (id: string) => {
    setSelected((prev) => prev.filter((u) => u.id !== id));
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }
    if (selected.length < 1) {
      toast.error("Add at least one member");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/v1/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "GROUP",
          name: groupName.trim(),
          memberIds: selected.map((u) => u.id),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Group created");
      onCreated(await res.json());
    } catch {
      toast.error("Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  return (
    <ModalWrapper title="Create Group" onClose={onClose}>
      <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-indigo-50 rounded-xl border border-indigo-100">
        <Users size={14} className="text-indigo-500 shrink-0" />
        <p className="text-xs text-indigo-600 font-medium">
          As <span className="font-bold">{myRole}</span> you can add: {allowed.join(", ")}
        </p>
      </div>

      <input
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        placeholder="Group name *"
        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all mb-3"
      />

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {selected.map((u) => (
            <span
              key={u.id}
              className="flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full"
            >
              {u.username}
              <span className={cn("text-[10px] px-1 rounded", ROLE_BADGE[u.role])}>{u.role}</span>
              <button
                onClick={() => removeSelected(u.id)}
                className="hover:text-red-500 transition-colors ml-0.5"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative mb-2">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search people to add..."
          className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
        />
      </div>

      <div className="max-h-44 overflow-y-auto space-y-1 mb-4">
        {searching && (
          <div className="flex justify-center py-4">
            <Loader2 size={16} className="animate-spin text-gray-400" />
          </div>
        )}
        {!searching && query.length > 0 && results.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">No eligible users found</p>
        )}
        {!searching &&
          results.map((user) => {
            const isSel = !!selected.find((u) => u.id === user.id);
            return (
              <button
                key={user.id}
                onClick={() => toggleUser(user)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors",
                  isSel ? "bg-indigo-50" : "hover:bg-gray-50"
                )}
              >
                <Avatar name={user.username} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user.username}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0",
                    ROLE_BADGE[user.role]
                  )}
                >
                  {user.role}
                </span>
                {isSel && <Check size={15} className="text-indigo-600 shrink-0" />}
              </button>
            );
          })}
      </div>

      <div className="pt-2 mt-1 border-t border-gray-100">
        {(!groupName.trim() || selected.length === 0) && (
          <p className="text-xs text-gray-400 text-center mb-2">
            {!groupName.trim() && selected.length === 0
              ? "Enter a group name and add at least one member"
              : !groupName.trim()
              ? "Enter a group name to continue"
              : "Add at least one member to continue"}
          </p>
        )}
        {groupName.trim() && selected.length > 0 && (
          <p className="text-xs text-gray-500 text-center mb-2">
            Create <span className="font-bold text-gray-800">{groupName}</span> with{" "}
            <span className="font-bold text-indigo-600">{selected.length + 1} members</span>
          </p>
        )}
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating || !groupName.trim() || selected.length === 0}
          className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            !creating && groupName.trim() && selected.length > 0
              ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {creating ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Creating group...
            </>
          ) : (
            <>
              <Users size={15} /> Create Group
            </>
          )}
        </button>
      </div>
    </ModalWrapper>
  );
}
