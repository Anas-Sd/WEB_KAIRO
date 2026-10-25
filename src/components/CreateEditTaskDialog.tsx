"use client";

import React, { useState, useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { format, parseISO } from "date-fns";
import { X, Calendar, Clock, Bell, Repeat, FolderPlus } from "lucide-react";
import { Task, RepeatType, ToneOption } from "@/types";
import { TonePicker } from "./TonePicker";
import { RepeatPickerDialog } from "./RepeatPickerDialog";
import { formatDisplayDate, parseDueDateMillis } from "@/lib/dateUtils";

interface CreateEditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskToEdit?: Task | null;
  parentTask?: Task | null;
  recentTones: ToneOption[];
  onSave: (taskData: Partial<Task>) => Promise<void>;
}

export function CreateEditTaskDialog({
  open,
  onOpenChange,
  taskToEdit,
  parentTask,
  recentTones,
  onSave,
}: CreateEditTaskDialogProps) {
  const isEditing = !!taskToEdit;

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDateStr, setDueDateStr] = useState("");
  const [dueDateIso, setDueDateIso] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [selectedTone, setSelectedTone] = useState<ToneOption>({
    title: "Default Alarm Tone",
    uri: null,
  });

  const [repeatType, setRepeatType] = useState<RepeatType>(null);
  const [repeatDays, setRepeatDays] = useState<string | null>(null);
  const [repeatDates, setRepeatDates] = useState<string | null>(null);

  const [isRepeatPickerOpen, setIsRepeatPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const prevOpenRef = useRef(false);
  const prevTaskIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const isOpening = open && !prevOpenRef.current;
    const isTaskSwitched = open && (taskToEdit?.id ?? null) !== prevTaskIdRef.current;

    if (isOpening || isTaskSwitched) {
      if (taskToEdit) {
        setTitle(taskToEdit.title);
        setNotes(taskToEdit.notes || "");
        setDueDateStr(taskToEdit.dueDate || "Today");

        const targetMs = taskToEdit.dueDateMillis || parseDueDateMillis(taskToEdit.dueDate);
        setDueDateIso(format(new Date(targetMs), "yyyy-MM-dd"));

        setDueTime(taskToEdit.dueTime || format(new Date(), "HH:mm"));
        setSelectedTone({
          title: taskToEdit.alarmToneTitle || "Default Alarm Tone",
          uri: taskToEdit.alarmToneUri,
        });
        setRepeatType(taskToEdit.repeatType);
        setRepeatDays(taskToEdit.repeatDays);
        setRepeatDates(taskToEdit.repeatDates);
      } else {
        const now = new Date();
        setTitle("");
        setNotes("");
        setDueDateStr("Today");
        setDueDateIso(format(now, "yyyy-MM-dd"));
        setDueTime(format(now, "HH:mm"));
        setSelectedTone(recentTones[0] || { title: "Default Alarm Tone", uri: null });
        setRepeatType(null);
        setRepeatDays(null);
        setRepeatDates(null);
      }
    }

    prevOpenRef.current = open;
    prevTaskIdRef.current = taskToEdit?.id ?? null;
  }, [open, taskToEdit?.id]);

  const handleDateChange = (iso: string) => {
    setDueDateIso(iso);
    try {
      const parsed = parseISO(iso);
      const formatted = formatDisplayDate(null, parsed.getTime());
      setDueDateStr(formatted);
    } catch {
      // ignore
    }
  };

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    setIsSaving(true);
    try {
      const parsedMs = dueDateIso ? parseISO(dueDateIso).getTime() : parseDueDateMillis(dueDateStr);
      await onSave({
        title: trimmedTitle,
        notes: notes.trim() || null,
        dueDate: dueDateStr || "Today",
        dueDateMillis: parsedMs,
        dueTime: dueTime || null,
        alarmToneTitle: selectedTone.title,
        alarmToneUri: selectedTone.uri,
        repeatType,
        repeatDays,
        repeatDates,
        parentId: parentTask?.id ?? (taskToEdit?.parentId || null),
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const getRepeatSummary = () => {
    if (!repeatType || repeatType === "NONE") return "Does not repeat";
    if (repeatType === "DAYS") return `Repeats: ${repeatDays || "Everyday"}`;
    if (repeatType === "DATES") return `Repeats: ${repeatDates}`;
    if (repeatType === "MONTHLY_DATES") return `Repeats monthly on: ${repeatDates}`;
    if (repeatType === "BOTH") return `Repeats on days & dates`;
    if (repeatType === "BOTH_MONTHLY") return `Repeats days & monthly dates`;
    return "Repeats scheduled";
  };

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#0C0C0F] border border-[#1C1C20] rounded-2xl p-6 shadow-2xl focus:outline-none">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#1C1C20]">
              <div className="flex items-center gap-2">
                {parentTask && <FolderPlus className="w-5 h-5 text-[#C5C0FF]" />}
                <Dialog.Title className="text-base font-bold text-white">
                  {isEditing
                    ? "Edit Task"
                    : parentTask
                    ? `Add subtask to: ${parentTask.title}`
                    : "Create Task"}
                </Dialog.Title>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="p-1.5 rounded-lg text-[#918EA2] hover:text-white hover:bg-[#161619]"
                >
                  <X className="w-5 h-5" />
                </button>
              </Dialog.Close>
            </div>

            {/* Form */}
            <div className="space-y-4 mt-4">
              {/* Title */}
              <div>
                <label className="text-xs font-medium text-[#918EA2] block mb-1.5">
                  Title <span className="text-[#FFB4AB]">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Task title..."
                  className="w-full bg-[#161619] border border-[#474556]/40 focus:border-[#C5C0FF] rounded-xl px-3.5 py-2.5 text-sm text-[#E3E1EC] placeholder-[#918EA2] focus:outline-none"
                  autoFocus
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-[#918EA2] block mb-1.5">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add additional notes, details, links..."
                  rows={3}
                  className="w-full bg-[#161619] border border-[#474556]/40 focus:border-[#C5C0FF] rounded-xl px-3.5 py-2 text-sm text-[#E3E1EC] placeholder-[#918EA2] focus:outline-none resize-none"
                />
              </div>

              {/* Due Date & Time (Two columns) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#918EA2] block mb-1.5">
                    Due Date
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={dueDateIso}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="w-full bg-[#161619] border border-[#474556]/40 focus:border-[#C5C0FF] rounded-xl px-3 py-2 text-sm text-[#E3E1EC] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-[#918EA2] block mb-1.5">
                    Due Time
                  </label>
                  <div className="relative">
                    <input
                      type="time"
                      value={dueTime}
                      onChange={(e) => setDueTime(e.target.value)}
                      className="w-full bg-[#161619] border border-[#474556]/40 focus:border-[#C5C0FF] rounded-xl px-3 py-2 text-sm text-[#E3E1EC] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Alarm Tone Picker */}
              <div>
                <label className="text-xs font-medium text-[#918EA2] block mb-1.5">
                  Alarm Tone
                </label>
                <TonePicker
                  selectedToneTitle={selectedTone.title}
                  tones={recentTones}
                  onSelectTone={setSelectedTone}
                />
              </div>

              {/* Repeat Picker */}
              <div>
                <label className="text-xs font-medium text-[#918EA2] block mb-1.5">
                  Repeat
                </label>
                <button
                  type="button"
                  onClick={() => setIsRepeatPickerOpen(true)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#161619] border border-[#474556]/40 hover:border-[#C5C0FF]/60 rounded-xl text-sm text-[#E3E1EC] transition-colors"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Repeat className="w-4 h-4 text-[#C5C0FF] shrink-0" />
                    <span className="truncate">{getRepeatSummary()}</span>
                  </div>
                  <span className="text-xs text-[#5A45FF] font-semibold shrink-0">Configure</span>
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#1C1C20]">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="px-4 py-2 text-sm text-[#918EA2] hover:text-white"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                type="button"
                disabled={isSaving || !title.trim()}
                onClick={handleSave}
                className="px-5 py-2 rounded-xl bg-[#5A45FF] hover:bg-[#5A45FF]/90 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
              >
                {isSaving ? "Saving..." : isEditing ? "Save Changes" : "Create Task"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Nested Repeat Picker Dialog */}
      <RepeatPickerDialog
        open={isRepeatPickerOpen}
        onOpenChange={setIsRepeatPickerOpen}
        initialRepeatType={repeatType}
        initialRepeatDays={repeatDays}
        initialRepeatDates={repeatDates}
        onSave={(res) => {
          setRepeatType(res.repeatType);
          setRepeatDays(res.repeatDays);
          setRepeatDates(res.repeatDates);
        }}
      />
    </>
  );
}
