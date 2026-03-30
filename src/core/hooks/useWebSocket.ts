"use client";

import { useEffect, useCallback, useState } from "react";
import { useSession } from "next-auth/react";

type WSMessage = Record<string, unknown>;
type WSHandler = (msg: WSMessage) => void;
type ConnectionListener = (connected: boolean) => void;
type OutboundMessage = WSMessage & { type?: string; conversationId?: string };

// Singleton state (module-level, survives re-renders)
let _ws: WebSocket | null = null;
const _handlers = new Set<WSHandler>();
const _connectionListeners = new Set<ConnectionListener>();
let _token: string | null = null;
let _connecting = false;
let _tokenPromise: Promise<string | null> | null = null;
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null;

const _pendingMessages: string[] = [];
const _joinedConversationIds = new Set<string>();

const QUEUEABLE_TYPES = new Set([
  "new_message",
  "message_deleted",
  "join_conversation",
  "leave_conversation",
]);

function emitConnectionState(connected: boolean) {
  _connectionListeners.forEach((listener) => listener(connected));
}

function enqueue(rawMessage: string) {
  if (_pendingMessages.length >= 100) _pendingMessages.shift();
  _pendingMessages.push(rawMessage);
}

function scheduleReconnect() {
  if (_reconnectTimer || !_token) return;
  _reconnectTimer = setTimeout(() => {
    _reconnectTimer = null;
    if (_token) connect(_token);
  }, 3000);
}

function flushAfterOpen() {
  if (_ws?.readyState !== WebSocket.OPEN) return;

  _joinedConversationIds.forEach((conversationId) => {
    _ws?.send(
      JSON.stringify({ type: "join_conversation", conversationId })
    );
  });

  while (_pendingMessages.length > 0 && _ws?.readyState === WebSocket.OPEN) {
    const next = _pendingMessages.shift();
    if (next) _ws.send(next);
  }
}

function getSessionToken() {
  if (_token) return Promise.resolve(_token);
  if (_tokenPromise) return _tokenPromise;

  _tokenPromise = fetch("/api/auth/session-token")
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      _token = d?.token ?? null;
      return _token;
    })
    .catch(() => null)
    .finally(() => {
      _tokenPromise = null;
    });

  return _tokenPromise;
}

function connect(token: string) {
  if (_connecting || (_ws && _ws.readyState <= WebSocket.OPEN)) return;
  if (_reconnectTimer) {
    clearTimeout(_reconnectTimer);
    _reconnectTimer = null;
  }

  _token = token;
  _connecting = true;
  const url = `${process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001"}?token=${encodeURIComponent(token)}`;
  _ws = new WebSocket(url);

  _ws.onopen = () => {
    _connecting = false;
    emitConnectionState(true);
    flushAfterOpen();
  };

  _ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      _handlers.forEach((h) => h(msg));
    } catch { /* ignore bad JSON */ }
  };

  _ws.onclose = () => {
    _ws = null;
    _connecting = false;
    emitConnectionState(false);
    scheduleReconnect();
  };

  _ws.onerror = () => {
    _ws?.close();
  };
}

export function useWebSocket() {
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(
    _ws?.readyState === WebSocket.OPEN
  );

  useEffect(() => {
    if (!session?.user?.id) return;

    let mounted = true;
    const listener: ConnectionListener = (connected) => {
      if (mounted) setIsConnected(connected);
    };
    _connectionListeners.add(listener);

    getSessionToken().then((token) => {
      if (mounted && token) connect(token);
    });

    return () => {
      mounted = false;
      _connectionListeners.delete(listener);
    };
  }, [session?.user?.id]);

  const send = useCallback((msg: OutboundMessage) => {
    if (msg.type === "join_conversation" && typeof msg.conversationId === "string") {
      _joinedConversationIds.add(msg.conversationId);
    }
    if (msg.type === "leave_conversation" && typeof msg.conversationId === "string") {
      _joinedConversationIds.delete(msg.conversationId);
    }

    const raw = JSON.stringify(msg);
    if (_ws?.readyState === WebSocket.OPEN) {
      _ws.send(raw);
      return;
    }

    if (typeof msg.type === "string" && QUEUEABLE_TYPES.has(msg.type)) {
      enqueue(raw);
    }

    if (_token) {
      connect(_token);
    }
  }, []);

  const addHandler = useCallback((handler: WSHandler) => {
    _handlers.add(handler);
    return () => { _handlers.delete(handler); };
  }, []);

  return { send, addHandler, isConnected };
}
