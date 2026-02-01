import { getServerSession } from "next-auth"
import { authOptions } from "@/core/lib/auth"
import { redirect } from "next/navigation"

export default async function ClientDashboard() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== "CLIENT") {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Client Dashboard</h2>

      <div className="p-4 rounded-xl border bg-background">
        <p className="text-sm text-muted-foreground">Your Projects</p>
        <p className="text-lg font-semibold">
          View status, files & feedback
        </p>
      </div>

      <div className="p-4 rounded-xl border bg-background">
        <p className="text-sm text-muted-foreground">Invoices</p>
        <p className="text-lg font-semibold">
          View & pay invoices securely
        </p>
      </div>
    </div>
  )
}
