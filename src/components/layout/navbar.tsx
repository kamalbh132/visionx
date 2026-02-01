import { getServerSession } from "next-auth"
import { authOptions } from "@/core/lib/auth"
import Link from "next/link"
import UserMenu from "./user-menu"


export default async function Navbar() {
  const session = await getServerSession(authOptions)

  return (
    <header className="h-14 border-b bg-background flex items-center px-6">
      {/* LEFT — LOGO */}
      <div className="flex items-center gap-2 font-bold text-lg">
        <span className="text-primary">Vision</span>
        <span>X</span>
      </div>

      {/* CENTER — NAV LINKS */}
      <nav className="flex-1 flex justify-center gap-6 text-sm font-medium">
        <Link href="/dashboard" className="hover:text-primary">
          Dashboard
        </Link>

        {session?.user.role === "ADMIN" && (
          <Link href="/dashboard/admin" className="hover:text-primary">
            Admin
          </Link>
        )}

        <Link href="/projects" className="hover:text-primary">
          Projects
        </Link>

        <Link href="/invoices" className="hover:text-primary">
          Invoices
        </Link>
      </nav>

      {/* RIGHT — USER MENU */}
      <div className="flex items-center">
        {session && <UserMenu user={session.user} />}
      </div>
    </header>
  )
}
