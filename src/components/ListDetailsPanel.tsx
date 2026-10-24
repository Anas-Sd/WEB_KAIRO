"use client";

import React from "react";
import { format } from "date-fns";
import {
  X,
  CheckCircle2,
  ListTodo,
  Layers,
  Clock,
  Edit2,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { TaskList } from "@/types";
import { renderListIcon } from "./ListIconPicker";

interface ListDetailsPanelProps {
  list: TaskList | null;
  isOpen: boolean;
  onClose: () => void;
  stats?: { total: number; completed: number };
  onOpenList?: (list: TaskList) => void;
  onEdit?: (list: TaskList) => void;
  onDelete?: (list: TaskList) => void;
}

export function ListDetailsPanel({
  list,
  isOpen,
  onClose,
  stats,
  onOpenList,
  onEdit,
  onDelete,
}: ListDetailsPanelProps) {
  if (!isOpen || !list) return null;

  const total = stats?.total || 0;
  const completed = stats?.completed || 0;
  const active = total - completed;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

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
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-white">List Details</span>
            {total > 0 && completed === total ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#68DBA9]/15 text-[#68DBA9] border border-[#68DBA9]/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>All Done</span>
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#C5C0FF]/15 text-[#C5C0FF] border border-[#C5C0FF]/30">
                {active} Active
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
          {/* List Title & Icon */}
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#5A45FF]/15 border border-[#5A45FF]/30 flex items-center justify-center text-[#C5C0FF] shrink-0">
              {renderListIcon(list.iconName || "list", "w-6 h-6")}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white leading-snug">
                {list.name}
              </h3>
              <div className="text-xs text-[#918EA2] mt-0.5">
                {total === 0 ? "Empty list" : `${completed} of ${total} tasks completed`}
              </div>
            </div>
          </div>

          {/* Progress Overview Card */}
          <div className="p-4 bg-[#111114] border border-[#1C1C20] rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#E3E1EC]">
                <Layers className="w-3.5 h-3.5 text-[#C5C0FF]" />
                <span>Completion Status</span>
              </div>
              <span className="text-sm font-bold text-[#C5C0FF]">{percentage}%</span>
            </div>

            <div className="w-full h-2 bg-[#1C1C20] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#5A45FF] to-[#68DBA9] transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 text-center border-t border-[#1C1C20]">
              <div className="p-2 rounded-lg bg-[#161619]">
                <div className="text-[10px] text-[#918EA2] uppercase font-bold tracking-wider">Total</div>
                <div className="text-sm font-bold text-white mt-0.5">{total}</div>
              </div>
              <div className="p-2 rounded-lg bg-[#161619]">
                <div className="text-[10px] text-[#918EA2] uppercase font-bold tracking-wider">Active</div>
                <div className="text-sm font-bold text-[#C5C0FF] mt-0.5">{active}</div>
              </div>
              <div className="p-2 rounded-lg bg-[#161619]">
                <div className="text-[10px] text-[#918EA2] uppercase font-bold tracking-wider">Completed</div>
                <div className="text-sm font-bold text-[#68DBA9] mt-0.5">{completed}</div>
              </div>
            </div>
          </div>

          {/* Activity & Timestamps */}
          <div className="p-4 bg-[#111114] border border-[#1C1C20] rounded-xl space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#918EA2] uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-[#C5C0FF]" />
              <span>Timestamps & Info</span>
            </div>

            <div className="space-y-2 text-xs divide-y divide-[#1C1C20]">
              <div className="flex items-center justify-between pt-1">
                <span className="text-[#918EA2]">Created At</span>
                <span className="text-[#E3E1EC] font-medium">{formatTimestamp(list.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[#918EA2]">Last Updated</span>
                <span className="text-[#E3E1EC] font-medium">{formatTimestamp(list.updatedAt)}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[#918EA2]">Display Position</span>
                <span className="text-[#E3E1EC] font-medium">#{list.position + 1}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#1C1C20] bg-[#0C0C0F] shrink-0 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {onOpenList && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenList(list);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#5A45FF] hover:bg-[#5A45FF]/90 text-white transition-colors"
              >
                <span>Open List</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(list);
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
                  onDelete(list);
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
