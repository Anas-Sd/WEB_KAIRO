"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import {
  X,
  CheckCircle2,
  Clock,
  Calendar,
  Bell,
  Repeat,
  Moon,
  MapPin,
  Paperclip,
  History,
  Edit2,
  Trash2,
  CalendarCheck,
  AlertCircle,
} from "lucide-react";
import { Task } from "@/types";
import { formatRemainingTime, calculateTriggerMillis, formatDisplayDate } from "@/lib/dateUtils";
import { useTaskStore } from "@/store/useTaskStore";

interface TaskDetailsPanelProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onReactivateForToday?: (task: Task) => void;
  onSnooze?: (task: Task, minutes: number) => void;
}

export function TaskDetailsPanel({
  task,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onReactivateForToday,
  onSnooze,
}: TaskDetailsPanelProps) {
  const [snoozeMenuOpen, setSnoozeMenuOpen] = useState(false);
  const { tasks } = useTaskStore();

  const recurrenceSnapshots = React.useMemo(() => {
    if (!task) return [];
    return tasks
      .filter((t) => t.id.startsWith(`snapshot_${task.id}_`))
      .sort((a, b) => (b.dueDateMillis || b.createdAt) - (a.dueDateMillis || a.createdAt));
  }, [task, tasks]);
  const isRepeating = !!task?.repeatType && task?.repeatType !== "NONE";

  if (!isOpen || !task) return null;

  const now = Date.now();
  const triggerMillis = calculateTriggerMillis(task.dueDate, task.dueTime, task.dueDateMillis);
  const alarmCountdown = triggerMillis ? formatRemainingTime(triggerMillis, now) : null;
  const snoozeCountdown = task.snoozeUntilMillis
    ? formatRemainingTime(task.snoozeUntilMillis, now)
    : null;

  const priorityColor =
    task.priority === "URGENT"
      ? "text-[#EF4444] bg-[#EF4444]/15 border-[#EF4444]/30"
      : task.priority === "HIGH"
      ? "text-[#FFB77D] bg-[#FFB77D]/15 border-[#FFB77D]/30"
      : task.priority === "MEDIUM"
      ? "text-[#C5C0FF] bg-[#C5C0FF]/15 border-[#C5C0FF]/30"
      : "text-[#68DBA9] bg-[#68DBA9]/15 border-[#68DBA9]/30";

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      {/* Slide panel on Desktop, Bottom drawer on Mobile */}
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-[#0C0C0F] border-l border-[#1C1C20] shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1C1C20] shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-white">Task Details</span>
            {task.isCompleted ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[#68DBA9]/15 text-[#68DBA9] border border-[#68DBA9]/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Completed</span>
              </span>
            ) : (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${priorityColor}`}>
                {task.priority}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#918EA2] hover:text-white hover:bg-[#161619]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Title */}
          <div>
            <h2
              className={`text-lg font-bold ${
                task.isCompleted ? "line-through text-[#918EA2]" : "text-white"
              }`}
            >
              {task.title}
            </h2>
          </div>

          {/* Notes */}
          {task.notes ? (
            <div className="p-3.5 rounded-xl bg-[#161619] border border-[#1C1C20] space-y-1">
              <span className="text-xs font-semibold text-[#918EA2] uppercase tracking-wider block">
                Notes
              </span>
              <p className="text-sm text-[#E3E1EC] whitespace-pre-wrap">{task.notes}</p>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-[#161619]/50 border border-[#1C1C20] text-xs text-[#918EA2] italic">
              No notes provided for this task.
            </div>
          )}

          {/* Scheduling & Location */}
          <div className="p-4 rounded-xl bg-[#161619] border border-[#1C1C20] space-y-3">
            <span className="text-xs font-semibold text-[#918EA2] uppercase tracking-wider block">
              Schedule & Alarms
            </span>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[#918EA2] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#C5C0FF]" /> Due Date
              </span>
              <span className="text-white font-medium">{task.dueDate}</span>
            </div>

            {task.dueTime && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#918EA2] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#C5C0FF]" /> Due Time
                </span>
                <span className="text-white font-medium">{task.dueTime}</span>
              </div>
            )}

            {alarmCountdown && !task.isCompleted && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#918EA2] flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#FFB77D]" /> Next Alarm
                </span>
                <span className="text-[#FFB77D] font-medium">in {alarmCountdown}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs">
              <span className="text-[#918EA2] flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#918EA2]" /> Alarm Tone
              </span>
              <span className="text-white font-medium truncate max-w-[200px]">
                {task.alarmToneTitle || "Default Alarm Tone"}
              </span>
            </div>

            {task.snoozeUntilMillis && task.snoozeUntilMillis > now && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#918EA2] flex items-center gap-2">
                  <Moon className="w-4 h-4 text-[#FFB77D]" /> Snoozed
                </span>
                <span className="text-[#FFB77D] font-medium">
                  {snoozeCountdown ? `in ${snoozeCountdown}` : "Active"}
                </span>
              </div>
            )}

            {task.location && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#918EA2] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#68DBA9]" /> Location
                </span>
                <span className="text-white font-medium">{task.location}</span>
              </div>
            )}
          </div>

          {/* Repeat Nature */}
          {task.repeatType && task.repeatType !== "NONE" && (
            <div className="p-4 rounded-xl bg-[#161619] border border-[#1C1C20] space-y-2.5">
              <span className="text-xs font-semibold text-[#918EA2] uppercase tracking-wider block">
                Recurrence
              </span>
              <div className="flex items-center gap-2 text-xs text-[#C5C0FF] font-medium">
                <Repeat className="w-4 h-4" />
                <span>Type: {task.repeatType}</span>
              </div>
              {task.repeatDays && (
                <p className="text-xs text-[#C8C4D9]">Days: {task.repeatDays}</p>
              )}
              {task.repeatDates && (
                <p className="text-xs text-[#C8C4D9]">Dates: {task.repeatDates}</p>
              )}
              <p className="text-[11px] text-[#918EA2] italic">
                * Automatically creates next recurring task when completed.
              </p>
            </div>
          )}

          {/* Recurrence History (Completed vs Missed) */}
          {(isRepeating || recurrenceSnapshots.length > 0) && (
            <div className="p-4 rounded-xl bg-[#161619] border border-[#1C1C20] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#918EA2] uppercase tracking-wider block">
                  Recurrence History
                </span>
                {recurrenceSnapshots.length > 0 && (
                  <span className="text-[10px] text-[#C5C0FF] bg-[#C5C0FF]/10 px-2 py-0.5 rounded-full font-medium">
                    {recurrenceSnapshots.length} past record{recurrenceSnapshots.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {/* Current Active Schedule */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#1C1C20] border border-[#35343E]/40">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-[#68DBA9] shrink-0 animate-pulse" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#E3E1EC] truncate">
                        {formatDisplayDate(task.dueDate, task.dueDateMillis)}
                        {task.dueTime && ` • ${task.dueTime}`}
                      </p>
                      <p className="text-[10px] text-[#918EA2]">Current Schedule</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#68DBA9]/15 text-[#68DBA9] shrink-0">
                    {task.isCompleted ? "COMPLETED" : "ACTIVE"}
                  </span>
                </div>

                {/* Past Snapshots */}
                {recurrenceSnapshots.map((snap) => {
                  const isDone = snap.isCompleted;
                  return (
                    <div
                      key={snap.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-[#111114] border border-[#1C1C20]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isDone ? "bg-[#68DBA9]" : "bg-[#EF4444]"
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[#E3E1EC] truncate">
                            {formatDisplayDate(snap.dueDate, snap.dueDateMillis)}
                            {snap.dueTime && ` • ${snap.dueTime}`}
                          </p>
                          <p className="text-[10px] text-[#918EA2]">
                            {isDone
                              ? snap.completedAt
                                ? `Completed at ${format(new Date(snap.completedAt), "h:mm a")}`
                                : "Completed"
                              : "Missed"}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          isDone
                            ? "bg-[#68DBA9]/15 text-[#68DBA9]"
                            : "bg-[#EF4444]/15 text-[#EF4444]"
                        }`}
                      >
                        {isDone ? "DONE" : "MISSED"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* History */}
          <div className="p-4 rounded-xl bg-[#161619] border border-[#1C1C20] space-y-2 text-xs">
            <span className="text-xs font-semibold text-[#918EA2] uppercase tracking-wider block">
              History
            </span>
            <div className="flex items-center justify-between text-[#918EA2]">
              <span>Created</span>
              <span className="text-[#E3E1EC]">
                {format(new Date(task.createdAt), "MMM d, yyyy • h:mm a")}
              </span>
            </div>
            <div className="flex items-center justify-between text-[#918EA2]">
              <span>Updated</span>
              <span className="text-[#E3E1EC]">
                {format(new Date(task.updatedAt), "MMM d, yyyy • h:mm a")}
              </span>
            </div>
            {task.completedAt && (
              <div className="flex items-center justify-between text-[#918EA2]">
                <span>Completed</span>
                <span className="text-[#68DBA9]">
                  {format(new Date(task.completedAt), "MMM d, yyyy • h:mm a")}
                </span>
              </div>
            )}
          </div>

          {/* Attachment display */}
          {task.attachmentName && (
            <div className="p-3.5 rounded-xl bg-[#161619] border border-[#1C1C20] flex items-center gap-2.5">
              <Paperclip className="w-4 h-4 text-[#C5C0FF]" />
              <div className="flex flex-col truncate">
                <span className="text-xs font-medium text-white truncate">
                  {task.attachmentName}
                </span>
                <span className="text-[10px] text-[#918EA2]">Attachment (view-only)</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions Bar */}
        <div className="p-4 border-t border-[#1C1C20] bg-[#0C0C0F] shrink-0 space-y-2">
          {/* Quick Snooze options */}
          {onSnooze && !task.isCompleted && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-[11px] text-[#918EA2] shrink-0">Snooze:</span>
              <button
                type="button"
                onClick={() => onSnooze(task, 15)}
                className="px-2.5 py-1 text-xs rounded-lg bg-[#161619] hover:bg-[#1C1C20] text-[#FFB77D] border border-[#FFB77D]/20 shrink-0"
              >
                15m
              </button>
              <button
                type="button"
                onClick={() => onSnooze(task, 60)}
                className="px-2.5 py-1 text-xs rounded-lg bg-[#161619] hover:bg-[#1C1C20] text-[#FFB77D] border border-[#FFB77D]/20 shrink-0"
              >
                1h
              </button>
              <button
                type="button"
                onClick={() => onSnooze(task, 180)}
                className="px-2.5 py-1 text-xs rounded-lg bg-[#161619] hover:bg-[#1C1C20] text-[#FFB77D] border border-[#FFB77D]/20 shrink-0"
              >
                3h
              </button>
              <button
                type="button"
                onClick={() => onSnooze(task, 1440)}
                className="px-2.5 py-1 text-xs rounded-lg bg-[#161619] hover:bg-[#1C1C20] text-[#FFB77D] border border-[#FFB77D]/20 shrink-0"
              >
                Tomorrow
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            {onReactivateForToday && task.repeatType && (
              <button
                type="button"
                onClick={() => onReactivateForToday(task)}
                className="flex-1 py-2 rounded-xl bg-[#60A5FA]/15 hover:bg-[#60A5FA]/25 text-[#60A5FA] border border-[#60A5FA]/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Reactivate Today</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onEdit(task)}
              className="flex-1 py-2 rounded-xl bg-[#5A45FF] hover:bg-[#5A45FF]/90 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>

            <button
              type="button"
              onClick={() => onDelete(task)}
              className="p-2 rounded-xl bg-[#93000A]/20 hover:bg-[#93000A]/35 text-[#FFB4AB] border border-[#93000A]/40 transition-colors"
              title="Delete task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
