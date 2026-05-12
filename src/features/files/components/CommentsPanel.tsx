"use client";

import { useState, useEffect, useRef } from "react";
import { X, Send, Trash2, Loader2, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface CommentUser { id: string; username: string; avatarColor: string | null }
interface Comment { id: string; content: string; user: CommentUser; createdAt: string }

interface Props {
  fileId: string;
  fileName: string;
  myId: string;
  myRole: string;
  onClose: () => void;
  onCountChange: (fileId: string, count: number) => void;
}

export function CommentsPanel({ fileId, fileName, myId, myRole, onClose, onCountChange }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [text, setText]         = useState("");
  const [sending, setSending]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  useEffect(() => {
    fetch(`/api/v1/files/${fileId}/comments`)
      .then((r) => r.json())
      .then((data) => {
        setComments(Array.isArray(data) ? data : []);
        setLoading(false);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      });
  }, [fileId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/v1/files/${fileId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const updated = [...comments, data];
      setComments(updated);
      onCountChange(fileId, updated.length);
      setText("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to post comment");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    const res = await fetch(`/api/v1/files/${fileId}/comments/${commentId}`, { method: "DELETE" });
    if (res.ok) {
      const updated = comments.filter((c) => c.id !== commentId);
      setComments(updated);
      onCountChange(fileId, updated.length);
      toast.success("Comment deleted");
    } else {
      toast.error("Failed to delete");
    }
  };

  const canDelete = (comment: Comment) =>
    comment.user.id === myId || myRole === "SUPERADMIN" || myRole === "ADMIN";

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[400px] z-50 bg-white shadow-2xl flex flex-col border-l border-slate-100">
        {/* Header */}
        <div className="shrink-0 px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
              <MessageSquare size={15} className="text-violet-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{fileName}</p>
              <p className="text-xs text-slate-400">{comments.length} comment{comments.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 shrink-0 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="h-8 w-8 rounded-full bg-slate-100 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-100 rounded w-1/3" />
                    <div className="h-2.5 bg-slate-100 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                <MessageSquare size={22} className="text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-500">No comments yet</p>
              <p className="text-xs text-slate-400 mt-1">Be the first to comment on this file</p>
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3 group">
                {/* Avatar */}
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
                  style={{ background: c.user.avatarColor ?? "#6366f1" }}
                >
                  {c.user.username.charAt(0).toUpperCase()}
                </div>

                {/* Bubble */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-800">{c.user.username}</span>
                    {c.user.id === myId && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600">You</span>
                    )}
                    <span className="text-[10px] text-slate-400 ml-auto">
                      {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="bg-slate-50 rounded-2xl rounded-tl-sm px-3.5 py-2.5 relative">
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">{c.content}</p>
                    {canDelete(c) && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:border-red-200"
                      >
                        <Trash2 size={10} className="text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 px-5 py-4 border-t border-slate-100 bg-white">
          <form onSubmit={handleSend} className="flex gap-2.5 items-end">
            <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200 focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all">
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e as any); }
                }}
                placeholder="Write a comment… (Enter to send)"
                rows={1}
                maxLength={1000}
                className="w-full px-3.5 py-2.5 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none leading-relaxed"
                style={{ maxHeight: 120 }}
              />
              {text.length > 800 && (
                <p className="text-[10px] text-slate-400 px-3.5 pb-1.5 text-right">{text.length}/1000</p>
              )}
            </div>
            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="h-10 w-10 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white flex items-center justify-center shrink-0 transition-colors shadow-sm"
            >
              {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </form>
          <p className="text-[10px] text-slate-400 mt-1.5 text-center">Shift+Enter for new line</p>
        </div>
      </div>
    </>
  );
}
