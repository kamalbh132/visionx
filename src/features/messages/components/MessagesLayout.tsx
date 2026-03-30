
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { MessageSquare } from "lucide-react";
import { Conversation, Message, UserInfo, Role } from "./types";
import { useWebSocket } from "@/core/hooks/useWebSocket";
import { ConversationList } from "./ConversationList";
import { ChatArea } from "./ChatArea";
import { CallOverlay } from "./CallOverlay";
import { NewDMModal } from "./NewDMModal";
import { CreateGroupModal } from "./CreateGroupModal";
import { GroupInfoModal } from "./GroupInfoModal";
import { cn } from "@/core/lib/utils";

type ActiveCall = {
  type: "audio" | "video";
  targetUser: UserInfo;
  conversationId: string;
};

type NewMessageEvent = {
  type: "new_message";
  conversationId: string;
  message: Message;
};

function isNewMessageEvent(msg: Record<string, unknown>): msg is NewMessageEvent {
  return (
    msg.type === "new_message" &&
    typeof msg.conversationId === "string" &&
    typeof msg.message === "object" &&
    msg.message !== null
  );
}

export function MessagesLayout({ myId }: { myId: string }) {
  const { data: session, status } = useSession();
  const myRole = (session?.user?.role ?? "USER") as Role;

  // Conversations
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);

  // Mobile view toggle
  const [mobileShowChat, setMobileShowChat] = useState(false);

  // Modals
  const [showNewDM, setShowNewDM] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  // Active call
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);

  const { addHandler, isConnected } = useWebSocket();

  /* ── Fetch conversations list ── */
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/conversations");
      if (res.ok) setConversations(await res.json());
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  /* ── Keep sidebar last-message preview up to date ── */
  useEffect(() => {
    const remove = addHandler((msg) => {
      if (isNewMessageEvent(msg)) {
        let foundConversation = false;
        setConversations((prev) =>
          prev
            .map((c) => {
              if (c.id !== msg.conversationId) return c;
              foundConversation = true;
              return { ...c, messages: [msg.message] };
            })
            .sort((a, b) => {
              const at = a.messages[0]?.createdAt ?? "";
              const bt = b.messages[0]?.createdAt ?? "";
              return bt > at ? 1 : -1;
            })
        );
        if (!foundConversation) {
          fetchConversations();
        }
      }
    });
    return remove;
  }, [addHandler, fetchConversations]);

  /* ── Derived ── */
  const activeConversation = conversations.find((c) => c.id === activeConvId) ?? null;

  /* ── Handlers ── */
  const handleSelectConv = (id: string) => {
    setActiveConvId(id);
    setMobileShowChat(true);
  };

  const handleConvCreated = (conv: Conversation) => {
    setConversations((prev) =>
      prev.find((c) => c.id === conv.id) ? prev : [conv, ...prev]
    );
    setActiveConvId(conv.id);
    setShowNewDM(false);
    setShowCreateGroup(false);
    setMobileShowChat(true);
  };

  const handleGroupUpdated = () => {
    fetchConversations(); // refresh member list in sidebar
  };

  const handleCallStart = (
    type: "audio" | "video",
    targetUser: UserInfo,
    conversationId: string
  ) => {
    setActiveCall({ type, targetUser, conversationId });
  };

  return (
    <>
      {/* ── Active call (full-screen overlay, chat stays alive underneath) ── */}
      {activeCall && (
        <CallOverlay
          type={activeCall.type}
          targetUser={activeCall.targetUser}
          conversationId={activeCall.conversationId}
          onEnd={() => setActiveCall(null)}
        />
      )}

      {/* ── Modals ── */}
      {showNewDM && (
        <NewDMModal
          onClose={() => setShowNewDM(false)}
          onCreated={handleConvCreated}
        />
      )}
      {showCreateGroup && (
        <CreateGroupModal
          myRole={myRole}
          onClose={() => setShowCreateGroup(false)}
          onCreated={handleConvCreated}
        />
      )}
      {showGroupInfo && activeConversation && (
        <GroupInfoModal
          conversation={activeConversation}
          myId={myId}
          myRole={myRole}
          onClose={() => setShowGroupInfo(false)}
          onUpdate={handleGroupUpdated}
        />
      )}

      {/* ── Main layout ── */}
      {/* ROOT: inline style height so every flex child gets a concrete size */}
      <div
        className="flex overflow-hidden bg-white border border-gray-200 rounded-2xl shadow-lg"
        style={{ height: "calc(100vh - 68px)" }}
      >
        {/* ── LEFT: Conversation list ── */}
        {/* SIDEBAR: 320px on desktop, full-width on mobile, hidden on mobile when chat open */}
        <div
          className={cn(
            "flex-col border-r border-gray-100 shrink-0 bg-white h-full",
            "md:flex md:w-[320px]",
            mobileShowChat ? "hidden" : "flex w-full"
          )}
        >
          <ConversationList
            conversations={conversations}
            activeId={activeConvId}
            myId={myId}
            loading={loadingConvs}
            onSelect={handleSelectConv}
            onNewDM={() => setShowNewDM(true)}
            onNewGroup={() => setShowCreateGroup(true)}
          />
        </div>

        {/* ── RIGHT: Chat area ── */}
        {/* CHAT COLUMN: always on desktop, shown on mobile only when chat active */}
        <div
          className={cn(
            "min-w-0 h-full flex-col",
            "md:flex flex-1",
            !mobileShowChat && !activeConvId ? "hidden" : "flex flex-1"
          )}
        >
          <div className="px-4 py-2 border-b border-gray-100 bg-white/90 backdrop-blur-sm">
            <span
              className={cn(
                "inline-flex items-center gap-2 text-[11px] font-semibold px-2.5 py-1 rounded-full",
                isConnected ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isConnected ? "bg-emerald-500" : "bg-amber-500"
                )}
              />
              {isConnected ? "Realtime connected" : "Reconnecting realtime..."}
            </span>
          </div>
          {activeConversation && myId ? (
            // This wrapper gives ChatArea a concrete height to fill
            <div className="h-full flex flex-col overflow-hidden">
            <ChatArea
              key={`${activeConvId}-${myId}`}
              conversation={activeConversation}
              myId={myId}
              onBack={() => setMobileShowChat(false)}
              onCallStart={handleCallStart}
              onOpenGroupInfo={() => setShowGroupInfo(true)}
            />
            </div>
          ) : (
            /* Empty placeholder */
            <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-gray-50">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
