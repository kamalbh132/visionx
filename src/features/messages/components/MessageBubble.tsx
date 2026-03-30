"use client";

import { memo, useState } from "react";
import { Reply, Trash2, Download, FileText, Mic, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import { Message } from "./types";
import { formatBytes, avatarColor } from "./helpers";
import { Avatar } from "./Avatar";

type Props = {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  isLastInGroup: boolean;
  isGroupConv: boolean;
  onReply: (msg: Message) => void;
  onDelete: (id: string) => void;
};

export const MessageBubble = memo(function MessageBubble({
  message, isOwn, showAvatar, isLastInGroup, isGroupConv, onReply, onDelete,
}: Props) {
  const [hovered, setHovered] = useState(false);

  if (message.isDeleted) {
    return (
      <div style={{ display: "flex", justifyContent: isOwn ? "flex-end" : "flex-start" }} className="my-0.5 px-4">
        <span className="text-xs italic text-gray-400 bg-gray-100/80 px-3 py-1.5 rounded-2xl">
          Message deleted
        </span>
      </div>
    );
  }

  const renderContent = () => {
    if (message.type === "IMAGE" && message.fileUrl) {
      return (
        <div>
          <img src={message.fileUrl} alt={message.fileName ?? "image"} className="rounded-2xl max-w-[260px] max-h-56 object-cover block" />
          <a href={message.fileUrl} download={message.fileName} onClick={(e) => e.stopPropagation()}
            className={`flex items-center gap-1 text-xs mt-1.5 hover:underline ${isOwn ? "text-indigo-200" : "text-indigo-500"}`}>
            <Download size={11} /> Download
          </a>
        </div>
      );
    }
    if (message.type === "VIDEO" && message.fileUrl) {
      return <video src={message.fileUrl} controls className="rounded-2xl max-w-[260px] max-h-48 block" />;
    }
    if (message.type === "VOICE" && message.fileUrl) {
      return (
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 180 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: isOwn ? "rgba(255,255,255,0.25)" : "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Mic size={14} className="text-white" />
          </div>
          <audio src={message.fileUrl} controls className="flex-1 h-8" style={{ minWidth: 140 }} />
        </div>
      );
    }
    if ((message.type === "PDF" || message.type === "FILE") && message.fileUrl) {
      return (
        <a href={message.fileUrl} download={message.fileName} onClick={(e) => e.stopPropagation()}
          style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 180, textDecoration: "none" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: isOwn ? "rgba(255,255,255,0.2)" : "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <FileText size={18} className={isOwn ? "text-white" : "text-indigo-600"} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160, color: isOwn ? "#fff" : "#1e293b" }}>
              {message.fileName ?? "File"}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: isOwn ? "rgba(255,255,255,0.6)" : "#94a3b8" }}>
              {message.fileSize ? formatBytes(message.fileSize) : ""}
            </p>
          </div>
          <Download size={14} style={{ color: isOwn ? "rgba(255,255,255,0.6)" : "#94a3b8" }} />
        </a>
      );
    }
    return (
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, wordBreak: "break-word", whiteSpace: "pre-wrap", color: isOwn ? "#fff" : "#1e293b" }}>
        {message.content}
        {message.isEdited && (
          <span style={{ fontSize: 11, marginLeft: 4, color: isOwn ? "rgba(255,255,255,0.5)" : "#94a3b8" }}>(edited)</span>
        )}
      </p>
    );
  };

  const ownRadius  = isLastInGroup ? "20px 20px 4px 20px" : "20px 4px 4px 20px";
  const otherRadius = isLastInGroup ? "20px 20px 20px 4px" : "4px 20px 20px 4px";

  return (
    <div
      style={{ display: "flex", alignItems: "flex-end", gap: 8, padding: "2px 16px", flexDirection: isOwn ? "row-reverse" : "row" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar placeholder — keeps spacing consistent */}
      <div style={{ width: 28, flexShrink: 0 }}>
        {!isOwn && isLastInGroup && <Avatar name={message.sender.username} size={28} />}
      </div>

      <div style={{ display: "flex", flexDirection: "column", maxWidth: "65%", alignItems: isOwn ? "flex-end" : "flex-start" }}>
        {/* Sender name in group */}
        {isGroupConv && !isOwn && showAvatar && (
          <p style={{ fontSize: 11, fontWeight: 700, marginBottom: 3, paddingLeft: 4, color: avatarColor(message.sender.username) }}>
            {message.sender.username}
          </p>
        )}

        {/* Reply preview */}
        {message.replyTo && (
          <div style={{
            padding: "6px 10px", borderRadius: 10, marginBottom: 4, maxWidth: "100%",
            background: isOwn ? "rgba(255,255,255,0.15)" : "#f1f5f9",
            borderLeft: isOwn ? "none" : "3px solid #6366f1",
            borderRight: isOwn ? "3px solid rgba(255,255,255,0.5)" : "none",
          }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: isOwn ? "rgba(255,255,255,0.85)" : "#6366f1" }}>
              {message.replyTo.sender.username}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: isOwn ? "rgba(255,255,255,0.6)" : "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
              {message.replyTo.content ?? "📎 Attachment"}
            </p>
          </div>
        )}

        {/* Bubble */}
        <div
          style={{
            padding: message.type === "TEXT" ? "10px 14px" : 8,
            background: isOwn ? "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)" : "#ffffff",
            borderRadius: isOwn ? ownRadius : otherRadius,
            boxShadow: isOwn ? "0 2px 16px rgba(99,102,241,0.4)" : "0 1px 4px rgba(0,0,0,0.07)",
            border: isOwn ? "none" : "1px solid #e8ecf0",
          }}
        >
          {renderContent()}
        </div>

        {/* Timestamp — visible on hover only */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: 3, marginTop: 3, paddingLeft: 4, paddingRight: 4,
            flexDirection: isOwn ? "row-reverse" : "row",
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.15s",
          }}
        >
          <span style={{ fontSize: 11, color: "#94a3b8" }}>{format(new Date(message.createdAt), "h:mm a")}</span>
          {isOwn && <CheckCheck size={12} style={{ color: "#818cf8" }} />}
        </div>
      </div>

      {/* Hover actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, opacity: hovered ? 1 : 0, transition: "opacity 0.15s", flexDirection: isOwn ? "row" : "row-reverse" }}>
        <button onClick={() => onReply(message)} title="Reply"
          className="w-7 h-7 rounded-full bg-white shadow border border-gray-100 hover:bg-gray-50 flex items-center justify-center transition-colors">
          <Reply size={12} className="text-gray-500" />
        </button>
        {isOwn && (
          <button onClick={() => onDelete(message.id)} title="Delete"
            className="w-7 h-7 rounded-full bg-white shadow border border-red-100 hover:bg-red-50 flex items-center justify-center transition-colors">
            <Trash2 size={12} className="text-red-400" />
          </button>
        )}
      </div>
    </div>
  );
});
