"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskCard } from "./TaskCard";
import { Task } from "@/types";

interface SortableTaskCardProps {
  task: Task;
  isOverdue?: boolean;
  hasSubtasks: boolean;
  subtaskProgress?: { done: number; total: number };
  parentTitle?: string | null;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onToggleCompletion: () => void;
  onDrillDown?: () => void;
  onNavigateToParent?: () => void;
  onShowDetails: () => void;
  onEditTask: () => void;
  onAddSubtask: () => void;
  onAdjustParent: () => void;
  onDeleteTask: () => void;
  onReactivateForToday?: () => void;
}

export function SortableTaskCard(props: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.task.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}
