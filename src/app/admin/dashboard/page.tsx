// src/app/admin/dashboard/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Users, Briefcase, Activity, TrendingUp, CheckCircle2, Clock } from "lucide-react";
import prisma from "@/core/lib/prisma";

// You can make this async to fetch real data
export default async function AdminDashboard() {
  
  // Example: Fetch real counts (uncomment when DB is ready)
  // const userCount = await prisma.user.count();
  // const verifiedCount = await prisma.user.count({ where: { isVerified: true }});
  
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-muted-foreground">Overview of system performance and user activity.</p>
        </div>
        <div className="flex items-center gap-2">
           <span className="text-sm text-muted-foreground bg-white px-3 py-1 rounded-md border shadow-sm">
             Last updated: Just now
           </span>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Briefcase className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
            <p className="text-xs text-muted-foreground">5 completed this week</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98%</div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
             <div className="h-50 flex items-center justify-center text-muted-foreground bg-slate-50 rounded-md border border-dashed">
                Chart Placeholder
             </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3 shadow-sm">
          <CardHeader>
            <CardTitle>Recent Signups</CardTitle>
            <CardDescription>
              Users waiting for verification.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Mock Data Loop */}
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center space-x-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold uppercase">
                      U{i}
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">user{i+1}.dev</p>
                      <p className="text-xs text-muted-foreground">user{i+1}@example.com</p>
                    </div>
                  </div>
                  <div className="text-xs font-medium text-yellow-600 bg-yellow-100 px-2 py-1 rounded">Pending</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}