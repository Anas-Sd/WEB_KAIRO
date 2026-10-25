"use client";

import React, { useRef, useEffect, useMemo } from "react";
import { format, subDays, startOfDay } from "date-fns";
import {
  Flame,
  Check,
  X,
  Plus,
  Minus,
  MoreVertical,
  Edit2,
  Trash2,
  GripVertical,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Habit, HabitLog } from "@/types";
import {
  calculateHabitStreak,
  calculateHabitCounts,
  getEffectiveDayState,
  isDayComplete,
  getEffectiveStartDate,
} from "@/store/useHabitStore";

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

const DAY_LABELS = ["M", "Tu", "W", "Th", "F", "Sa", "Su"];

function formatDayLabel(d: Date): string {
  // getDay: 0 = Sun, 1 = Mon ... 6 = Sat
  const day = d.getDay();
  const idx = day === 0 ? 6 : day - 1;
  return DAY_LABELS[idx];
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => format(today, "yyyy-MM-dd"), [today]);

  const toIsoDay = (d: Date) => (d.getDay() === 0 ? 7 : d.getDay());
  const todayIsoDay = toIsoDay(today);

  const habitStartDate = getEffectiveStartDate(habit);
  const isTodayScheduled =
    !today.getTime() || today < habitStartDate
      ? false
      : habit.repeatType === "EVERYDAY"
      ? true
      : habit.repeatType === "SPECIFIC_DAYS"
      ? habit.repeatDays.includes(todayIsoDay)
      : true;

  const todayLog = logs?.get(todayStr);
  const isCompletedToday = isDayComplete(habit, todayLog);
  const todayEffective = getEffectiveDayState(habit, today, todayLog, today);
  const isMissedToday = todayEffective.state === "MISSED";

  const { currentStreak } = calculateHabitStreak(habit, logs || new Map(), today);
  const { totalDone, totalMissed, weeklyDoneCount } = calculateHabitCounts(
    habit,
    logs,
    today
  );

  // 14-day strip ending today: 13 days ago .. today (exactly matches Android HabitRepository)
  const dayWindow = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => subDays(today, 13 - i));
  }, [today]);

  // Group days into weeks (Monday to Sunday) for week-to-week border grouping
  const weekGroups = useMemo(() => {
    const groups: Date[][] = [];
    let currentGroup: Date[] = [];

    dayWindow.forEach((d, idx) => {
      // Monday = 1
      if (idx > 0 && d.getDay() === 1) {
        groups.push(currentGroup);
        currentGroup = [];
      }
      currentGroup.push(d);
    });

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }
    return groups;
  }, [dayWindow]);

  // Scroll to today (rightmost day) on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, []);

  const todayValue = todayLog?.value ?? (isCompletedToday ? (habit.targetValue || 1) : 0);
  const target = Math.max(1, habit.targetValue || 1);
  const todayProgressFraction =
    habit.type === "TARGET"
      ? isCompletedToday
        ? 1.0
        : Math.min(1.0, Math.max(0, todayValue / target))
      : isCompletedToday
      ? 1.0
      : 0.0;

  // Handle day checkbox tap matching Android
  const handleDayClick = (d: Date, e: React.MouseEvent) => {
    e.stopPropagation();
    const dStr = format(d, "yyyy-MM-dd");
    const dLog = logs?.get(dStr);
    const dayInfo = getEffectiveDayState(habit, d, dLog, today);

    if (dayInfo.isFuture || dayInfo.isRest || dayInfo.isBeforeStart) {
      return;
    }

    if (dayInfo.isPast) {
      // Previous days: ONLY 2 options: DONE / MISSED
      if (dayInfo.state === "DONE") {
        onSetState(dStr, "MISSED");
      } else {
        onSetState(dStr, "DONE");
      }
    } else {
      // Today: UNMARKED -> DONE -> MISSED -> UNMARKED
      if (dayInfo.state === "UNMARKED") {
        onSetState(dStr, "DONE");
      } else if (dayInfo.state === "DONE") {
        onSetState(dStr, "MISSED");
      } else {
        onSetState(dStr, "UNMARKED");
      }
    }
  };

  return (
    <div
      onClick={onClick}
      className={`relative px-3 py-2.5 rounded-[16px] bg-[#161619] border transition-all duration-200 cursor-pointer ${
        isSelected
          ? "border-[#C5C0FF] bg-[#1C1C20]"
          : "border-white/[0.08] hover:border-white/20 hover:bg-[#1A1A1E]"
      }`}
    >
      <div className="flex items-center gap-2">
        {/* LEFT COLUMN: Drag handle or Selection Checkbox */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <button
            type="button"
            {...dragHandleProps}
            onClick={(e) => e.stopPropagation()}
            className="cursor-grab active:cursor-grabbing text-[#64748B] hover:text-[#C5C0FF] p-0.5 transition-colors"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          {isSelectionMode && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect?.();
              }}
              className={`w-4 h-4 mt-1 rounded-[5px] flex items-center justify-center border transition-colors cursor-pointer ${
                isSelected
                  ? "bg-[#C5C0FF] border-[#C5C0FF] text-black"
                  : "border-white/35 bg-white/[0.05]"
              }`}
            >
              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
          )}
        </div>

        {/* MIDDLE COLUMN: Task Name, Stepper, Divider, 14-day Strip */}
        <div className="flex-1 min-w-0 pr-1">
          {/* Upper Header Row: Title & Schedule Badge */}
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white truncate">{habit.title}</h3>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Schedule / Weekly Pill */}
              {habit.repeatType === "WEEKLY_X" ? (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                    weeklyDoneCount >= (habit.weeklyTargetCount || 3)
                      ? "bg-[#68DBA9]/15 border-[#68DBA9]/35 text-[#68DBA9]"
                      : "bg-white/[0.06] border-white/10 text-[#C8C4D9]"
                  }`}
                >
                  {weeklyDoneCount}/{habit.weeklyTargetCount} this wk
                </span>
              ) : habit.repeatType === "SPECIFIC_DAYS" && !isTodayScheduled ? (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.05] border border-white/10 text-[#94A3B8]">
                  Rest Day
                </span>
              ) : null}

              {/* 3-dots Menu for Edit / Delete */}
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 rounded-md text-[#918EA2] hover:text-white hover:bg-[#252529] transition-colors"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </DropdownMenu.Trigger>

                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="end"
                    sideOffset={4}
                    onClick={(e) => e.stopPropagation()}
                    className="z-50 min-w-[130px] bg-[#1C1C20] border border-white/10 rounded-xl p-1 shadow-2xl"
                  >
                    <DropdownMenu.Item
                      onClick={onEdit}
                      className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-[#E3E1EC] hover:bg-[#252529] rounded-lg cursor-pointer outline-none"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#918EA2]" />
                      <span>Edit</span>
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator className="h-px bg-[#252529] my-1" />
                    <DropdownMenu.Item
                      onClick={onDelete}
                      className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-[#FFB4AB] hover:bg-[#93000A]/30 rounded-lg cursor-pointer outline-none font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-[#FFB4AB]" />
                      <span>Delete</span>
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
          </div>

          {/* If TARGET habit and scheduled today: Interactive Stepper */}
          {habit.type === "TARGET" && isTodayScheduled && (
            <div className="flex items-center justify-between gap-2 mt-1">
              <div
                onClick={(e) => e.stopPropagation()}
                className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded-[8px] bg-white/[0.05] border ${
                  todayProgressFraction >= 1
                    ? "border-[#68DBA9]/45"
                    : "border-white/12"
                }`}
              >
                <button
                  type="button"
                  disabled={todayValue <= 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStepTarget(todayStr, -1);
                  }}
                  className="w-5 h-5 rounded-[4px] flex items-center justify-center text-white disabled:opacity-30 hover:bg-white/10 transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span
                  className={`text-[11px] font-semibold px-1 ${
                    todayProgressFraction >= 1 ? "text-[#68DBA9]" : "text-white"
                  }`}
                >
                  {todayValue} / {habit.targetValue} {habit.targetUnit}
                </span>
                <button
                  type="button"
                  disabled={todayValue >= habit.targetValue}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStepTarget(todayStr, 1);
                  }}
                  className="w-5 h-5 rounded-[4px] bg-[#C5C0FF]/15 flex items-center justify-center text-[#C5C0FF] disabled:opacity-30 disabled:bg-white/[0.05] hover:bg-[#C5C0FF]/25 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {/* Mini progress bar */}
              <div className="flex-1 h-[5px] rounded-[3px] bg-white/[0.08] overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-[3px] ${
                    todayProgressFraction >= 1 ? "bg-[#68DBA9]" : "bg-[#FACC15]"
                  }`}
                  style={{ width: `${todayProgressFraction * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="h-px bg-white/[0.08] my-1.5" />

          {/* 14-Day Date Strip grouped by weeks (Mon-Sun) */}
          <div
            ref={scrollRef}
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5"
          >
            {weekGroups.map((weekDays, wIdx) => (
              <div
                key={wIdx}
                className="flex items-center gap-1 px-1 py-0.5 rounded-[8px] bg-white/[0.02] border border-white/[0.08] shrink-0"
              >
                {weekDays.map((d) => {
                  const dStr = format(d, "yyyy-MM-dd");
                  const dLog = logs?.get(dStr);
                  const dayInfo = getEffectiveDayState(habit, d, dLog, today);

                  const isTargetType = habit.type === "TARGET";
                  const isTargetDone =
                    isTargetType &&
                    (dayInfo.value >= habit.targetValue || dayInfo.state === "DONE");
                  const hasPartialProgress =
                    isTargetType &&
                    dayInfo.value > 0 &&
                    dayInfo.value < habit.targetValue;
                  const isMissed = dayInfo.state === "MISSED";

                  return (
                    <div
                      key={dStr}
                      className="flex flex-col items-center px-0.5"
                    >
                      {/* Day Number and Label */}
                      <div className="flex items-baseline gap-0.5">
                        <span
                          className={`text-[10px] leading-tight ${
                            dayInfo.isToday
                              ? "font-extrabold text-[#C5C0FF]"
                              : dayInfo.isBeforeStart
                              ? "text-[#475569] font-medium"
                              : dayInfo.isFuture
                              ? "text-[#64748B] font-medium"
                              : "text-[#94A3B8] font-medium"
                          }`}
                        >
                          {format(d, "d")}
                        </span>
                        <span
                          className={`text-[8px] leading-tight ${
                            dayInfo.isToday
                              ? "font-bold text-[#C5C0FF]/85"
                              : dayInfo.isBeforeStart
                              ? "text-[#334155]"
                              : dayInfo.isFuture
                              ? "text-[#475569]"
                              : "text-[#64748B]"
                          }`}
                        >
                          {formatDayLabel(d)}
                        </span>
                      </div>

                      {/* Squircle Checkbox Box */}
                      <div className="mt-1">
                        {dayInfo.isRest || dayInfo.isBeforeStart ? (
                          // Rest Day or Pre-creation Date indicator: marked as '—'
                          <div className="w-[21px] h-[21px] rounded-[6px] bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-[#64748B] text-[10px] font-bold select-none cursor-default">
                            —
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={dayInfo.isFuture}
                            onClick={(e) => handleDayClick(d, e)}
                            className={`w-[21px] h-[21px] rounded-[6px] flex items-center justify-center transition-transform active:scale-90 cursor-pointer ${
                              isTargetDone || dayInfo.state === "DONE"
                                ? "bg-[#68DBA9]/20 border-[1.2px] border-[#68DBA9]"
                                : hasPartialProgress
                                ? "bg-[#FACC15]/20 border-[1.2px] border-[#FACC15]/80"
                                : isMissed
                                ? "bg-[#F43F5E]/14 border-[1.2px] border-[#FB7185]/60"
                                : dayInfo.isFuture
                                ? "bg-white/[0.015] border-[0.8px] border-white/[0.06] cursor-default"
                                : dayInfo.isToday
                                ? "bg-white/[0.03] border-[1.5px] border-[#C5C0FF]"
                                : "bg-white/[0.03] border border-white/15"
                            }`}
                            title={`${dStr}: ${
                              dayInfo.state === "DONE"
                                ? "Done"
                                : dayInfo.state === "MISSED"
                                ? "Missed"
                                : "Unmarked"
                            }`}
                          >
                            {isTargetDone || dayInfo.state === "DONE" ? (
                              <Check className="w-3.5 h-3.5 text-[#68DBA9] stroke-[3]" />
                            ) : hasPartialProgress ? (
                              <span
                                className={`font-bold ${
                                  isMissed
                                    ? "text-[8px] text-[#FACC15]"
                                    : "text-[9px] text-[#FACC15]"
                                }`}
                              >
                                {isMissed ? `${dayInfo.value}✕` : `${dayInfo.value}`}
                              </span>
                            ) : isMissed ? (
                              isTargetType ? (
                                <span className="text-[8px] font-bold text-[#FB7185]">
                                  {dayInfo.value}✕
                                </span>
                              ) : (
                                <X className="w-3 h-3 text-[#FB7185] stroke-[3]" />
                              )
                            ) : null}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: 3 stacked indicator buttons (Streak / Done / Missed) */}
        <div className="flex flex-col items-center gap-1 shrink-0 pl-0.5">
          {/* 1. Streak Button */}
          <div
            className="w-6 h-6 rounded-[6px] bg-[#F59E0B]/14 border border-[#F59E0B]/35 flex items-center justify-center gap-0.5 text-[#FCD34D]"
            title={`Current Streak: ${currentStreak}`}
          >
            <Flame className="w-2.5 h-2.5 fill-[#FCD34D]" />
            <span className="text-[9px] font-bold">{currentStreak}</span>
          </div>

          {/* 2. Completed / Done Button (Clickable to complete today) */}
          <button
            type="button"
            disabled={!isTodayScheduled}
            onClick={(e) => {
              e.stopPropagation();
              if (isTodayScheduled) {
                onSetState(todayStr, isCompletedToday ? "UNMARKED" : "DONE");
              }
            }}
            className={`w-6 h-6 rounded-[6px] flex items-center justify-center gap-0.5 transition-colors ${
              isTodayScheduled
                ? "bg-[#68DBA9]/16 border border-[#68DBA9]/40 text-[#68DBA9] hover:bg-[#68DBA9]/25 cursor-pointer"
                : "bg-white/[0.04] border border-white/[0.08] text-[#64748B] cursor-default"
            }`}
            title={`Total Done: ${totalDone} (Click to toggle today)`}
          >
            <Check className="w-2.5 h-2.5 stroke-[3]" />
            <span className="text-[9px] font-bold">{totalDone}</span>
          </button>

          {/* 3. Missed Button */}
          <div
            className="w-6 h-6 rounded-[6px] bg-[#F43F5E]/14 border border-[#F43F5E]/35 flex items-center justify-center gap-0.5 text-[#FDA4AF]"
            title={`Total Missed: ${totalMissed}`}
          >
            <X className="w-2.5 h-2.5 stroke-[3]" />
            <span className="text-[9px] font-bold">{totalMissed}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
