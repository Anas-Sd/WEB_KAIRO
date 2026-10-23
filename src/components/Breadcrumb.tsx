"use client";

import React from "react";
import { ArrowLeft, ChevronRight, Home } from "lucide-react";
import { Task } from "@/types";

interface BreadcrumbProps {
  currentParentId: string | null;
  allTasks: Task[];
  onSelectCrumb: (parentId: string | null) => void;
}

export function Breadcrumb({
  currentParentId,
  allTasks,
  onSelectCrumb,
}: BreadcrumbProps) {
  if (!currentParentId) return null;

  // Build trail of tasks up to root
  const byId = new Map(allTasks.map((t) => [t.id, t]));
  const trail: Task[] = [];
  let curr = byId.get(currentParentId);
  const visited = new Set<string>();

  while (curr && !visited.has(curr.id)) {
    visited.add(curr.id);
    trail.unshift(curr);
    curr = curr.parentId ? byId.get(curr.parentId) : undefined;
  }

  const handleBack = () => {
    if (trail.length <= 1) {
      onSelectCrumb(null);
    } else {
      const prev = trail[trail.length - 2];
      onSelectCrumb(prev.id);
    }
  };

  return (
    <div className="flex items-center gap-2 py-2 px-1 text-xs text-[#918EA2] overflow-x-auto mb-3">
      <button
        type="button"
        onClick={handleBack}
        className="p-1 rounded-lg text-[#C5C0FF] hover:bg-[#161619] transition-colors flex items-center gap-1 shrink-0 font-medium"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back</span>
      </button>

      <div className="h-3.5 w-px bg-[#252529] shrink-0" />

      <button
        type="button"
        onClick={() => onSelectCrumb(null)}
        className="hover:text-white transition-colors shrink-0 flex items-center gap-1"
      >
        <Home className="w-3 h-3" />
        <span>Tasks</span>
      </button>

      {trail.map((crumb, idx) => {
        const isLast = idx === trail.length - 1;
        return (
          <React.Fragment key={crumb.id}>
            <ChevronRight className="w-3 h-3 text-[#474556] shrink-0" />
            <button
              type="button"
              disabled={isLast}
              onClick={() => onSelectCrumb(crumb.id)}
              className={`shrink-0 truncate max-w-[150px] transition-colors ${
                isLast
                  ? "text-white font-semibold cursor-default"
                  : "text-[#918EA2] hover:text-white"
              }`}
            >
              {crumb.title}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}
