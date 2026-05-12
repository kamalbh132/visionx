
import Link from "next/link";
import { Button } from "@/core/components/ui/button";
import { Briefcase, Shield, Zap } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/core/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-6 h-16 flex items-center border-b">
        <span className="font-bold text-2xl text-primary">VisionX</span>
        <nav className="ml-auto flex gap-4">
          <Link href="/auth/login"><Button variant="ghost">Login</Button></Link>
          <Link href="/auth/signup"><Button>Get Started</Button></Link>
        </nav>
      </header>

      <main className="flex-1">
        <section className="py-20 text-center space-y-6">
          <h1 className="text-6xl font-extrabold tracking-tighter">
            Total Visibility into <span className="text-primary">Every Project.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Manage staff, track progress, and handle billing in one centralized platform 
            built for transparency and speed.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/auth/signup">
              <Button size="lg" className="h-12 px-8 text-lg">Get Started</Button>
            </Link>
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-8 px-10 py-20 bg-muted/30">
          <div className="p-6 bg-background rounded-xl border shadow-sm space-y-3">
            <Shield className="text-primary h-10 w-10" />
            <h3 className="text-xl font-bold">Secure Access</h3>
            <p className="text-muted-foreground">Role-based permissions for Admins, Staff, and Clients.</p>
          </div>
          <div className="p-6 bg-background rounded-xl border shadow-sm space-y-3">
            <Zap className="text-primary h-10 w-10" />
            <h3 className="text-xl font-bold">Real-time Updates</h3>
            <p className="text-muted-foreground">Instantly see project status changes and verification updates.</p>
          </div>
          <div className="p-6 bg-background rounded-xl border shadow-sm space-y-3">
            <Briefcase className="text-primary h-10 w-10" />
            <h3 className="text-xl font-bold">Project Central</h3>
            <p className="text-muted-foreground">Manage everything from initial signup to final invoice.</p>
          </div>
        </section>
      </main>
    </div>
  );
}