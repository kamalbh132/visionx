export type Role = "SUPERADMIN" | "ADMIN" | "USER";

export type UserInfo = {
  id: string;
  username: string;
  email: string;
  role: Role;
};

export type MessageType = "TEXT" | "IMAGE" | "VIDEO" | "PDF" | "FILE" | "VOICE";

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  replyToId: string | null;
  replyTo: Message | null;
  sender: UserInfo;
};

export type ConvMember = {
  user: UserInfo;
  isAdmin: boolean;
  lastReadAt: string | null;
};

export type Conversation = {
  id: string;
  type: "DIRECT" | "GROUP";
  name: string | null;
  members: ConvMember[];
  messages: Message[];
};

// Role hierarchy helpers
export const ROLE_LEVEL: Record<Role, number> = {
  USER: 1,
  ADMIN: 2,
  SUPERADMIN: 3,
};

/** Roles that `myRole` can ADD to a group */
export function addableRoles(myRole: Role): Role[] {
  if (myRole === "SUPERADMIN") return ["SUPERADMIN", "ADMIN", "USER"];
  if (myRole === "ADMIN") return ["ADMIN", "USER"];
  return ["USER"];
}

/** Can `myRole` remove a member whose role is `targetRole`? */
export function canRemoveMember(myRole: Role, targetRole: Role, isMemberAdmin: boolean): boolean {
  if (myRole === "SUPERADMIN") return true; // can remove anyone
  if (myRole === "ADMIN") return targetRole === "USER"; // admin can only remove users
  return false; // users cannot remove
}

/** Can `myRole` create a group? */
export function canCreateGroup(myRole: Role): boolean {
  return myRole === "SUPERADMIN" || myRole === "ADMIN" || myRole === "USER";
}
