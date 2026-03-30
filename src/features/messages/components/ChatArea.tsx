"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  Phone,
  Video,
  Info,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { Message, Conversation, UserInfo } from "./types";
import { getConvName, getOtherUser } from "./helpers";
import { useWebSocket } from "@/core/hooks/useWebSocket";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { Avatar } from "./Avatar";
import { cn } from "@/core/lib/utils";
import { toast } from "sonner";

type Props = {
  conversation: Conversation;
  myId: string;
  onBack: () => void;
  onCallStart: (type: "audio" | "video", target: UserInfo, convId: string) => void;
  onOpenGroupInfo: () => void;
};

type NewMessageEvent = {
  type: "new_message";
  conversationId: string;
  message: Message;
};

type MessageDeletedEvent = {
  type: "message_deleted";
  conversationId: string;
  messageId: string;
};

type TypingEvent = {
  type: "typing";
  conversationId: string;
  userId: string;
  username: string;
};

type StopTypingEvent = {
  type: "stop_typing";
  conversationId: string;
  userId: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNewMessageEvent(msg: Record<string, unknown>): msg is NewMessageEvent {
  return (
    msg.type === "new_message" &&
    typeof msg.conversationId === "string" &&
    isRecord(msg.message)
  );
}

function isMessageDeletedEvent(
  msg: Record<string, unknown>
): msg is MessageDeletedEvent {
  return (
    msg.type === "message_deleted" &&
    typeof msg.conversationId === "string" &&
    typeof msg.messageId === "string"
  );
}

function isTypingEvent(msg: Record<string, unknown>): msg is TypingEvent {
  return (
    msg.type === "typing" &&
    typeof msg.conversationId === "string" &&
    typeof msg.userId === "string" &&
    typeof msg.username === "string"
  );
}

function isStopTypingEvent(msg: Record<string, unknown>): msg is StopTypingEvent {
  return (
    msg.type === "stop_typing" &&
    typeof msg.conversationId === "string" &&
    typeof msg.userId === "string"
  );
}

export function ChatArea({
  conversation,
  myId,
  onBack,
  onCallStart,
  onOpenGroupInfo,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<{ userId: string; username: string }[]>([]);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { send, addHandler } = useWebSocket();

  const isGroup = conversation.type === "GROUP";
  const convName = getConvName(conversation, myId);
  const otherUser = getOtherUser(conversation, myId);
  const activeTyping = typingUsers.filter((t) => t.userId !== myId);

  /* ── Fetch messages ── */
  const fetchMessages = useCallback(
    async (cursor?: string) => {
      const qs = cursor
        ? `?cursor=${encodeURIComponent(cursor)}&limit=40`
        : "?limit=40";
      const res = await fetch(
        `/api/v1/conversations/${conversation.id}${qs}`
      );
      if (!res.ok) return null;
      return res.json();
    },
    [conversation.id]
  );

  /* ── Initial load ── */
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    setLoading(true);
    setMessages([]);

    fetchMessages().then((data) => {
      if (cancelled || !data) return;
      setMessages(data.messages ?? []);
      setHasMore(data.hasMore ?? false);
      setNextCursor(data.nextCursor ?? null);
      setLoading(false);
      setTimeout(() => {
        endRef.current?.scrollIntoView({ behavior: "auto" });
      }, 60);
    });

    send({ type: "join_conversation", conversationId: conversation.id });
    return () => {
      cancelled = true;
      controller.abort();
      send({ type: "leave_conversation", conversationId: conversation.id });
    };
  }, [conversation.id, fetchMessages, send]);

  /* ── WebSocket real-time handler ── */
  useEffect(() => {
    const remove = addHandler((msg) => {
      const isSupportedEvent =
        isNewMessageEvent(msg) ||
        isMessageDeletedEvent(msg) ||
        isTypingEvent(msg) ||
        isStopTypingEvent(msg);
      if (!isSupportedEvent) return;
      if (msg.conversationId !== conversation.id) return;

      if (isNewMessageEvent(msg)) {
        setMessages((prev) =>
          prev.find((m) => m.id === msg.message.id) ? prev : [...prev, msg.message]
        );
        // auto-scroll if near bottom
        const el = containerRef.current;
        if (el) {
          const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
          if (distFromBottom < 120) {
            setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
          }
        }
      }

      if (isMessageDeletedEvent(msg)) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.messageId ? { ...m, isDeleted: true, content: null } : m
          )
        );
      }

      if (isTypingEvent(msg) && msg.userId !== myId) {
        setTypingUsers((prev) =>
          prev.find((t) => t.userId === msg.userId)
            ? prev
            : [...prev, { userId: msg.userId, username: msg.username }]
        );
        setTimeout(
          () => setTypingUsers((prev) => prev.filter((t) => t.userId !== msg.userId)),
          3000
        );
      }

      if (isStopTypingEvent(msg)) {
        setTypingUsers((prev) => prev.filter((t) => t.userId !== msg.userId));
      }
    });
    return remove;
  }, [addHandler, conversation.id, myId]);

  /* ── Scroll detection for "scroll down" button ── */
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollDown(distFromBottom > 200);
  };

  /* ── Load older messages ── */
  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const prevH = containerRef.current?.scrollHeight ?? 0;
    const data = await fetchMessages(nextCursor);
    if (data) {
      setMessages((prev) => [...(data.messages ?? []), ...prev]);
      setHasMore(data.hasMore ?? false);
      setNextCursor(data.nextCursor ?? null);
      requestAnimationFrame(() => {
        if (containerRef.current)
          containerRef.current.scrollTop =
            containerRef.current.scrollHeight - prevH;
      });
    }
    setLoadingMore(false);
  };

  /* ── Delete message ── */
  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/v1/messages/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, isDeleted: true, content: null } : m
        )
      );
      send({
        type: "message_deleted",
        conversationId: conversation.id,
        messageId: id,
      });
    } else {
      toast.error("Failed to delete message");
    }
  };

  /* ── Message sent callback (from ChatInput) ── */
  const handleMessageSent = (msg: Message) => {
    setMessages((prev) => [...prev, msg]);
    send({ type: "new_message", conversationId: conversation.id, message: msg });
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  /* ── Typing ── */
  const handleTyping = () => {
    send({ type: "typing", conversationId: conversation.id });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      send({ type: "stop_typing", conversationId: conversation.id });
    }, 2000);
  };

  /* ── Date separator ── */
  const showDateSep = (msg: Message, prev: Message | null) =>
    !prev ||
    new Date(msg.createdAt).toDateString() !==
      new Date(prev.createdAt).toDateString();

  return (
    <div className="flex flex-col h-full bg-white">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white shrink-0">
        {/* Mobile back */}
        <button
          onClick={onBack}
          className="md:hidden w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors shrink-0"
        >
          <ArrowLeft size={18} className="text-gray-600" />
        </button>

        <Avatar name={convName} size={40} isGroup={isGroup} />

        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-gray-900 truncate leading-tight">
            {convName}
          </p>
          <p
            className={cn(
              "text-xs leading-tight",
              activeTyping.length > 0 ? "text-indigo-500 font-medium" : "text-gray-400"
            )}
          >
            {activeTyping.length > 0
              ? `${activeTyping.map((t) => t.username).join(", ")} typing…`
              : isGroup
              ? `${conversation.members.length} members`
              : "Active"}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          {!isGroup && otherUser && (
            <>
              <button
                onClick={() => onCallStart("audio", otherUser, conversation.id)}
                title="Voice call"
                className="w-9 h-9 rounded-xl bg-green-50 hover:bg-green-100 flex items-center justify-center transition-colors"
              >
                <Phone size={17} className="text-green-600" />
              </button>
              <button
                onClick={() => onCallStart("video", otherUser, conversation.id)}
                title="Video call"
                className="w-9 h-9 rounded-xl bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors"
              >
                <Video size={17} className="text-blue-600" />
              </button>
            </>
          )}
          {isGroup && (
            <button
              onClick={onOpenGroupInfo}
              title="Group info"
              className="w-9 h-9 rounded-xl bg-indigo-50 hover:bg-indigo-100 flex items-center justify-center transition-colors"
            >
              <Info size={17} className="text-indigo-600" />
            </button>
          )}
        </div>
      </div>

      {/* ── Messages ── */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-3 relative"
        style={{
          background: "linear-gradient(180deg, #f8f9ff 0%, #f1f4fb 100%)",
          backgroundImage: `radial-gradient(circle at 1px 1px, #e2e8f0 1px, transparent 0)`,
          backgroundSize: "24px 24px",
        }}
      >
        {/* Load older */}
        {hasMore && (
          <div className="flex justify-center pb-3">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="text-xs font-semibold text-indigo-600 hover:underline disabled:opacity-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 hover:border-indigo-200 transition-colors"
            >
              {loadingMore ? (
                <Loader2 size={12} className="animate-spin" />
              ) : null}
              {loadingMore ? "Loading…" : "Load older messages"}
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading ? (
          <div className="space-y-4 px-4 pt-2">
            {[1, 0, 1, 0, 1, 1].map((own, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-end gap-2 animate-pulse",
                  own ? "flex-row-reverse" : "flex-row"
                )}
              >
                {!own && <div className="w-7 h-7 rounded-full bg-gray-200 shrink-0" />}
                <div
                  className="h-9 rounded-2xl bg-gray-200"
                  style={{ width: [130, 190, 95, 210, 155, 120][i] }}
                />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full gap-3 py-16 text-gray-400">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <span className="text-3xl">👋</span>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700">
                Say hello to {convName}!
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                This is the start of your conversation
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-0.5">
            {messages.map((msg, idx) => {
              const prev = idx > 0 ? messages[idx - 1] : null;
              const next = idx < messages.length - 1 ? messages[idx + 1] : null;
              const showAvatar = !prev || prev.senderId !== msg.senderId;
              const isLastInGroup = !next || next.senderId !== msg.senderId;
              const newDay = showDateSep(msg, prev);

              return (
                <div key={msg.id}>
                  {/* Date separator */}
                  {newDay && (
                    <div className="flex items-center gap-3 px-4 py-4">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-3 py-1 rounded-full whitespace-nowrap">
                        {new Date(msg.createdAt).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                  )}
                  <MessageBubble
                    message={msg}
                    isOwn={msg.senderId === myId}
                    showAvatar={showAvatar}
                    isLastInGroup={isLastInGroup}
                    isGroupConv={isGroup}
                    onReply={setReplyTo}
                    onDelete={handleDelete}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Typing indicator */}
        {activeTyping.length > 0 && (
          <div className="flex items-end gap-2 px-4 mt-2 pl-11">
            <div className="flex gap-1 bg-gray-200 rounded-2xl rounded-bl-lg px-3 py-2.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2 h-2 rounded-full bg-gray-500 animate-bounce"
                  style={{ animationDelay: `${i * 160}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={endRef} />

        {/* Scroll to bottom button */}
        {showScrollDown && (
          <button
            onClick={() => endRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="absolute bottom-4 right-4 w-9 h-9 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ChevronDown size={17} className="text-gray-600" />
          </button>
        )}
      </div>

      {/* ── Input ── */}
      <ChatInput
        conversationId={conversation.id}
        replyTo={replyTo}
        onReplyCancel={() => setReplyTo(null)}
        onMessageSent={handleMessageSent}
        onTyping={handleTyping}
      />
    </div>
  );
}
