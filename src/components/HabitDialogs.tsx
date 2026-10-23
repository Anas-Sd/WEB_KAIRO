"use client";

import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Trash2, Download } from "lucide-react";
import { Habit, HabitLog } from "@/types";
import { calculateHabitStreak, isDayComplete } from "@/store/useHabitStore";

// ==========================================
// DELETE HABIT DIALOG
// ==========================================

interface DeleteHabitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habit: Habit | null;
  onConfirm: () => Promise<void>;
}

export function DeleteHabitDialog({
  open,
  onOpenChange,
  habit,
  onConfirm,
}: DeleteHabitDialogProps) {
  const [deleting, setDeleting] = useState(false);
  if (!habit) return null;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-[#0C0C0F] border border-[#1C1C20] rounded-2xl p-6 shadow-2xl focus:outline-none">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-[#93000A]/20 border border-[#93000A]/40 text-[#FFB4AB]">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <Dialog.Title className="text-base font-bold text-white">
                Delete Habit
              </Dialog.Title>
              <span className="text-xs text-[#918EA2] line-clamp-1">{habit.title}</span>
            </div>
          </div>

          <p className="text-xs text-[#C8C4D9] mb-5">
            Are you sure you want to delete this habit and all its logged history? This cannot be undone.
          </p>

          <div className="space-y-2">
            <button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              className="w-full py-2.5 text-xs font-semibold rounded-xl bg-[#EF4444] hover:bg-[#EF4444]/90 text-white transition-colors"
            >
              {deleting ? "Deleting..." : "Permanently Delete Habit"}
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-full py-2 text-xs text-[#918EA2] hover:text-white"
            >
              Cancel
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ==========================================
// EXPORT HABITS DIALOG
// ==========================================

interface ExportHabitsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habits: Habit[];
  logs: Map<string, Map<string, HabitLog>>;
}

export function ExportHabitsDialog({
  open,
  onOpenChange,
  habits,
  logs,
}: ExportHabitsDialogProps) {
  const [formatType, setFormatType] = useState<"CSV" | "TEXT">("CSV");

  const handleExport = () => {
    let content = "";
    let mimeType = "text/plain";
    let fileName = `kairo_habits_${Date.now()}`;

    if (formatType === "CSV") {
      const headers = ["Title", "Type", "Streak", "Done Count", "Missed Count", "Adherence Rate"];
      const rows = habits.map((h) => {
        const hLogs = logs.get(h.id);
        const { currentStreak } = calculateHabitStreak(h, hLogs || new Map());
        let done = 0;
        let missed = 0;
        hLogs?.forEach((l) => {
          if (isDayComplete(h, l)) done++;
          else if (l.state === "MISSED") missed++;
        });
        const total = done + missed;
        const adherence = total > 0 ? `${Math.round((done / total) * 100)}%` : "0%";
        return [
          `"${h.title.replace(/"/g, '""')}"`,
          h.type,
          currentStreak,
          done,
          missed,
          adherence,
        ];
      });
      content = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      mimeType = "text/csv";
      fileName += ".csv";
    } else {
      content = habits
        .map((h) => {
          const hLogs = logs.get(h.id);
          const { currentStreak } = calculateHabitStreak(h, hLogs || new Map());
          let done = 0;
          let missed = 0;
          hLogs?.forEach((l) => {
            if (isDayComplete(h, l)) done++;
            else if (l.state === "MISSED") missed++;
          });
          const total = done + missed;
          const adherence = total > 0 ? `${Math.round((done / total) * 100)}%` : "0%";
          return `• ${h.title} (${h.type}) | Streak: ${currentStreak} | Done: ${done} | Missed: ${missed} | Adherence: ${adherence}`;
        })
        .join("\n");
      mimeType = "text/plain";
      fileName += ".txt";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-[#0C0C0F] border border-[#1C1C20] rounded-2xl p-6 shadow-2xl focus:outline-none">
          <div className="flex items-center justify-between pb-3 border-b border-[#1C1C20]">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-[#C5C0FF]" />
              <Dialog.Title className="text-base font-bold text-white">
                Export Habits
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="p-1 rounded-lg text-[#918EA2] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-4 my-4">
            <span className="text-xs text-[#918EA2] block">
              Export summary for {habits.length} habits:
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormatType("CSV")}
                className={`py-2 text-xs font-semibold rounded-xl border transition-colors ${
                  formatType === "CSV"
                    ? "bg-[#5A45FF] border-[#5A45FF] text-white"
                    : "bg-[#161619] border-[#1C1C20] text-[#918EA2] hover:text-white"
                }`}
              >
                CSV Table
              </button>
              <button
                type="button"
                onClick={() => setFormatType("TEXT")}
                className={`py-2 text-xs font-semibold rounded-xl border transition-colors ${
                  formatType === "TEXT"
                    ? "bg-[#5A45FF] border-[#5A45FF] text-white"
                    : "bg-[#161619] border-[#1C1C20] text-[#918EA2] hover:text-white"
                }`}
              >
                Plain Text
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1C1C20]">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-3.5 py-1.5 text-xs text-[#918EA2] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="px-4 py-1.5 rounded-xl bg-[#5A45FF] hover:bg-[#5A45FF]/90 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
