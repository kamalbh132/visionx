import { Session } from "next-auth"
export function hasRole(
  session: Session | null,
  roles: Array<"SUPERADMIN" | "ADMIN" | "USER">
) {
  if (!session?.user?.role) return false
  return roles.includes(session.user.role as any)
}
