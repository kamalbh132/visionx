import { getServerSession } from "next-auth"
import { authOptions } from "@/core/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  // If logged in, go straight to dashboard
  if (session) {
    redirect("/dashboard")
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full text-center space-y-6 p-6">
        <h1 className="text-4xl font-bold">
          Welcome to <span className="text-primary">VisionX</span>
        </h1>

        <p className="text-muted-foreground">
          A modern platform to manage projects, users, and workflows — all in one place.
        </p>

        <div className="flex gap-4 justify-center">
          <Link
            href="/auth/login"
            className="px-6 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90"
          >
            Login
          </Link>

          <Link
            href="/auth/signup"
            className="px-6 py-2 rounded-md border font-medium hover:bg-muted"
          >
            Get Started
          </Link>
        </div>
      </div>
    </main>
  )
}
