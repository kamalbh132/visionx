"use client";

import { useState } from "react";
import { Button } from "@/core/components/ui/button";
import { Plus } from "lucide-react";
import { CreateProjectModal } from "./CreateProjectModal";

interface ProjectsHeaderProps {
  onCreated?: () => void;
}

export function ProjectsHeader({ onCreated }: ProjectsHeaderProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Projects</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage and track your projects.</p>
      </div>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        New Project
      </Button>
      <CreateProjectModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={() => {
          setOpen(false);
          onCreated?.();
        }}
      />
    </div>
  );
}
