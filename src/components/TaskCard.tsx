"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Bell,
  Repeat,
  Folder,
  Moon,
  CornerDownRight,
  GripVertical,
  MoreVertical,
  Info,
  CalendarCheck,
  Edit2,
  PlusCircle,
  FolderTree,
  Trash2,
  Check,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Task } from "@/types";
import { formatRemainingTime } from "@/lib/dateUtils";

interface TaskCardProps {
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
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

export function TaskCard({
  task,
  isOverdue = false,
  hasSubtasks,
  subtaskProgress,
  parentTitle,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
  onToggleCompletion,
  onDrillDown,
  onNavigateToParent,
  onShowDetails,
  onEditTask,
  onAddSubtask,
  onAdjustParent,
  onDeleteTask,
  onReactivateForToday,
  dragHandleProps,
}: TaskCardProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSelectionMode && onToggleSelect) {
      onToggleSelect();
      return;
    }
    setIsAnimating(true);
    setTimeout(() => {
      onToggleCompletion();
      setIsAnimating(false);
    }, 280);
  };

  const handleCardClick = () => {
    if (isSelectionMode && onToggleSelect) {
      onToggleSelect();
      return;
    }
    if (hasSubtasks && onDrillDown) {
      onDrillDown();
    } else {
      onShowDetails();
    }
  };

  // Snooze status
  const now = Date.now();
  const isSnoozed = !!(task.snoozeUntilMillis && task.snoozeUntilMillis > now && !task.isCompleted);
  const snoozeCountdown = isSnoozed ? formatRemainingTime(task.snoozeUntilMillis!, now) : null;

  return (
    <div
      onClick={handleCardClick}
      className={`group relative flex items-start gap-3 p-3.5 rounded-2xl bg-[#161619] transition-all duration-200 cursor-pointer ${
        isOverdue && !task.isCompleted
          ? "border border-[#FFB4AB]/35 hover:border-[#FFB4AB]/60"
          : isSelected
          ? "border border-[#C5C0FF] bg-[#1C1C20]"
          : "border border-[#474556]/20 hover:border-[#474556]/50"
      }`}
    >
      {/* Drag handle or Selection checkbox */}
      {isSelectionMode ? (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect?.();
          }}
          className={`w-5 h-5 mt-0.5 rounded-md flex items-center justify-center border transition-colors ${
            isSelected
              ? "bg-[#5A45FF] border-[#5A45FF] text-white"
              : "border-[#918EA2] bg-transparent"
          }`}
        >
          {isSelected && <Check className="w-3.5 h-3.5" />}
        </div>
      ) : (
        <button
          type="button"
          {...dragHandleProps}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab active:cursor-grabbing text-[#918EA2] hover:text-white p-0.5 -ml-1 mt-0.5 opacity-60 hover:opacity-100 transition-opacity"
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      )}

      {/* Squircle Checkbox */}
      {!isSelectionMode && (
        <motion.button
          type="button"
          onClick={handleCheckboxClick}
          animate={isAnimating ? { scale: [1, 1.35, 0.88, 1] } : { scale: 1 }}
          transition={{ duration: 0.28, ease: "easeInOut" }}
          className={`shrink-0 w-6 h-6 mt-0.5 rounded-[10px] flex items-center justify-center border transition-all duration-200 ${
            task.isCompleted
              ? "bg-[#5A45FF] border-[#5A45FF] shadow-sm shadow-[#5A45FF]/30"
              : "bg-transparent border-white/45 hover:border-white/80"
          }`}
        >
          {task.isCompleted && <Check className="w-4 h-4 text-white stroke-[2.5]" />}
        </motion.button>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0 pr-1">
        {/* Title */}
        <p
          className={`text-sm font-medium transition-all duration-200 truncate ${
            task.isCompleted
              ? "line-through text-[#C8C4D9]/55 font-normal"
              : "text-white"
          }`}
        >
          {task.title}
        </p>

        {/* Notes preview if any */}
        {task.notes && (
          <p className="text-xs text-[#918EA2] line-clamp-1 mt-0.5">
            {task.notes}
          </p>
        )}

        {/* Capsules */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {/* Due date capsule */}
          {task.dueDate && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                isOverdue && !task.isCompleted
                  ? "bg-[#93000A]/30 text-[#FFB4AB] border border-[#93000A]"
                  : "bg-[#111114] text-[#C8C4D9] border border-[#1C1C20]"
              }`}
            >
              <Calendar className="w-3 h-3 text-[#918EA2]" />
              <span>{task.dueDate}</span>
            </span>
          )}

          {/* Time capsule */}
          {task.dueTime && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#111114] text-[#C8C4D9] border border-[#1C1C20]">
              <Clock className="w-3 h-3 text-[#918EA2]" />
              <span>{task.dueTime}</span>
            </span>
          )}

          {/* Alarm indicator */}
          {task.alarmToneTitle && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] bg-[#111114] text-[#C5C0FF] border border-[#1C1C20]"
              title={`Tone: ${task.alarmToneTitle}`}
            >
              <Bell className="w-3 h-3 text-[#C5C0FF]" />
            </span>
          )}

          {/* Repeat indicator */}
          {task.repeatType && task.repeatType !== "NONE" && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-[#5A45FF]/10 text-[#C5C0FF] border border-[#5A45FF]/30 font-medium"
              title={`Repeats: ${task.repeatType}`}
            >
              <Repeat className="w-3 h-3" />
              <span>Repeats</span>
            </span>
          )}

          {/* Subtask progress capsule */}
          {hasSubtasks && subtaskProgress && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDrillDown?.();
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#1C1C20] hover:bg-[#252529] text-[#E3E1EC] border border-[#474556]/40"
            >
              <Folder className="w-3 h-3 text-[#C5C0FF]" />
              <span>{subtaskProgress.done}/{subtaskProgress.total} done</span>
            </button>
          )}

          {/* Snoozed capsule */}
          {isSnoozed && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#FFB77D]/15 text-[#FFB77D] border border-[#FFB77D]/30">
              <Moon className="w-3 h-3" />
              <span>Snoozed • {snoozeCountdown ? `in ${snoozeCountdown}` : "Active"}</span>
            </span>
          )}

          {/* Parent link during search */}
          {parentTitle && onNavigateToParent && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNavigateToParent();
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#111114] hover:bg-[#1C1C20] text-[#918EA2] hover:text-[#E3E1EC] border border-[#1C1C20]"
            >
              <CornerDownRight className="w-3 h-3" />
              <span>↳ {parentTitle}</span>
            </button>
          )}
        </div>
      </div>

      {/* 3-dots Menu */}
      <div className="shrink-0">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded-lg text-[#918EA2] hover:text-white hover:bg-[#1C1C20] transition-colors"
              title="Task options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={4}
              onClick={(e) => e.stopPropagation()}
              className="z-50 min-w-[180px] bg-[#1C1C20] border border-[#474556]/40 rounded-xl p-1 shadow-2xl animate-in fade-in-80"
            >
              <DropdownMenu.Item
                onClick={onShowDetails}
                className="flex items-center gap-2 px-3 py-2 text-xs text-[#E3E1EC] hover:bg-[#252529] hover:text-[#C5C0FF] rounded-lg cursor-pointer outline-none"
              >
                <Info className="w-4 h-4 text-[#918EA2]" />
                <span>Details</span>
              </DropdownMenu.Item>

              {onReactivateForToday && (
                <DropdownMenu.Item
                  onClick={onReactivateForToday}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-[#60A5FA] hover:bg-[#252529] rounded-lg cursor-pointer outline-none font-medium"
                >
                  <CalendarCheck className="w-4 h-4 text-[#60A5FA]" />
                  <span>Reactivate for Today</span>
                </DropdownMenu.Item>
              )}

              <DropdownMenu.Item
                onClick={onEditTask}
                className="flex items-center gap-2 px-3 py-2 text-xs text-[#E3E1EC] hover:bg-[#252529] hover:text-[#C5C0FF] rounded-lg cursor-pointer outline-none"
              >
                <Edit2 className="w-4 h-4 text-[#918EA2]" />
                <span>Edit</span>
              </DropdownMenu.Item>

              <DropdownMenu.Item
                onClick={onAddSubtask}
                className="flex items-center gap-2 px-3 py-2 text-xs text-[#E3E1EC] hover:bg-[#252529] hover:text-[#C5C0FF] rounded-lg cursor-pointer outline-none"
              >
                <PlusCircle className="w-4 h-4 text-[#918EA2]" />
                <span>Add subtask</span>
              </DropdownMenu.Item>

              <DropdownMenu.Item
                onClick={onAdjustParent}
                className="flex items-center gap-2 px-3 py-2 text-xs text-[#E3E1EC] hover:bg-[#252529] hover:text-[#C5C0FF] rounded-lg cursor-pointer outline-none"
              >
                <FolderTree className="w-4 h-4 text-[#918EA2]" />
                <span>Adjust parent</span>
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="h-px bg-[#252529] my-1" />

              <DropdownMenu.Item
                onClick={onDeleteTask}
                className="flex items-center gap-2 px-3 py-2 text-xs text-[#FFB4AB] hover:bg-[#93000A]/30 rounded-lg cursor-pointer outline-none font-medium"
              >
                <Trash2 className="w-4 h-4 text-[#FFB4AB]" />
                <span>Delete</span>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </div>
  );
}
