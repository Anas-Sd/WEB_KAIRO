"use client";

import React from "react";
import { format } from "date-fns";
import {
  X,
  CheckCircle2,
  Calendar,
  Clock,
  Layers,
  FileText,
  CornerDownRight,
  Edit2,
  Trash2,
  ListTodo,
} from "lucide-react";
import { ListItem } from "@/types";
import { renderListIcon } from "./ListIconPicker";

interface ListItemDetailsPanelProps {
  item: ListItem | null;
  isOpen: boolean;
  onClose: () => void;
  listName?: string;
  parentTitle?: string | null;
  subtaskStats?: { total: number; completed: number };
  onEdit?: (item: ListItem) => void;
  onDelete?: (item: ListItem) => void;
}

export function ListItemDetailsPanel({
  item,
  isOpen,
  onClose,
  listName,
  parentTitle,
  subtaskStats,
  onEdit,
  onDelete,
}: ListItemDetailsPanelProps) {
  if (!isOpen || !item) return null;

  const totalSubs = subtaskStats?.total || 0;
  const completedSubs = subtaskStats?.completed || 0;
  const subPercent = totalSubs > 0 ? Math.round((completedSubs / totalSubs) * 100) : 0;

  const formatTimestamp = (millis: number) => {
    try {
      return format(new Date(millis), "MMM d, yyyy 'at' h:mm a");
    } catch {
      return "Unknown";
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      {/* Slide panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-[#0C0C0F] border-l border-[#1C1C20] shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1C1C20] shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-base font-bold text-white">Item Details</span>
            {item.isCompleted ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#68DBA9]/15 text-[#68DBA9] border border-[#68DBA9]/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Completed</span>
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#C5C0FF]/15 text-[#C5C0FF] border border-[#C5C0FF]/30">
                Active
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#918EA2] hover:text-white hover:bg-[#161619] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Title & Icon */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#161619] border border-[#1C1C20] flex items-center justify-center text-[#C5C0FF] shrink-0 mt-0.5">
              {renderListIcon(item.iconName || "list", "w-5 h-5")}
            </div>
            <div className="flex-1">
              <h3 className={`text-base font-bold text-white leading-snug ${item.isCompleted ? "line-through text-[#918EA2]" : ""}`}>
                {item.title}
              </h3>
              {listName && (
                <div className="inline-flex items-center gap-1 text-xs text-[#918EA2] mt-1 bg-[#161619] px-2 py-0.5 rounded-md border border-[#1C1C20]">
                  <ListTodo className="w-3 h-3 text-[#C5C0FF]" />
                  <span>{listName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Parent Item Hierarchy (if nested subtask) */}
          {parentTitle && (
            <div className="p-3 bg-[#111114] border border-[#1C1C20] rounded-xl flex items-center gap-2">
              <CornerDownRight className="w-4 h-4 text-[#C5C0FF] shrink-0" />
              <div className="truncate">
                <div className="text-[10px] uppercase font-bold tracking-wider text-[#918EA2]">
                  Parent Task
                </div>
                <div className="text-xs font-semibold text-[#E3E1EC] truncate">
                  {parentTitle}
                </div>
              </div>
            </div>
          )}

          {/* Subtask Progress (if has child items) */}
          {totalSubs > 0 && (
            <div className="p-4 bg-[#111114] border border-[#1C1C20] rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-[#E3E1EC]">
                  <Layers className="w-3.5 h-3.5 text-[#C5C0FF]" />
                  <span>Subtasks Progress</span>
                </div>
                <span className="font-bold text-[#C5C0FF]">
                  {completedSubs}/{totalSubs} ({subPercent}%)
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#1C1C20] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#5A45FF] to-[#68DBA9] transition-all duration-300"
                  style={{ width: `${subPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Target Date */}
          {item.targetDate && (
            <div className="p-3 bg-[#111114] border border-[#1C1C20] rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#C5C0FF]/10 flex items-center justify-center text-[#C5C0FF] shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-[#918EA2]">
                  Target Date
                </div>
                <div className="text-sm font-semibold text-white">
                  {item.targetDate}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {item.notes && (
            <div className="p-4 bg-[#111114] border border-[#1C1C20] rounded-xl space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#918EA2] uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5 text-[#918EA2]" />
                <span>Notes</span>
              </div>
              <p className="text-xs text-[#E3E1EC] whitespace-pre-wrap leading-relaxed">
                {item.notes}
              </p>
            </div>
          )}

          {/* Activity & Timestamps */}
          <div className="p-4 bg-[#111114] border border-[#1C1C20] rounded-xl space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#918EA2] uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-[#C5C0FF]" />
              <span>Activity & Timestamps</span>
            </div>

            <div className="space-y-2 text-xs divide-y divide-[#1C1C20]">
              <div className="flex items-center justify-between pt-1">
                <span className="text-[#918EA2]">Created At</span>
                <span className="text-[#E3E1EC] font-medium">{formatTimestamp(item.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[#918EA2]">Last Updated</span>
                <span className="text-[#E3E1EC] font-medium">{formatTimestamp(item.updatedAt)}</span>
              </div>
              {item.isCompleted && item.completedAt && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[#918EA2]">Completed At</span>
                  <span className="text-[#68DBA9] font-medium">{formatTimestamp(item.completedAt)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2">
                <span className="text-[#918EA2]">Position Order</span>
                <span className="text-[#E3E1EC] font-medium">#{item.position + 1}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#1C1C20] bg-[#0C0C0F] shrink-0 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(item);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#161619] border border-[#1C1C20] hover:border-[#474556] text-[#E3E1EC] hover:text-white transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5 text-[#C5C0FF]" />
                <span>Edit</span>
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDelete(item);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#EF4444]/10 border border-[#EF4444]/30 hover:bg-[#EF4444]/20 text-[#EF4444] transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#1C1C20] hover:bg-[#252529] text-xs font-semibold text-[#E3E1EC] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
