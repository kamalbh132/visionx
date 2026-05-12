"use client";

import { useState } from "react";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import { ChevronDown, ChevronUp, AlertTriangle, CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";

const statusColors: Record<string, string> = {
  TODO: "bg-slate-100 text-slate-600",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  REVIEW_SUPERADMIN: "bg-purple-100 text-purple-700",
  REVIEW_USER: "bg-orange-100 text-orange-700",
  COMPLETED: "bg-green-100 text-green-700",
};

const priorityColors: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-500",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-red-100 text-red-700",
};

const nextStatus: Record<string, string> = {
  TODO: "IN_PROGRESS",
  IN_PROGRESS: "REVIEW_SUPERADMIN",
  REVIEW_SUPERADMIN: "REVIEW_USER",
  REVIEW_USER: "COMPLETED",
};

interface TaskItemProps {
  task: any;
  myRole: string;
  myId: string;
}

export function TaskItem({ task, myRole, myId }: TaskItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const canAdvance =
    (myRole === "ADMIN" || myRole === "SUPERADMIN") &&
    task.status !== "COMPLETED" &&
    nextStatus[task.status];

  const handleAdvance = async () => {
    setLoading(true);
    try {
      await fetch(`/api/v1/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus[task.status] }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {task.isCritical && (
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="font-medium text-slate-900 truncate">{task.title}</p>
            {task.assignedTo && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Assigned to: {task.assignedTo.username}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              priorityColors[task.priority] ?? ""
            }`}
          >
            {task.priority}
          </span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              statusColors[task.status] ?? ""
            }`}
          >
            {task.status.replace(/_/g, " ")}
          </span>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-slate-400 hover:text-slate-600"
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="pl-6 space-y-3 pt-1">
          {task.description && (
            <p className="text-sm text-slate-600">{task.description}</p>
          )}
          {task.deadline && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              Deadline: {new Date(task.deadline).toLocaleDateString()}
            </p>
          )}

          {task.reviews?.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Reviews
              </p>
              {task.reviews.map((r: any) => (
                <div key={r.id} className="text-xs bg-slate-50 rounded p-2 border">
                  <span className="font-medium">{r.reviewer.username}:</span>{" "}
                  {r.comment}
                </div>
              ))}
            </div>
          )}

          {canAdvance && (
            <Button size="sm" onClick={handleAdvance} disabled={loading}>
              Move to {nextStatus[task.status]?.replace(/_/g, " ")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
