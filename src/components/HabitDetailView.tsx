"use client";

import React, { useState, useMemo } from "react";
import {
  format,
  subDays,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isBefore,
  parseISO,
} from "date-fns";
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Flame,
  Trophy,
  Check,
  X,
  Plus,
  Minus,
  Lock,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  MessageSquare,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Habit, HabitLog } from "@/types";
import { calculateHabitStreak, isDayComplete } from "@/store/useHabitStore";

interface HabitDetailViewProps {
  habit: Habit;
  logs: Map<string, HabitLog> | undefined;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSetState: (
    date: string,
    state: "DONE" | "MISSED" | "UNMARKED",
    value?: number | null,
    note?: string | null
  ) => Promise<void>;
  onStepTarget: (date: string, delta: number) => Promise<{ needNote: boolean; currentVal: number }>;
  onOpenNoteDialog: (date: string, currentNote?: string | null) => void;
}

export function HabitDetailView({
  habit,
  logs,
  onBack,
  onEdit,
  onDelete,
  onSetState,
  onStepTarget,
  onOpenNoteDialog,
}: HabitDetailViewProps) {
  const today = new Date();
  const todayStr = format(today, "yyyy-MM-dd");
  const habitStartDate = parseISO(habit.startDate);

  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(today));

  const toIsoDay = (d: Date) => (d.getDay() === 0 ? 7 : d.getDay());
  const isScheduledOnDay = (d: Date) => {
    if (habit.repeatType === "EVERYDAY") return true;
    if (habit.repeatType === "SPECIFIC_DAYS") return habit.repeatDays.includes(toIsoDay(d));
    return true;
  };

  const { currentStreak, bestStreak } = calculateHabitStreak(habit, logs || new Map(), today);
  const streakUnit = habit.repeatType === "WEEKLY_X" ? "weeks" : "days";

  // Today log
  const todayLog = logs?.get(todayStr);
  const isCompletedToday = isDayComplete(habit, todayLog);
  const isMissedToday = todayLog?.state === "MISSED" && !isCompletedToday;
  const targetCurrentVal = todayLog?.value ?? 0;

  // 7-day strip (6 days ago -> today)
  const last7Days = Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i));

  // Cycle day state: UNMARKED -> DONE -> MISSED -> UNMARKED
  const handleCycleDay = async (dStr: string) => {
    const existing = logs?.get(dStr);
    let nextState: "DONE" | "MISSED" | "UNMARKED" = "DONE";
    if (existing?.state === "DONE") nextState = "MISSED";
    else if (existing?.state === "MISSED") nextState = "UNMARKED";
    else nextState = "DONE";

    await onSetState(
      dStr,
      nextState,
      nextState === "DONE" && habit.type === "TARGET" ? habit.targetValue : null,
      existing?.note
    );
  };

  // Calendar month days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Donut Chart Analytics (Calculated over all scheduled days from start date to today, max 90 days)
  const { chartData, adherencePercent, totalScheduled, totalDone, totalMissed, totalUnmarked } =
    useMemo(() => {
      let doneCount = 0;
      let missedCount = 0;
      let unmarkedCount = 0;
      let scheduledCount = 0;

      const minDate = subDays(today, 90);
      const start = isBefore(minDate, habitStartDate) ? habitStartDate : minDate;
      let check = start;

      while (!isBefore(today, check)) {
        if (isScheduledOnDay(check)) {
          scheduledCount++;
          const dStr = format(check, "yyyy-MM-dd");
          const l = logs?.get(dStr);
          if (isDayComplete(habit, l)) {
            doneCount++;
          } else if (l?.state === "MISSED") {
            missedCount++;
          } else {
            unmarkedCount++;
          }
        }
        check = new Date(check.getTime() + 86400000);
      }

      const adherence = scheduledCount > 0 ? Math.round((doneCount / scheduledCount) * 100) : 0;

      const data = [
        { name: "Done", value: doneCount, color: "#68DBA9" },
        { name: "Missed", value: missedCount, color: "#EF4444" },
        { name: "Unmarked", value: unmarkedCount, color: "#252529" },
      ].filter((item) => item.value > 0);

      return {
        chartData: data.length > 0 ? data : [{ name: "No data", value: 1, color: "#252529" }],
        adherencePercent: adherence,
        totalScheduled: scheduledCount,
        totalDone: doneCount,
        totalMissed: missedCount,
        totalUnmarked: unmarkedCount,
      };
    }, [habit, logs, today, habitStartDate]);

  // Notes history
  const notesHistory = useMemo(() => {
    if (!logs) return [];
    const list: { date: string; note: string; state: string }[] = [];
    logs.forEach((log, dateStr) => {
      if (log.note && log.note.trim()) {
        list.push({ date: dateStr, note: log.note, state: log.state });
      }
    });
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [logs]);

  return (
    <div className="flex-1 flex flex-col pb-24">
      {/* A. Header */}
      <div className="sticky top-0 z-30 bg-[#09090B]/90 backdrop-blur-md border-b border-[#1C1C20] py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-xl text-[#918EA2] hover:text-white hover:bg-[#161619] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-base font-bold text-white">Habit Analytics</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="p-2 rounded-xl text-[#918EA2] hover:text-white hover:bg-[#161619] transition-colors"
            title="Edit habit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-2 rounded-xl text-[#FFB4AB] hover:bg-[#93000A]/30 transition-colors"
            title="Delete habit"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-5 mt-4">
        {/* B. Info Card */}
        <div className="p-4 rounded-2xl bg-[#161619] border border-[#1C1C20] flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#918EA2] uppercase tracking-wider block">
              {habit.type === "TARGET" ? "Target Habit" : "Check-in Habit"}
            </span>
            <h1 className="text-lg font-bold text-white">{habit.title}</h1>
            <p className="text-xs text-[#C8C4D9]">
              {habit.repeatType === "EVERYDAY"
                ? "Repeats Everyday"
                : habit.repeatType === "SPECIFIC_DAYS"
                ? `Specific Days: ${habit.repeatDays.map((d) => ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][d - 1]).join(", ")}`
                : `${habit.weeklyTargetCount} days per week`}
              {habit.type === "TARGET" && ` • Target: ${habit.targetValue} ${habit.targetUnit}`}
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#5A45FF]/15 border border-[#5A45FF]/30 flex items-center justify-center text-[#C5C0FF] shrink-0">
            <Flame className="w-5 h-5" />
          </div>
        </div>

        {/* C. Streak Pills (2-column) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-[#161619] border border-[#1C1C20] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFB77D]/15 border border-[#FFB77D]/30 flex items-center justify-center text-[#FFB77D]">
              <Flame className="w-5 h-5 fill-[#FFB77D]" />
            </div>
            <div>
              <span className="text-[11px] text-[#918EA2] block font-medium">Current Streak</span>
              <span className="text-base font-extrabold text-white">
                {currentStreak} {streakUnit}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#161619] border border-[#1C1C20] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C5C0FF]/15 border border-[#C5C0FF]/30 flex items-center justify-center text-[#C5C0FF]">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-[#918EA2] block font-medium">Best Streak</span>
              <span className="text-base font-extrabold text-white">
                {bestStreak} {streakUnit}
              </span>
            </div>
          </div>
        </div>

        {/* D. 7-Day Interactive Grid */}
        <div className="p-4 rounded-2xl bg-[#161619] border border-[#1C1C20] space-y-3">
          <span className="text-xs font-semibold text-[#918EA2] uppercase tracking-wider block">
            Last 7 Days (Tap to toggle)
          </span>

          <div className="grid grid-cols-7 gap-1">
            {last7Days.map((d, idx) => {
              const dStr = format(d, "yyyy-MM-dd");
              const isCur = dStr === todayStr;
              const isBeforeStart = isBefore(d, habitStartDate) && dStr !== habit.startDate;
              const isSched = isScheduledOnDay(d);

              const log = logs?.get(dStr);
              const isDone = isDayComplete(habit, log);
              const isMissed = log?.state === "MISSED";

              return (
                <div
                  key={idx}
                  onClick={() => !isBeforeStart && handleCycleDay(dStr)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onOpenNoteDialog(dStr, log?.note);
                  }}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border cursor-pointer transition-all ${
                    isCur
                      ? "border-[#C5C0FF] bg-[#1C1C20]"
                      : "border-transparent hover:bg-[#1C1C20]"
                  }`}
                >
                  <span className="text-[10px] text-[#918EA2] uppercase font-semibold">
                    {format(d, "EEE")}
                  </span>
                  <span className="text-[10px] text-white font-medium">{format(d, "d")}</span>

                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors ${
                      isBeforeStart
                        ? "bg-[#111114] text-[#918EA2]/40"
                        : isDone
                        ? "bg-[#68DBA9] text-black font-bold shadow-md shadow-[#68DBA9]/20"
                        : isMissed
                        ? "bg-[#EF4444] text-white font-bold"
                        : !isSched
                        ? "border border-[#474556]/40 text-[#918EA2] text-[9px] uppercase"
                        : "bg-[#252529] text-[#918EA2]"
                    }`}
                  >
                    {isBeforeStart ? (
                      <Lock className="w-3 h-3" />
                    ) : isDone ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : isMissed ? (
                      <X className="w-3.5 h-3.5 stroke-[3]" />
                    ) : !isSched ? (
                      "REST"
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          <span className="text-[10px] text-[#918EA2] block text-center italic">
            * Right-click any day to attach a reflection note.
          </span>
        </div>

        {/* E. Today's Large Actions */}
        <div className="p-4 rounded-2xl bg-[#161619] border border-[#1C1C20] space-y-3">
          <span className="text-xs font-semibold text-[#918EA2] uppercase tracking-wider block">
            Today&apos;s Action
          </span>

          {habit.type === "YES_NO" ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onSetState(todayStr, isCompletedToday ? "UNMARKED" : "DONE")}
                className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  isCompletedToday
                    ? "bg-[#68DBA9] text-black shadow-lg shadow-[#68DBA9]/25"
                    : "bg-[#111114] border border-[#68DBA9]/40 hover:bg-[#68DBA9]/20 text-[#68DBA9]"
                }`}
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Mark as Done</span>
              </button>

              <button
                type="button"
                onClick={() => onSetState(todayStr, isMissedToday ? "UNMARKED" : "MISSED")}
                className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  isMissedToday
                    ? "bg-[#EF4444] text-white shadow-lg shadow-[#EF4444]/25"
                    : "bg-[#111114] border border-[#EF4444]/40 hover:bg-[#EF4444]/20 text-[#EF4444]"
                }`}
              >
                <X className="w-4 h-4 stroke-[3]" />
                <span>Mark as Missed</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#111114] border border-[#1C1C20]">
              <div className="px-2">
                <span className="text-xs text-[#918EA2] block">Current Progress</span>
                <span className="text-base font-extrabold text-white">
                  {targetCurrentVal} / {habit.targetValue} {habit.targetUnit}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={targetCurrentVal <= 0}
                  onClick={() => onStepTarget(todayStr, -1)}
                  className="w-10 h-10 rounded-xl bg-[#252529] hover:bg-[#1C1C20] disabled:opacity-30 text-white flex items-center justify-center font-bold"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={targetCurrentVal >= habit.targetValue}
                  onClick={() => onStepTarget(todayStr, 1)}
                  className="w-10 h-10 rounded-xl bg-[#5A45FF] hover:bg-[#5A45FF]/90 disabled:opacity-30 text-white flex items-center justify-center font-bold shadow-md shadow-[#5A45FF]/30"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* F. Monthly Calendar Heatmap */}
        <div className="p-4 rounded-2xl bg-[#161619] border border-[#1C1C20] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#918EA2] uppercase tracking-wider">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentMonth(startOfMonth(today))}
                className="px-2.5 py-1 text-xs text-[#C5C0FF] hover:bg-[#252529] rounded-lg transition-colors font-medium"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-1 rounded-lg text-[#918EA2] hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-1 rounded-lg text-[#918EA2] hover:text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-[#918EA2] font-semibold py-1">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((d, idx) => {
              const dStr = format(d, "yyyy-MM-dd");
              const inMonth = isSameMonth(d, currentMonth);
              const isCur = isSameDay(d, today);
              const isBeforeStart = isBefore(d, habitStartDate) && dStr !== habit.startDate;
              const isSched = isScheduledOnDay(d);

              const log = logs?.get(dStr);
              const isDone = isDayComplete(habit, log);
              const isMissed = log?.state === "MISSED";

              return (
                <div
                  key={idx}
                  onClick={() => inMonth && !isBeforeStart && handleCycleDay(dStr)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (inMonth) onOpenNoteDialog(dStr, log?.note);
                  }}
                  className={`h-9 rounded-xl flex items-center justify-center text-xs font-semibold cursor-pointer transition-all ${
                    !inMonth
                      ? "opacity-20 cursor-default"
                      : isCur
                      ? "ring-1 ring-[#C5C0FF]"
                      : ""
                  } ${
                    isBeforeStart
                      ? "bg-[#111114] text-[#918EA2]/30 cursor-not-allowed"
                      : isDone
                      ? "bg-[#68DBA9] text-black font-bold shadow-sm shadow-[#68DBA9]/20"
                      : isMissed
                      ? "bg-[#EF4444] text-white"
                      : !isSched
                      ? "bg-[#111114] text-[#918EA2]/40"
                      : "bg-[#252529] text-[#918EA2] hover:bg-[#1C1C20]"
                  }`}
                  title={`${dStr}: ${isDone ? "Done" : isMissed ? "Missed" : !isSched ? "Rest" : "Unmarked"}`}
                >
                  {isBeforeStart ? (
                    <Lock className="w-3 h-3" />
                  ) : isDone ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : isMissed ? (
                    <X className="w-3 h-3 stroke-[3]" />
                  ) : (
                    <span>{format(d, "d")}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* G. Donut Chart Analytics (Recharts) */}
        <div className="p-4 rounded-2xl bg-[#161619] border border-[#1C1C20] space-y-3">
          <span className="text-xs font-semibold text-[#918EA2] uppercase tracking-wider block">
            Adherence Analytics (Last 90 Days)
          </span>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-4 py-2">
            <div className="relative w-44 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-white">{adherencePercent}%</span>
                <span className="text-[10px] text-[#918EA2] uppercase tracking-wider">
                  Adherence
                </span>
              </div>
            </div>

            {/* Legend with counts */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#68DBA9]" />
                <span className="text-white font-medium">Done:</span>
                <span className="text-[#918EA2]">{totalDone} days</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#EF4444]" />
                <span className="text-white font-medium">Missed:</span>
                <span className="text-[#918EA2]">{totalMissed} days</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#252529]" />
                <span className="text-white font-medium">Unmarked:</span>
                <span className="text-[#918EA2]">{totalUnmarked} days</span>
              </div>
              <div className="pt-2 border-t border-[#252529] text-[11px] text-[#918EA2]">
                Total Scheduled: {totalScheduled} days
              </div>
            </div>
          </div>
        </div>

        {/* H. Notes History */}
        <div className="p-4 rounded-2xl bg-[#161619] border border-[#1C1C20] space-y-3">
          <span className="text-xs font-semibold text-[#918EA2] uppercase tracking-wider block">
            Reflection Notes History ({notesHistory.length})
          </span>

          {notesHistory.length === 0 ? (
            <p className="text-xs text-[#918EA2] italic text-center py-4">
              No notes logged for this habit yet.
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {notesHistory.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-[#111114] border border-[#1C1C20] space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#C5C0FF] font-semibold">{item.date}</span>
                    <span
                      className={`font-semibold ${
                        item.state === "DONE" ? "text-[#68DBA9]" : "text-[#EF4444]"
                      }`}
                    >
                      {item.state}
                    </span>
                  </div>
                  <p className="text-xs text-[#E3E1EC] whitespace-pre-wrap">{item.note}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
