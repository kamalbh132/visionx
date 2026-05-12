"use client";

import { useState } from "react";
import { Search, Crown, X, UserPlus, Loader2, Shield } from "lucide-react";
import { Conversation, UserInfo, Role, addableRoles, canRemoveMember } from "./types";
import { Avatar } from "./Avatar";
import { ModalWrapper } from "./NewDMModal";
import { toast } from "sonner";
import { cn } from "@/core/lib/utils";

const ROLE_BADGE: Record<Role, string> = {
  SUPERADMIN: "bg-purple-100 text-purple-700",
  ADMIN:      "bg-blue-100 text-blue-700",
  USER:       "bg-gray-100 text-gray-600",
};

type Props = {
  conversation: Conversation;
  myId: string;
  myRole: Role;
  onClose: () => void;
  onUpdate: () => void;
};

export function GroupInfoModal({
  conversation,
  myId,
  myRole,
  onClose,
  onUpdate,
}: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserInfo[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [tab, setTab] = useState<"members" | "add">("members");

  // IDs already in the group
  const memberIds = new Set(conversation.members.map((m) => m.user.id));

  // Is the current user an admin of this group?
  const amGroupAdmin =
    conversation.members.find((m) => m.user.id === myId)?.isAdmin ?? false;

  // Roles this user can add
  const allowed = addableRoles(myRole);

  // Can this user add members at all?
  const canAdd = amGroupAdmin || myRole === "SUPERADMIN";

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 1) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/v1/users?q=${encodeURIComponent(q.trim())}`);
      if (!res.ok) return;
      const users: UserInfo[] = await res.json();
      setResults(
        users.filter(
          (u) => !memberIds.has(u.id) && allowed.includes(u.role)
        )
      );
    } finally {
      setSearching(false);
    }
  };

  const addMember = async (user: UserInfo) => {
    setAdding(user.id);
    try {
      const res = await fetch(`/api/v1/conversations/${conversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addMemberIds: [user.id] }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${user.username} added to group`);
      setResults((prev) => prev.filter((u) => u.id !== user.id));
      onUpdate();
    } catch {
      toast.error("Failed to add member");
    } finally {
      setAdding(null);
    }
  };

  const removeMember = async (member: Conversation["members"][0]) => {
    const target = member.user;
    if (!window.confirm(`Remove ${target.username} from the group?`)) return;
    setRemoving(target.id);
    try {
      const res = await fetch(`/api/v1/conversations/${conversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removeMemberId: target.id }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${target.username} removed`);
      onUpdate();
    } catch {
      toast.error("Failed to remove member");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <ModalWrapper title={`${conversation.name} · ${conversation.members.length} members`} onClose={onClose}>
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-4">
        {(["members", "add"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            disabled={t === "add" && !canAdd}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all capitalize disabled:opacity-40",
              tab === t
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {t === "members" ? "Members" : "Add People"}
          </button>
        ))}
      </div>

      {/* ── Members tab ── */}
      {tab === "members" && (
        <div className="max-h-80 overflow-y-auto space-y-1">
          {conversation.members.map((m) => {
            const isMe = m.user.id === myId;
            // Can myRole remove this person?
            const removable =
              !isMe &&
              canRemoveMember(myRole, m.user.role, m.isAdmin);

            return (
              <div
                key={m.user.id}
                className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <Avatar name={m.user.username} size={38} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {m.user.username}
                      {isMe && <span className="text-gray-400 font-normal ml-1">(you)</span>}
                    </p>
                    {m.isAdmin && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full shrink-0">
                        <Crown size={9} /> Admin
                      </span>
                    )}
                  </div>
                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", ROLE_BADGE[m.user.role])}>
                    {m.user.role}
                  </span>
                </div>

                {removable && (
                  <button
                    onClick={() => removeMember(m)}
                    disabled={removing === m.user.id}
                    className="w-7 h-7 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors shrink-0"
                    title={`Remove ${m.user.username}`}
                  >
                    {removing === m.user.id ? (
                      <Loader2 size={13} className="animate-spin text-red-500" />
                    ) : (
                      <X size={13} className="text-red-500" />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add people tab ── */}
      {tab === "add" && canAdd && (
        <div>
          {/* Permission info */}
          <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-indigo-50 rounded-xl border border-indigo-100">
            <Shield size={13} className="text-indigo-500 shrink-0" />
            <p className="text-xs text-indigo-600">
              You can add: <span className="font-bold">{allowed.join(", ")}</span>
            </p>
          </div>

          <div className="relative mb-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search people to add…"
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
            />
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1">
            {searching && (
              <div className="flex justify-center py-6">
                <Loader2 size={16} className="animate-spin text-gray-400" />
              </div>
            )}
            {!searching && query.length > 0 && results.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">
                No eligible users found
              </p>
            )}
            {!searching && results.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <Avatar name={user.username} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{user.username}</p>
                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", ROLE_BADGE[user.role])}>
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={() => addMember(user)}
                  disabled={adding === user.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors disabled:opacity-60 shrink-0"
                >
                  {adding === user.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <UserPlus size={12} />
                  )}
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </ModalWrapper>
  );
}