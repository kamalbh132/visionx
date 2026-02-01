import { getServerSession } from "next-auth"
import { authOptions } from "@/core/lib/auth"
import { redirect } from "next/navigation"

export default async function StaffDashboard() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "STAFF") {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Staff Dashboard</h2>

      <div className="p-4 rounded-xl border bg-background">
        <p className="text-sm text-muted-foreground">Assigned Projects</p>
        <p className="text-lg font-semibold">
          Track progress & communicate with clients
        </p>
      </div>
    </div>
  )
}
