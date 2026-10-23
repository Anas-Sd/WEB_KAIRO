"use client";

import React from "react";
import { format, subDays, isBefore, parseISO } from "date-fns";
import {
  Flame,
  Check,
  X,
  Plus,
  Minus,
  Lock,
  MoreVertical,
  Edit2,
  Trash2,
  GripVertical,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Habit, HabitLog } from "@/types";
import { calculateHabitStreak, isDayComplete } from "@/store/useHabitStore";

interface HabitCardProps {
  habit: Habit;
  logs: Map<string, HabitLog> | undefined;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSetState: (date: string, state: "DONE" | "MISSED" | "UNMARKED") => void;
  onStepTarget: (date: string, delta: number) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

export function HabitCard({
  habit,
  logs,
  onClick,
  onEdit,
  onDelete,
  onSetState,
  onStepTarget,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
  dragHandleProps,
}: HabitCardProps) {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const habitStartDate = parseISO(habit.startDate);

  const toIsoDay = (d: Date) => (d.getDay() === 0 ? 7 : d.getDay());
  const todayIsoDay = toIsoDay(today);

  const isTodayScheduled =
    habit.repeatType === "EVERYDAY"
      ? true
      : habit.repeatType === "SPECIFIC_DAYS"
      ? habit.repeatDays.includes(todayIsoDay)
      : true;

  const todayLog = logs?.get(todayStr);
  const isCompletedToday = isDayComplete(habit, todayLog);
  const isMissedToday = todayLog?.state === "MISSED" && !isCompletedToday;

  const { currentStreak } = calculateHabitStreak(habit, logs || new Map(), today);

  // 7-day dot strip ending today (6 days ago .. today)
  const last7Days = Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i));

  const targetCurrentVal = todayLog?.value ?? 0;

  return (
    <div
      onClick={onClick}
      className={`relative p-4 rounded-2xl bg-[#161619] border transition-all duration-200 cursor-pointer ${
        isSelected
          ? "border-[#C5C0FF] bg-[#1C1C20]"
          : "border-[#474556]/20 hover:border-[#474556]/50 hover:bg-[#1A1A1E]"
      }`}
    >
      {/* Top row: Drag/Select, Title, Streak, Menu */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Selection Checkbox or Drag Handle */}
          {isSelectionMode ? (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect?.();
              }}
              className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors shrink-0 ${
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
              className="cursor-grab active:cursor-grabbing text-[#918EA2] hover:text-white p-0.5 opacity-40 hover:opacity-100 transition-opacity shrink-0"
              title="Drag to reorder"
            >
              <GripVertical className="w-4 h-4" />
            </button>
          )}

          <div className="truncate">
            <h3 className="text-sm font-bold text-white truncate">{habit.title}</h3>
            <div className="flex items-center gap-2 mt-0.5 text-[11px]">
              {currentStreak > 0 && (
                <span className="inline-flex items-center gap-1 text-[#FFB77D] font-bold">
                  <Flame className="w-3.5 h-3.5 fill-[#FFB77D]" />
                  {currentStreak} {habit.repeatType === "WEEKLY_X" ? "wks" : "days"}
                </span>
              )}

              {/* Today Status Pill */}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ${
                  isCompletedToday
                    ? "bg-[#68DBA9]/15 text-[#68DBA9]"
                    : isMissedToday
                    ? "bg-[#EF4444]/15 text-[#EF4444]"
                    : !isTodayScheduled
                    ? "bg-[#252529] text-[#918EA2]"
                    : "bg-[#5A45FF]/15 text-[#C5C0FF]"
                }`}
              >
                {isCompletedToday ? "Done ✓" : isMissedToday ? "Missed ✗" : !isTodayScheduled ? "Rest Day" : "Pending"}
              </span>
            </div>
          </div>
        </div>

        {/* 3-dots Menu */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded-lg text-[#918EA2] hover:text-white hover:bg-[#252529]"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={4}
              onClick={(e) => e.stopPropagation()}
              className="z-50 min-w-[140px] bg-[#1C1C20] border border-[#474556]/40 rounded-xl p-1 shadow-2xl"
            >
              <DropdownMenu.Item
                onClick={onEdit}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#E3E1EC] hover:bg-[#252529] rounded-lg cursor-pointer outline-none"
              >
                <Edit2 className="w-3.5 h-3.5 text-[#918EA2]" />
                <span>Edit</span>
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="h-px bg-[#252529] my-1" />
              <DropdownMenu.Item
                onClick={onDelete}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#FFB4AB] hover:bg-[#93000A]/30 rounded-lg cursor-pointer outline-none font-medium"
              >
                <Trash2 className="w-3.5 h-3.5 text-[#FFB4AB]" />
                <span>Delete</span>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {/* 7-day dot strip */}
      <div className="flex items-center justify-between gap-1 mt-3 pt-3 border-t border-[#1C1C20]">
        {last7Days.map((d, idx) => {
          const dStr = format(d, "yyyy-MM-dd");
          const isoDay = toIsoDay(d);
          const isBeforeStart = isBefore(d, habitStartDate) && dStr !== habit.startDate;
          const isScheduled =
            habit.repeatType === "EVERYDAY"
              ? true
              : habit.repeatType === "SPECIFIC_DAYS"
              ? habit.repeatDays.includes(isoDay)
              : true;

          const dayLog = logs?.get(dStr);
          const isDone = isDayComplete(habit, dayLog);
          const isMissed = dayLog?.state === "MISSED";

          const isCurrentDay = dStr === todayStr;

          return (
            <div key={idx} className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-[#918EA2]">
                {format(d, "EEEEE")}
              </span>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-all ${
                  isCurrentDay ? "ring-2 ring-[#C5C0FF]/60" : ""
                } ${
                  isBeforeStart
                    ? "bg-[#111114] text-[#918EA2]/40"
                    : isDone
                    ? "bg-[#68DBA9] text-black font-bold shadow-sm shadow-[#68DBA9]/20"
                    : isMissed
                    ? "bg-[#EF4444] text-white font-bold"
                    : !isScheduled
                    ? "border border-[#474556]/50 bg-transparent"
                    : "bg-[#252529]"
                }`}
                title={`${dStr}: ${isDone ? "Done" : isMissed ? "Missed" : !isScheduled ? "Rest" : "Unmarked"}`}
              >
                {isBeforeStart ? (
                  <Lock className="w-2.5 h-2.5" />
                ) : isDone ? (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                ) : isMissed ? (
                  <X className="w-3 h-3 stroke-[3]" />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom actions (only if today is scheduled) */}
      {isTodayScheduled && (
        <div className="mt-3 pt-3 border-t border-[#1C1C20] flex items-center justify-between gap-2">
          {habit.type === "YES_NO" ? (
            <div className="flex items-center gap-2 w-full">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSetState(todayStr, isCompletedToday ? "UNMARKED" : "DONE");
                }}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  isCompletedToday
                    ? "bg-[#68DBA9] text-black shadow-md shadow-[#68DBA9]/20"
                    : "bg-[#161619] hover:bg-[#68DBA9]/20 border border-[#68DBA9]/30 text-[#68DBA9]"
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Done</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSetState(todayStr, isMissedToday ? "UNMARKED" : "MISSED");
                }}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  isMissedToday
                    ? "bg-[#EF4444] text-white shadow-md shadow-[#EF4444]/20"
                    : "bg-[#161619] hover:bg-[#EF4444]/20 border border-[#EF4444]/30 text-[#EF4444]"
                }`}
              >
                <X className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Missed</span>
              </button>
            </div>
          ) : (
            /* TARGET Habit Stepper */
            <div className="flex items-center justify-between w-full">
              <div className="text-xs font-semibold text-white">
                <span className="text-[#C5C0FF] font-bold">{targetCurrentVal}</span>
                <span className="text-[#918EA2]">
                  /{habit.targetValue} {habit.targetUnit}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={targetCurrentVal <= 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStepTarget(todayStr, -1);
                  }}
                  className="w-7 h-7 rounded-lg bg-[#252529] hover:bg-[#1C1C20] disabled:opacity-30 text-white flex items-center justify-center transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={targetCurrentVal >= habit.targetValue}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStepTarget(todayStr, 1);
                  }}
                  className="w-7 h-7 rounded-lg bg-[#5A45FF] hover:bg-[#5A45FF]/90 disabled:opacity-30 text-white flex items-center justify-center transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
