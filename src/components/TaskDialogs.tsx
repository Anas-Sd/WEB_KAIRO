"use client";

import React, { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, FolderTree, Trash2, Download, AlertTriangle, Check, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { Task, Priority } from "@/types";
import { getDescendantIds, SortOption } from "@/store/useTaskStore";

// ==========================================
// ADJUST PARENT DIALOG
// ==========================================

interface AdjustParentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  allTasks: Task[];
  onConfirm: (newParentId: string | null, moveSubtasks: boolean) => Promise<void>;
}

export function AdjustParentDialog({
  open,
  onOpenChange,
  task,
  allTasks,
  onConfirm,
}: AdjustParentDialogProps) {
  const [selectedParentId, setSelectedParentId] = useState<string | null>(task?.parentId || null);
  const [moveSubtasks, setMoveSubtasks] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!task) return null;

  const forbiddenIds = new Set<string>([task.id, ...Array.from(getDescendantIds(task.id, allTasks))]);
  const availableParents = allTasks.filter((t) => !forbiddenIds.has(t.id));

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(selectedParentId, moveSubtasks);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md max-h-[85vh] flex flex-col bg-[#0C0C0F] border border-[#1C1C20] rounded-2xl p-6 shadow-2xl focus:outline-none">
          <div className="flex items-center justify-between pb-3 border-b border-[#1C1C20]">
            <div className="flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-[#C5C0FF]" />
              <Dialog.Title className="text-base font-bold text-white">
                Adjust Parent Task
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

          <p className="text-xs text-[#918EA2] mt-3">
            Choose a new parent for <strong className="text-white">"{task.title}"</strong>:
          </p>

          {/* List of potential parents */}
          <div className="flex-1 overflow-y-auto space-y-1.5 my-3 max-h-[300px] pr-1">
            {/* Root Option */}
            <div
              onClick={() => setSelectedParentId(null)}
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                selectedParentId === null
                  ? "bg-[#C5C0FF]/15 border-[#C5C0FF] text-white font-medium"
                  : "bg-[#161619] border-[#1C1C20] text-[#C8C4D9] hover:border-[#474556]"
              }`}
            >
              <span className="text-xs font-semibold">📁 (None - Root Level Task)</span>
              {selectedParentId === null && <Check className="w-4 h-4 text-[#C5C0FF]" />}
            </div>

            {availableParents.map((p) => {
              const isSelected = selectedParentId === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedParentId(p.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-[#C5C0FF]/15 border-[#C5C0FF] text-white font-medium"
                      : "bg-[#161619] border-[#1C1C20] text-[#C8C4D9] hover:border-[#474556]"
                  }`}
                >
                  <span className="text-xs truncate">{p.title}</span>
                  {isSelected && <Check className="w-4 h-4 text-[#C5C0FF] shrink-0 ml-2" />}
                </div>
              );
            })}
          </div>

          {/* Checkbox: Move subtasks too */}
          <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-[#1C1C20]">
            <input
              type="checkbox"
              checked={moveSubtasks}
              onChange={(e) => setMoveSubtasks(e.target.checked)}
              className="w-4 h-4 rounded text-[#5A45FF] bg-[#161619] border-[#474556] focus:ring-0"
            />
            <span className="text-xs text-[#E3E1EC]">Move existing subtasks too</span>
          </label>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-[#1C1C20]">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-3.5 py-1.5 text-xs text-[#918EA2] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSave}
              className="px-4 py-1.5 rounded-xl bg-[#5A45FF] hover:bg-[#5A45FF]/90 text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Updating..." : "Save Parent"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ==========================================
// DELETE CONFIRMATION DIALOG
// ==========================================

interface DeleteTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  hasSubtasks: boolean;
  onConfirm: (cascade: boolean) => Promise<void>;
}

export function DeleteTaskDialog({
  open,
  onOpenChange,
  task,
  hasSubtasks,
  onConfirm,
}: DeleteTaskDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!task) return null;

  const handleDelete = async (cascade: boolean) => {
    setIsDeleting(true);
    try {
      await onConfirm(cascade);
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
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
                Delete Task
              </Dialog.Title>
              <span className="text-xs text-[#918EA2] line-clamp-1">{task.title}</span>
            </div>
          </div>

          <p className="text-xs text-[#C8C4D9] mb-5">
            {hasSubtasks
              ? "This task contains subtasks. How would you like to handle them?"
              : "Are you sure you want to delete this task? This action can be undone immediately via the Undo bar."}
          </p>

          <div className="space-y-2">
            {hasSubtasks ? (
              <>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleDelete(false)}
                  className="w-full py-2.5 px-3 text-xs font-semibold rounded-xl bg-[#161619] hover:bg-[#1C1C20] border border-[#1C1C20] text-white text-left flex items-center justify-between transition-colors"
                >
                  <span>Delete only this task</span>
                  <span className="text-[10px] text-[#918EA2]">(keep subtasks)</span>
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleDelete(true)}
                  className="w-full py-2.5 px-3 text-xs font-semibold rounded-xl bg-[#93000A]/20 hover:bg-[#93000A]/35 border border-[#93000A]/40 text-[#FFB4AB] text-left flex items-center justify-between transition-colors"
                >
                  <span>Delete task and all subtasks</span>
                  <span className="text-[10px] text-[#FFB4AB]/80">(cascade delete)</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => handleDelete(false)}
                className="w-full py-2.5 text-xs font-semibold rounded-xl bg-[#EF4444] hover:bg-[#EF4444]/90 text-white transition-colors"
              >
                {isDeleting ? "Deleting..." : "Delete Task"}
              </button>
            )}

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
// EXPORT TASKS DIALOG
// ==========================================

