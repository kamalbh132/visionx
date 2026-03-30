import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Button } from "@/core/components/ui/button";
import { 
  ShieldCheck, 
  Server, 
  Users, 
  AlertTriangle, 
  Activity, 
  Database,
  Lock
} from "lucide-react";
import Link from "next/link";

export default function SuperAdminDashboard() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheck className="text-red-600" /> System Overview
          </h1>
          <p className="text-muted-foreground">
            Global monitoring and high-level administration controls.
          </p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800">
             <AlertTriangle size={16} className="mr-2" /> Maintenance Mode
           </Button>
           <Button>
             System Settings
           </Button>
        </div>
      </div>

      {/* System Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-slate-900 text-white shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-200">Total Users</CardTitle>
            <Users className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">2,543</div>
            <p className="text-xs text-slate-400 mt-1">Across all roles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Server Uptime</CardTitle>
            <Server className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">99.9%</div>
            <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database Load</CardTitle>
            <Database className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">42%</div>
            <p className="text-xs text-muted-foreground mt-1">124 active connections</p>
          </CardContent>
        </Card>

        <Card className="border-red-100 bg-red-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-800">Critical Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">3</div>
            <p className="text-xs text-red-700 mt-1">Requires immediate review</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* System Logs */}
        <Card className="col-span-2 shadow-md">
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <Activity size={18} /> Recent System Activity
             </CardTitle>
             <CardDescription>Real-time log of administrative actions.</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between text-sm border-b pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">10:4{i} AM</span>
                      <div>
                        <p className="font-medium text-slate-800">User Role Updated</p>
                        <p className="text-xs text-slate-500">Admin_01 changed User_X to ADMIN</p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">IP: 192.168.1.{i}</span>
                  </div>
                ))}
             </div>
           </CardContent>
        </Card>

        {/* Quick Admin Management */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock size={18} /> Admin Access
            </CardTitle>
            <CardDescription>Manage privileged accounts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
               <div className="flex items-center gap-3">
                 <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
                   SA
                 </div>
                 <div>
                   <p className="text-sm font-medium">Super Admin</p>
                   <p className="text-xs text-muted-foreground">Root Access</p>
                 </div>
               </div>
               <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
             </div>

             <div className="flex items-center justify-between p-3 border rounded-lg">
               <div className="flex items-center gap-3">
                 <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                   AD
                 </div>
                 <div>
                   <p className="text-sm font-medium">System Admin</p>
                   <p className="text-xs text-muted-foreground">Manage Users</p>
                 </div>
               </div>
               <Button variant="ghost" size="sm" className="h-8">Manage</Button>
             </div>
             
             <Button className="w-full mt-2" variant="outline">View All Admins</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}