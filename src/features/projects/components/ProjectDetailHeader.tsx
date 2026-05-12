"use client";

import { useState } from "react";
import { Button } from "@/core/components/ui/button";
import { Plus } from "lucide-react";
import { CreateTaskModal } from "./CreateTaskModal";

interface ProjectDetailHeaderProps {
  projectId: string;
  myRole: string;
  myId: string;
}

export function ProjectDetailHeader({ projectId, myRole, myId }: ProjectDetailHeaderProps) {
  const [open, setOpen] = useState(false);

  const canCreate = myRole === "ADMIN" || myRole === "SUPERADMIN";

  return (
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-semibold text-slate-900">Tasks</h2>
      {canCreate && (
        <>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Task
          </Button>
          <CreateTaskModal
            open={open}
            projectId={projectId}
            myRole={myRole}
            onClose={() => setOpen(false)}
            onCreated={() => setOpen(false)}
          />
        </>
      )}
    </div>
  );
}
