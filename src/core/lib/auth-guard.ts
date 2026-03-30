// Centralized auth helper — replaces repeated getServerSession calls
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { NextResponse } from "next/server";

export type AuthUser = {
  id: string;
  role: string;
  username: string | null;
  isVerified: boolean;
};

type GuardResult =
  | { user: AuthUser; error: null }
  | { user: null; error: NextResponse };

export async function requireAuth(
  allowedRoles?: string[]
): Promise<GuardResult> {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user?.id) {
    return {
      user: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return {
      user: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return {
    user: {
      id: user.id,
      role: user.role,
      username: user.username ?? null,
      isVerified: user.isVerified ?? false,
    },
    error: null,
  };
}
