import { getServerSession } from "next-auth"
import { authOptions } from "@/core/lib/auth"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) redirect("/auth/login")

  switch (session.user.role) {
    case "ADMIN":
      redirect("/dashboard/admin")
    case "STAFF":
      redirect("/dashboard/staff")
    case "CLIENT":
      redirect("/dashboard/client")
    default:
      redirect("/")
  }
}
