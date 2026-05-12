import Link from "next/link";
import { Badge } from "@/core/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { Progress } from "@/core/components/ui/progress";
import { CalendarDays, CheckCircle2, ListTodo } from "lucide-react";

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  COMPLETED: "bg-blue-100 text-blue-700",
  ON_HOLD: "bg-yellow-100 text-yellow-700",
};

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    description?: string | null;
    status: string;
    dueDate?: string | null;
    _count?: { tasks: number };
  };
}

export function ProjectCard({ project }: ProjectCardProps) {
  const taskCount = project._count?.tasks ?? 0;

  return (
    <Link href={`/user/projects/${project.id}`}>
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer border hover:border-primary/30">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-semibold text-slate-900 line-clamp-1">
              {project.name}
            </CardTitle>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
                statusColors[project.status] ?? "bg-slate-100 text-slate-600"
              }`}
            >
              {project.status.replace("_", " ")}
            </span>
          </div>
          {project.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {project.description}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <ListTodo className="h-3.5 w-3.5" />
              {taskCount} task{taskCount !== 1 ? "s" : ""}
            </span>
            {project.dueDate && (
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {new Date(project.dueDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
