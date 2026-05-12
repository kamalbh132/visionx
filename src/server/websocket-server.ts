import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { parse } from "url";
import jwt from "jsonwebtoken";
import prisma from "../core/lib/prisma";

const PORT = parseInt(process.env.WS_PORT || "3001");

interface Client {
  ws: WebSocket;
  userId: string;
  username: string;
  conversationIds: Set<string>;
}

type IncomingWsMessage = {
  type?: string;
  conversationId?: string;
  message?: unknown;
  messageId?: string;
  targetUserId?: string;
  offer?: unknown;
  answer?: unknown;
  candidate?: unknown;
  callType?: "audio" | "video";
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function isConversationMember(conversationId: string, userId: string) {
  const member = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    select: { id: true },
  });
  return !!member;
}

const clients = new Map<string, Set<Client>>();

const wss = new WebSocketServer({ port: PORT });

function broadcast(conversationId: string, data: object, excludeUserId?: string) {
  const message = JSON.stringify(data);
  clients.forEach((userClients, userId) => {
    if (userId === excludeUserId) return;
    userClients.forEach((client) => {
      if (
        client.conversationIds.has(conversationId) &&
        client.ws.readyState === WebSocket.OPEN
      ) {
        client.ws.send(message);
      }
    });
  });
}

function broadcastToUser(userId: string, data: object) {
  const userClients = clients.get(userId);
  if (!userClients) return;

  const payload = JSON.stringify(data);
  userClients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  });
}

function registerClient(client: Client) {
  const userClients = clients.get(client.userId) ?? new Set<Client>();
  userClients.add(client);
  clients.set(client.userId, userClients);
}

function unregisterClient(client: Client) {
  const userClients = clients.get(client.userId);
  if (!userClients) return;
  userClients.delete(client);
  if (userClients.size === 0) clients.delete(client.userId);
}

wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
  const { query } = parse(req.url || "", true);
  const token = query.token as string;

  if (!token) {
    ws.close(1008, "No token");
    return;
  }

  let payload: string | jwt.JwtPayload;
  try {
    payload = jwt.verify(token, process.env.NEXTAUTH_SECRET!);
  } catch {
    ws.close(1008, "Invalid token");
    return;
  }

  const parsedPayload = typeof payload === "string" ? {} : payload;
  const userId =
    parsedPayload.sub ||
    (parsedPayload as jwt.JwtPayload & { id?: string }).id ||
    (parsedPayload as jwt.JwtPayload & { userId?: string }).userId;
  const username =
    (parsedPayload as jwt.JwtPayload & { username?: string }).username ||
    parsedPayload.name ||
    "User";

  if (!userId) {
    ws.close(1008, "Invalid token payload");
    return;
  }

  const client: Client = { ws, userId, username, conversationIds: new Set() };
  registerClient(client);
  console.log(`[WS] Connected: ${username} (${userId})`);

  ws.send(JSON.stringify({ type: "connected", userId }));

  ws.on("message", async (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as IncomingWsMessage;

      switch (msg.type) {
        case "join_conversation": {
          const conversationId = asString(msg.conversationId);
          if (!conversationId) break;

          const allowed = await isConversationMember(conversationId, userId);
          if (!allowed) {
            ws.send(
              JSON.stringify({
                type: "error",
                code: "NOT_CONVERSATION_MEMBER",
                conversationId,
              })
            );
            break;
          }
          client.conversationIds.add(conversationId);
          ws.send(JSON.stringify({ type: "joined", conversationId }));
          break;
        }

        case "leave_conversation": {
          const conversationId = asString(msg.conversationId);
          if (!conversationId) break;
          client.conversationIds.delete(conversationId);
          break;
        }

        case "new_message": {
          const conversationId = asString(msg.conversationId);
          if (!conversationId) break;
          if (!client.conversationIds.has(conversationId)) break;
          broadcast(conversationId, {
            type: "new_message",
            message: msg.message,
            conversationId,
          });
          break;
        }

        case "typing": {
          const conversationId = asString(msg.conversationId);
          if (!conversationId) break;
          if (!client.conversationIds.has(conversationId)) break;
          broadcast(
            conversationId,
            { type: "typing", userId, username, conversationId },
            userId
          );
          break;
        }

        case "stop_typing": {
          const conversationId = asString(msg.conversationId);
          if (!conversationId) break;
          if (!client.conversationIds.has(conversationId)) break;
          broadcast(
            conversationId,
            { type: "stop_typing", userId, conversationId },
            userId
          );
          break;
        }

        case "message_deleted": {
          const conversationId = asString(msg.conversationId);
          if (!conversationId) break;
          if (!client.conversationIds.has(conversationId)) break;
          broadcast(conversationId, {
            type: "message_deleted",
            messageId: msg.messageId,
            conversationId,
          });
          break;
        }

        case "webrtc_offer": {
          const targetUserId = asString(msg.targetUserId);
          if (!targetUserId) break;
          broadcastToUser(targetUserId, {
            type: "webrtc_offer",
            offer: msg.offer,
            fromUserId: userId,
            fromUsername: username,
            conversationId: msg.conversationId,
          });
          break;
        }

        case "webrtc_answer": {
          const targetUserId = asString(msg.targetUserId);
          if (!targetUserId) break;
          broadcastToUser(targetUserId, {
            type: "webrtc_answer",
            answer: msg.answer,
            fromUserId: userId,
          });
          break;
        }

        case "webrtc_ice_candidate": {
          const targetUserId = asString(msg.targetUserId);
          if (!targetUserId) break;
          broadcastToUser(targetUserId, {
            type: "webrtc_ice_candidate",
            candidate: msg.candidate,
            fromUserId: userId,
          });
          break;
        }

        case "webrtc_call_end": {
          const targetUserId = asString(msg.targetUserId);
          if (!targetUserId) break;
          broadcastToUser(targetUserId, {
            type: "webrtc_call_end",
            fromUserId: userId,
          });
          break;
        }
      }
    } catch (e) {
      console.error("[WS] Parse error:", e);
    }
  });

  ws.on("close", () => {
    unregisterClient(client);
    console.log(`[WS] Disconnected: ${username}`);
  });
});

console.log(`[WS] Server running on ws://localhost:${PORT}`);
