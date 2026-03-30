"use client";

import { useState } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { Conversation, UserInfo } from "./types";
import { Avatar } from "./Avatar";
import { toast } from "sonner";

type Props = {
  onClose: () => void;
  onCreated: (conv: Conversation) => void;
};

export function NewDMModal({ onClose, onCreated }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserInfo[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 1) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/v1/users?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) setResults(await res.json());
    } finally {
      setSearching(false);
    }
  };

  const startChat = async (user: UserInfo) => {
    setCreating(user.id);
    try {
      const res = await fetch("/api/v1/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "DIRECT", memberIds: [user.id] }),
      });
      if (!res.ok) throw new Error();
      onCreated(await res.json());
    } catch {
      toast.error("Failed to start chat");
    } finally {
      setCreating(null);
    }
  };

  return (
    <ModalWrapper title="New Message" onClose={onClose}>
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          autoFocus
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all"
        />
      </div>

      <div className="max-h-72 overflow-y-auto space-y-1">
        {searching && (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Loader2 size={18} className="animate-spin" />
          </div>
        )}
        {!searching && query.length > 0 && results.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No people found</p>
        )}
        {!searching &&
          results.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => startChat(user)}
              disabled={!!creating}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-indigo-50 active:bg-indigo-100 transition-colors text-left disabled:opacity-60 mb-1"
            >
              <Avatar name={user.username} size={42} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user.username}</p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-indigo-500">
                {creating === user.id ? <Loader2 size={14} className="animate-spin" /> : "Message ->"}
              </span>
            </button>
          ))}
      </div>
    </ModalWrapper>
  );
}

export function ModalWrapper({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col"
        style={{ maxHeight: "88vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
