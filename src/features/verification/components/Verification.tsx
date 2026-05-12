"use client";

import { useSession } from "next-auth/react";
import { ShieldAlert, RefreshCw, LogOut, CheckCircle2 } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/core/components/ui/card";
import { signOut } from "next-auth/react";
import { useState, useEffect } from "react"; // ADDED useEffect
import { toast } from "sonner";

export default function VerificationPending() {
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState(false);

  // ADDED: Automatic redirect if session shows verified (Fix for Google Login)
  useEffect(() => {
    if (session?.user?.isVerified) {
      const userRole = session.user.role;
      const defaultPath =
        userRole === "SUPERADMIN"
          ? "/superadmin/dashboard"
          : userRole === "ADMIN"
          ? "/admin/dashboard"
          : "/user/dashboard";
      
      window.location.href = defaultPath;
    }
  }, [session]);

  const handleCheckStatus = async () => {
    setLoading(true);
    try {
      const newSession = await update();
      
      if (newSession?.user?.isVerified) {
        toast.success("Account Verified! Access granted.");
        const userRole = newSession.user.role;
        const defaultPath =
          userRole === "SUPERADMIN"
            ? "/superadmin/dashboard"
            : userRole === "ADMIN"
            ? "/admin/dashboard"
            : "/user/dashboard";
            
        window.location.href = defaultPath;
      } else {
        toast.info("Verification still pending. Please wait for an admin.");
      }
    } catch (error) {
      toast.error("Error refreshing status.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="max-w-md w-full shadow-lg border-t-4 border-t-yellow-500">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="h-8 w-8 text-yellow-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Verification Pending</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Hi <span className="font-semibold text-slate-800">{session?.user?.username || "User"}</span>, your account is under review.
          </p>
          <div className="bg-slate-100 p-4 rounded-lg text-sm text-left border">
            Admin approval is required to access VisionX features.
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button className="w-full" onClick={handleCheckStatus} disabled={loading}>
            {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            Check Status
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => signOut({ callbackUrl: "/auth/login" })}>
            <LogOut className="mr-2 h-4 w-4" /> Log Out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}