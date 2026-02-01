import { getServerSession } from "next-auth"
import { authOptions } from "@/core/lib/auth"
import { redirect } from "next/navigation"

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Admin Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border bg-background">
          <p className="text-sm text-muted-foreground">Users</p>
          <p className="text-xl font-semibold">Manage Staff & Clients</p>
        </div>

        <div className="p-4 rounded-xl border bg-background">
          <p className="text-sm text-muted-foreground">Projects</p>
          <p className="text-xl font-semibold">Create & Assign</p>
        </div>

        <div className="p-4 rounded-xl border bg-background">
          <p className="text-sm text-muted-foreground">Invoices</p>
          <p className="text-xl font-semibold">Payments & Billing</p>
        </div>
      </div>
    </div>
  )
}
