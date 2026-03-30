import { Conversation, Role, UserInfo } from "./types";

export function getConvName(conv: Conversation, myId: string): string {
  if (conv.type === "GROUP") return conv.name || "Group";
  const other = conv.members.find((m) => m.user.id !== myId);
  return other?.user.username || "Unknown";
}

export function getOtherUser(conv: Conversation, myId: string): UserInfo | null {
  if (conv.type === "GROUP") return null;
  return conv.members.find((m) => m.user.id !== myId)?.user ?? null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function formatRecSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

const AVATAR_COLORS = [
  "#4f7fe0", "#e0506b", "#3eaa82", "#e0884a",
  "#8b5cf6", "#0ea5e9", "#d97706", "#059669",
  "#dc2626", "#7c3aed",
];

export function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) & 0x7fffffff;
  }
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}