interface ExportTasksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tasks: Task[];
  filteredTasks: Task[];
}

export function ExportTasksDialog({
  open,
  onOpenChange,
  tasks,
  filteredTasks,
}: ExportTasksDialogProps) {
  const [scope, setScope] = useState<"ALL" | "FILTERED">("ALL");
  const [formatType, setFormatType] = useState<"CSV" | "JSON" | "TEXT">("CSV");

  const handleExport = () => {
    const listToExport = scope === "ALL" ? tasks : filteredTasks;
    let content = "";
    let mimeType = "text/plain";
    let fileName = `kairo_tasks_${Date.now()}`;

    if (formatType === "JSON") {
      content = JSON.stringify(listToExport, null, 2);
      mimeType = "application/json";
      fileName += ".json";
    } else if (formatType === "CSV") {
      const headers = ["Title", "Status", "Due Date", "Due Time", "Notes", "Priority", "Section"];
      const rows = listToExport.map((t) => [
        `"${t.title.replace(/"/g, '""')}"`,
        t.isCompleted ? "Completed" : "Active",
        `"${t.dueDate || ""}"`,
        `"${t.dueTime || ""}"`,
        `"${(t.notes || "").replace(/"/g, '""')}"`,
        t.priority,
        t.section,
      ]);
      content = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      mimeType = "text/csv";
      fileName += ".csv";
    } else {
      // Plain text
      content = listToExport
        .map(
          (t) =>
            `• [${t.isCompleted ? "X" : " "}] ${t.title} | Due: ${t.dueDate} ${t.dueTime || ""}${
              t.notes ? `\n  Notes: ${t.notes}` : ""
            }`
        )
        .join("\n\n");
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
                Export Tasks
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
            {/* Scope */}
            <div>
              <label className="text-xs font-semibold text-[#918EA2] block mb-1.5 uppercase tracking-wider">
                Export Scope
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScope("ALL")}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-colors ${
                    scope === "ALL"
                      ? "bg-[#C5C0FF]/15 border-[#C5C0FF] text-[#C5C0FF]"
                      : "bg-[#161619] border-[#1C1C20] text-[#918EA2] hover:text-white"
                  }`}
                >
                  All Tasks ({tasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setScope("FILTERED")}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-colors ${
                    scope === "FILTERED"
                      ? "bg-[#C5C0FF]/15 border-[#C5C0FF] text-[#C5C0FF]"
                      : "bg-[#161619] border-[#1C1C20] text-[#918EA2] hover:text-white"
                  }`}
                >
                  Filtered ({filteredTasks.length})
                </button>
              </div>
            </div>

            {/* Format */}
            <div>
              <label className="text-xs font-semibold text-[#918EA2] block mb-1.5 uppercase tracking-wider">
                File Format
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["CSV", "JSON", "TEXT"] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setFormatType(fmt)}
                    className={`py-2 text-xs font-semibold rounded-xl border transition-colors ${
                      formatType === fmt
                        ? "bg-[#5A45FF] border-[#5A45FF] text-white"
                        : "bg-[#161619] border-[#1C1C20] text-[#918EA2] hover:text-white"
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
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

// ==========================================
// FILTER TASKS DIALOG (MODAL)
// ==========================================

export interface TaskFilterCriteria {
  status?: ("ACTIVE" | "COMPLETED")[];
  priority?: Priority[];
  dueDatePreset?: "ALL" | "TODAY" | "TOMORROW" | "RANGE";
  startDate?: string;
  endDate?: string;
}

interface FilterTasksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filter: TaskFilterCriteria;
  onApplyFilter: (filter: TaskFilterCriteria) => void;
  onResetFilters: () => void;
}

export function FilterTasksDialog({
  open,
  onOpenChange,
  filter,
  onApplyFilter,
  onResetFilters,
}: FilterTasksDialogProps) {
  const [tempStatus, setTempStatus] = useState<("ACTIVE" | "COMPLETED")[]>(filter.status || []);
  const [tempPriority, setTempPriority] = useState<Priority[]>(filter.priority || []);
  const [tempDatePreset, setTempDatePreset] = useState<"ALL" | "TODAY" | "TOMORROW" | "RANGE">(
    filter.dueDatePreset || "ALL"
  );
  const [tempStartDate, setTempStartDate] = useState(filter.startDate || "");
  const [tempEndDate, setTempEndDate] = useState(filter.endDate || "");

  useEffect(() => {
    if (open) {
      setTempStatus(filter.status || []);
      setTempPriority(filter.priority || []);
      setTempDatePreset(filter.dueDatePreset || "ALL");
      setTempStartDate(filter.startDate || "");
      setTempEndDate(filter.endDate || "");
    }
  }, [open, filter]);

  const toggleStatus = (s: "ACTIVE" | "COMPLETED") => {
    setTempStatus((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const togglePriority = (p: Priority) => {
    setTempPriority((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handleApply = () => {
    onApplyFilter({
      status: tempStatus,
      priority: tempPriority,
      dueDatePreset: tempDatePreset,
      startDate: tempDatePreset === "RANGE" ? tempStartDate : undefined,
      endDate: tempDatePreset === "RANGE" ? tempEndDate : undefined,
    });
    onOpenChange(false);
  };

  const handleReset = () => {
    onResetFilters();
    onOpenChange(false);
  };

  const hasActiveFilters =
    tempStatus.length > 0 ||
    tempPriority.length > 0 ||
    (tempDatePreset && tempDatePreset !== "ALL") ||
    !!tempStartDate ||
    !!tempEndDate;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-[#0C0C0F] border border-[#1C1C20] rounded-2xl p-6 shadow-2xl focus:outline-none max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#1C1C20]">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-[#C5C0FF]" />
              <Dialog.Title className="text-base font-bold text-white">
                Filter Tasks
              </Dialog.Title>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-semibold text-[#C5C0FF] hover:underline px-2 py-1"
              >
                Reset
              </button>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="p-1 rounded-lg text-[#918EA2] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          <div className="space-y-5 my-4">
            {/* 1. STATUS SECTION */}
            <div>
              <label className="text-[11px] font-semibold text-[#918EA2] uppercase tracking-wider block mb-2">
                Status
              </label>
              <div className="flex items-center gap-2">
                {(["ACTIVE", "COMPLETED"] as const).map((st) => {
                  const isSel = tempStatus.includes(st);
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => toggleStatus(st)}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                        isSel
                          ? "bg-[#5A45FF] border-[#5A45FF] text-white shadow-lg shadow-[#5A45FF]/20"
                          : "bg-[#161619] border-[#1C1C20] text-[#918EA2] hover:text-white hover:border-[#474556]"
                      }`}
                    >
                      {isSel && <Check className="w-3.5 h-3.5 text-white" />}
                      <span>{st === "ACTIVE" ? "Active" : "Completed"}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. PRIORITY SECTION */}
            <div>
              <label className="text-[11px] font-semibold text-[#918EA2] uppercase tracking-wider block mb-2">
                Priority
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(["LOW", "MEDIUM", "HIGH", "URGENT"] as const).map((pr) => {
                  const isSel = tempPriority.includes(pr);
                  const colorClass =
                    pr === "LOW"
                      ? "text-[#68DBA9] border-[#68DBA9]/40 bg-[#68DBA9]/10"
                      : pr === "MEDIUM"
                      ? "text-[#C5C0FF] border-[#C5C0FF]/40 bg-[#C5C0FF]/10"
                      : pr === "HIGH"
                      ? "text-[#FFB77D] border-[#FFB77D]/40 bg-[#FFB77D]/10"
                      : "text-[#EF4444] border-[#EF4444]/40 bg-[#EF4444]/10";

                  return (
                    <button
                      key={pr}
                      type="button"
                      onClick={() => togglePriority(pr)}
                      className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                        isSel
                          ? `${colorClass} ring-1 ring-white/30 font-bold`
                          : "bg-[#161619] border-[#1C1C20] text-[#918EA2] hover:text-white hover:border-[#474556]"
                      }`}
                    >
                      {pr === "LOW" ? "Low" : pr === "MEDIUM" ? "Med" : pr === "HIGH" ? "High" : "Urgent"}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. DUE DATE SECTION */}
            <div>
              <label className="text-[11px] font-semibold text-[#918EA2] uppercase tracking-wider block mb-2">
                Due Date
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["ALL", "TODAY", "TOMORROW", "RANGE"] as const).map((p) => {
                  const isSel = tempDatePreset === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setTempDatePreset(p)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center ${
                        isSel
                          ? "bg-[#5A45FF] border-[#5A45FF] text-white shadow-lg shadow-[#5A45FF]/20"
                          : "bg-[#161619] border-[#1C1C20] text-[#918EA2] hover:text-white hover:border-[#474556]"
                      }`}
                    >
                      {p === "ALL"
                        ? "Any Date"
                        : p === "TODAY"
                        ? "Today"
                        : p === "TOMORROW"
                        ? "Tomorrow"
                        : "Custom Range"}
                    </button>
                  );
                })}
              </div>

              {tempDatePreset === "RANGE" && (
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#1C1C20]">
                  <div>
                    <span className="text-[10px] text-[#918EA2] block mb-1">Start Date</span>
                    <input
                      type="date"
                      value={tempStartDate}
                      onChange={(e) => setTempStartDate(e.target.value)}
                      className="w-full bg-[#161619] border border-[#252529] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#C5C0FF]"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#918EA2] block mb-1">End Date</span>
                    <input
                      type="date"
                      value={tempEndDate}
                      onChange={(e) => setTempEndDate(e.target.value)}
                      className="w-full bg-[#161619] border border-[#252529] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#C5C0FF]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#1C1C20]">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-xs text-[#918EA2] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 rounded-xl bg-[#5A45FF] hover:bg-[#5A45FF]/90 text-white text-xs font-bold transition-all shadow-lg shadow-[#5A45FF]/25"
            >
              Apply Filters
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ==========================================
// SORT TASKS DIALOG (MODAL)
// ==========================================

interface SortTasksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sort: SortOption;
  onApplySort: (sort: SortOption) => void;
}

export function SortTasksDialog({
  open,
  onOpenChange,
  sort,
  onApplySort,
}: SortTasksDialogProps) {
  const [selectedSort, setSelectedSort] = useState<SortOption>(sort);

  useEffect(() => {
    if (open) {
      setSelectedSort(sort);
    }
  }, [open, sort]);

  const sortOptions: { key: SortOption; label: string; desc: string }[] = [
    {
      key: "DUE_DATE_ASC",
      label: "Due Date: Earliest First",
      desc: "Upcoming deadlines first",
    },
    {
      key: "DUE_DATE_DESC",
      label: "Due Date: Latest First",
      desc: "Later deadlines first",
    },
    {
      key: "PRIORITY_DESC",
      label: "Priority: Highest First",
      desc: "Urgent → High → Medium → Low",
    },
    {
      key: "PRIORITY_ASC",
      label: "Priority: Lowest First",
      desc: "Low → Medium → High → Urgent",
    },
    {
      key: "ALPHA_ASC",
      label: "Alphabetical: A-Z",
      desc: "Sort task titles alphabetically",
    },
    {
      key: "ALPHA_DESC",
      label: "Alphabetical: Z-A",
      desc: "Sort task titles in reverse order",
    },
  ];

  const handleApply = (opt?: SortOption) => {
    const toApply = opt || selectedSort;
    onApplySort(toApply);
    onOpenChange(false);
  };

  const handleReset = () => {
    onApplySort("DUE_DATE_ASC");
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-[#0C0C0F] border border-[#1C1C20] rounded-2xl p-6 shadow-2xl focus:outline-none">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#1C1C20]">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-5 h-5 text-[#C5C0FF]" />
              <Dialog.Title className="text-base font-bold text-white">
                Sort Tasks
              </Dialog.Title>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-semibold text-[#C5C0FF] hover:underline px-2 py-1"
              >
                Reset
              </button>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="p-1 rounded-lg text-[#918EA2] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>
          </div>

          {/* Sort options list */}
          <div className="space-y-2 my-4">
            {sortOptions.map((opt) => {
              const isSel = selectedSort === opt.key;
              return (
                <div
                  key={opt.key}
                  onClick={() => {
                    setSelectedSort(opt.key);
                    handleApply(opt.key);
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    isSel
                      ? "bg-[#C5C0FF]/15 border-[#C5C0FF] text-white"
                      : "bg-[#161619] border-[#1C1C20] text-[#C8C4D9] hover:border-[#474556] hover:text-white"
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold">{opt.label}</div>
                    <div className="text-[11px] text-[#918EA2]">{opt.desc}</div>
                  </div>
                  {isSel && (
                    <div className="w-5 h-5 rounded-full bg-[#5A45FF] flex items-center justify-center shrink-0 ml-2">
                      <Check className="w-3 h-3 text-white stroke-[3]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1C1C20]">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-1.5 text-xs text-[#918EA2] hover:text-white"
            >
              Close
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
