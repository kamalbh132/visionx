"use client";

import { memo, useMemo, useState } from "react";
import { Search, UserPlus, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Avatar } from "./Avatar";
import { getConvName } from "./helpers";
import { Conversation } from "./types";

type Props = {
  conversations: Conversation[];
  activeId: string | null;
  myId: string;
  loading: boolean;
  onSelect: (id: string) => void;
  onNewDM: () => void;
  onNewGroup: () => void;
};

const ConvItem = memo(function ConvItem({
  conv, isActive, myId, onSelect,
}: { conv: Conversation; isActive: boolean; myId: string; onSelect: (id: string) => void }) {
  const name = getConvName(conv, myId);
  const isGroup = conv.type === "GROUP";
  const lastMsg = conv.messages[0];

  const preview = useMemo(() => {
    if (!lastMsg) return "No messages yet";
    if (lastMsg.type !== "TEXT") {
      const icons: Record<string, string> = { IMAGE: "📷 Photo", VIDEO: "🎥 Video", PDF: "📄 PDF", FILE: "📎 File", VOICE: "🎤 Voice" };
      return icons[lastMsg.type] ?? "📎 Attachment";
    }
    return lastMsg.sender.id === myId ? `You: ${lastMsg.content ?? ""}` : (lastMsg.content ?? "");
  }, [lastMsg, myId]);

  const timeAgo = useMemo(() =>
    lastMsg ? formatDistanceToNow(new Date(lastMsg.createdAt), { addSuffix: false }) : null,
    [lastMsg]
  );

  return (
    <button
      onClick={() => onSelect(conv.id)}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 12,
        padding: "10px 16px", textAlign: "left", border: "none", cursor: "pointer",
        background: isActive ? "linear-gradient(90deg,#eef2ff,#f5f3ff)" : "transparent",
        borderLeft: `3px solid ${isActive ? "#6366f1" : "transparent"}`,
        transition: "background 0.12s",
      }}
      onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc"; }}
      onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
    >
      <div style={{ position: "relative", flexShrink: 0 }}>
        <Avatar name={name} size={44} isGroup={isGroup} />
        {/* Online dot — placeholder, can wire to presence later */}
        {!isGroup && (
          <span style={{ position: "absolute", bottom: 1, right: 1, width: 10, height: 10, borderRadius: "50%", background: "#22c55e", border: "2px solid #fff" }} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4, marginBottom: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: isActive ? "#4f46e5" : "#0f172a" }}>
            {name}
          </span>
          {timeAgo && (
            <span style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>{timeAgo}</span>
          )}
        </div>
        <p style={{ margin: 0, fontSize: 12, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {preview}
        </p>
      </div>
    </button>
  );
});

export function ConversationList({ conversations, activeId, myId, loading, onSelect, onNewDM, onNewGroup }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() =>
    conversations.filter((c) => getConvName(c, myId).toLowerCase().includes(query.toLowerCase())),
    [conversations, myId, query]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#fff" }}>
      {/* Header */}
      <div style={{ padding: "20px 16px 12px", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>Messages</h1>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={onNewDM} title="New DM"
              style={{ width: 32, height: 32, borderRadius: "50%", background: "#eef2ff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#e0e7ff")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#eef2ff")}
            >
              <UserPlus size={15} color="#6366f1" />
            </button>
            <button onClick={onNewGroup} title="New group"
              style={{ width: 32, height: 32, borderRadius: "50%", background: "#eef2ff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#e0e7ff")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#eef2ff")}
            >
              <Users size={15} color="#6366f1" />
            </button>
          </div>
        </div>
        {/* Search */}
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations…"
            style={{
              width: "100%", paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
              fontSize: 13, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10,
              outline: "none", boxSizing: "border-box", color: "#0f172a",
            }}
          />
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#f1f5f9", flexShrink: 0 }} className="animate-pulse" />
              <div style={{ flex: 1 }}>
                <div style={{ height: 12, background: "#f1f5f9", borderRadius: 6, width: "50%", marginBottom: 8 }} className="animate-pulse" />
                <div style={{ height: 10, background: "#f1f5f9", borderRadius: 6, width: "75%" }} className="animate-pulse" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div style={{ padding: "48px 16px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
            {query ? "No conversations found" : "No conversations yet"}
          </div>
        ) : (
          filtered.map((conv) => (
            <ConvItem key={conv.id} conv={conv} isActive={conv.id === activeId} myId={myId} onSelect={onSelect} />
          ))
        )}
      </div>
    </div>
  );
}
