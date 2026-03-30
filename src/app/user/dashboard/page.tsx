import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Button } from "@/core/components/ui/button";
import { Briefcase, CheckSquare, Clock, ArrowRight, FileText, Star } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/core/lib/auth";

export default async function UserDashboard() {
  const session = await getServerSession(authOptions);
  const username = session?.user?.username || "User";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Welcome back, {username} 
          </h1>
          <p className="text-muted-foreground">
            Here is what's happening with your projects today.
          </p>
        </div>
        <div className="flex gap-2">
          <Button>
            <span className="mr-2">+</span> New Project
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm border-l-4 border-l-primary hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Projects</CardTitle>
            <Briefcase className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
            <p className="text-xs text-muted-foreground">2 active, 2 completed</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-orange-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">3 due today</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours Logged</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">34.5</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Active Projects List */}
        <Card className="col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle>Active Projects</CardTitle>
            <CardDescription>Your currently ongoing work.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Project Item 1 */}
              <div className="flex items-center justify-between border p-4 rounded-lg bg-white">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <Briefcase size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Website Redesign</h4>
                    <p className="text-xs text-muted-foreground">Due in 3 days</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-1 rounded-full">On Track</span>
                  <Button variant="ghost" size="icon">
                    <ArrowRight size={16} />
                  </Button>
                </div>
              </div>

              {/* Project Item 2 */}
              <div className="flex items-center justify-between border p-4 rounded-lg bg-white">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Mobile App API</h4>
                    <p className="text-xs text-muted-foreground">Due in 1 week</p>
                  </div>
                </div>
                 <div className="flex items-center gap-4">
                  <span className="text-xs font-medium bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Review</span>
                  <Button variant="ghost" size="icon">
                    <ArrowRight size={16} />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions / Notifications */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 text-sm border-b pb-3 last:border-0">
              <div className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
              <div>
                <p className="font-medium">Admin approved your request</p>
                <p className="text-xs text-muted-foreground">2 hours ago</p>
              </div>
            </div>
             <div className="flex items-start gap-3 text-sm border-b pb-3 last:border-0">
              <div className="mt-1 h-2 w-2 rounded-full bg-orange-500" />
              <div>
                <p className="font-medium">New comment on "API Docs"</p>
                <p className="text-xs text-muted-foreground">5 hours ago</p>
              </div>
            </div>
            
            <Button variant="outline" className="w-full mt-2">View All</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}