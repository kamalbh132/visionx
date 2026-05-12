"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Loader2, BellOff, RefreshCw, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string; title: string; message: string | null;
  link: string | null; isRead: boolean; createdAt: string;
}

function inferLink(n: Notification): string | null {
  if (n.link) return n.link;
  const t = (n.title + " " + (n.message ?? "")).toLowerCase();
  if (t.includes("task") || t.includes("project")) return "/projects";
  if (t.includes("message") || t.includes("conversation")) return "/messages";
  if (t.includes("user") || t.includes("verified") || t.includes("approved")) return "/dashboard";
  return null;
}

export function NotificationsPage() {
  const router = useRouter();
  const [items, setItems]             = useState<Notification[]>([]);
  const [loading, setLoading]         = useState(true);
  const [hasMore, setHasMore]         = useState(false);
  const [cursor, setCursor]           = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [marking, setMarking]         = useState(false);

  const fetchNotifications = useCallback(async (cur?: string) => {
    const qs = cur ? `?cursor=${cur}&limit=20` : "?limit=20";
    const res = await fetch(`/api/v1/notifications${qs}`);
    if (!res.ok) return null;
    return res.json();
  }, []);

  useEffect(() => {
    fetchNotifications().then((data) => {
      if (!data) return;
      setItems(data.notifications ?? []);
      setHasMore(data.hasMore ?? false);
      setCursor(data.nextCursor ?? null);
      setLoading(false);
    });
  }, [fetchNotifications]);

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    const data = await fetchNotifications(cursor);
    if (data) {
      setItems((prev) => [...prev, ...(data.notifications ?? [])]);
      setHasMore(data.hasMore ?? false);
      setCursor(data.nextCursor ?? null);
    }
    setLoadingMore(false);
  };

  const markAllRead = async () => {
    setMarking(true);
    try {
      const res = await fetch("/api/v1/notifications", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success("All marked as read");
    } catch { toast.error("Failed to mark notifications"); }
    finally { setMarking(false); }
  };

  const handleClick = async (n: Notification) => {
    if (!n.isRead) {
      await fetch("/api/v1/notifications", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [n.id] }),
      });
      setItems((prev) => prev.map((item) => item.id === n.id ? { ...item, isRead: true } : item));
    }
    const link = inferLink(n);
    if (link) router.push(link);
  };

  const unreadCount = items.filter((n) => !n.isRead).length;

  return (
    <div className="flex flex-col h-full bg-[#f4f6fb]">
      <div className="shrink-0 bg-white border-b border-slate-100 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-violet-600 flex items-center justify-center">
            <Bell size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Notifications</h1>
            <p className="text-xs text-slate-400">{unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}</p>
          </div>
        </div>
        <button onClick={markAllRead} disabled={marking || unreadCount === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors">
          {marking ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
          Mark all read
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {loading ? (
          <div className="space-y-3 max-w-2xl">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                <div className="h-3 bg-slate-100 rounded w-1/3 mb-2" />
                <div className="h-2.5 bg-slate-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <BellOff size={24} className="text-slate-300" />
            </div>
            <p className="text-slate-500 font-semibold">No notifications yet</p>
            <p className="text-sm text-slate-400 mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-2 max-w-2xl">
            {items.map((n) => {
              const link = inferLink(n);
              return (
                <div key={n.id} onClick={() => handleClick(n)}
                  className={`group flex items-start gap-4 p-4 rounded-2xl border transition-all
                    ${link ? "cursor-pointer" : "cursor-default"}
                    ${n.isRead ? "bg-white border-slate-100 hover:border-slate-200" : "bg-white border-violet-100 shadow-sm hover:border-violet-200"}`}
                >
                  <div className="shrink-0 mt-1.5">
                    <div className={`h-2 w-2 rounded-full ${n.isRead ? "bg-slate-200" : "bg-violet-500"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${n.isRead ? "text-slate-600" : "text-slate-900"}`}>{n.title}</p>
                    {n.message && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>}
                    <p className="text-[11px] text-slate-400 mt-1.5">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!n.isRead && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">New</span>}
                    {link && <ArrowRight size={14} className="text-slate-300 group-hover:text-violet-500 transition-colors" />}
                  </div>
                </div>
              );
            })}
            {hasMore && (
              <button onClick={loadMore} disabled={loadingMore}
                className="w-full py-3 rounded-2xl border border-dashed border-slate-200 text-sm text-slate-500 hover:bg-white hover:border-slate-300 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {loadingMore ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
