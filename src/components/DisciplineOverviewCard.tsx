"use client";

import React from "react";
import { Flame, CheckCircle2, Circle } from "lucide-react";
import { Habit, HabitLog } from "@/types";
import { format } from "date-fns";
import { isDayComplete } from "@/store/useHabitStore";

interface DisciplineOverviewCardProps {
  habits: Habit[];
  logs: Map<string, Map<string, HabitLog>>;
}

export function DisciplineOverviewCard({ habits, logs }: DisciplineOverviewCardProps) {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const toIsoDay = (d: Date) => (d.getDay() === 0 ? 7 : d.getDay());
  const currentIsoDay = toIsoDay(new Date());

  // Habits scheduled today
  const scheduledToday = habits.filter((h) => {
    if (h.repeatType === "EVERYDAY") return true;
    if (h.repeatType === "SPECIFIC_DAYS") return h.repeatDays.includes(currentIsoDay);
    if (h.repeatType === "WEEKLY_X") return true;
    return true;
  });

  let completedTodayCount = 0;
  for (const h of scheduledToday) {
    const habitLogs = logs.get(h.id);
    const log = habitLogs?.get(todayStr);
    if (isDayComplete(h, log)) {
      completedTodayCount++;
    }
  }

  const total = scheduledToday.length;
  const remaining = Math.max(0, total - completedTodayCount);
  const percent = total > 0 ? Math.round((completedTodayCount / total) * 100) : 0;

  // Best streak among active habits
  let maxStreak = 0;
  for (const h of habits) {
    const habitLogs = logs.get(h.id);
    if (habitLogs) {
      let streak = 0;
      let check = new Date();
      while (true) {
        const dStr = format(check, "yyyy-MM-dd");
        if (isDayComplete(h, habitLogs.get(dStr))) {
          streak++;
          check.setDate(check.getDate() - 1);
        } else {
          break;
        }
      }
      if (streak > maxStreak) maxStreak = streak;
    }
  }

  // SVG Circular progress
  const strokeWidth = 8;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative overflow-hidden p-5 rounded-3xl bg-gradient-to-br from-[#161619] to-[#0C0C0F] border border-[#1C1C20] shadow-xl mb-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#918EA2]">
            Daily Focus
          </span>
          <h2 className="text-xl font-bold text-white tracking-tight">Today&apos;s Discipline</h2>
          <div className="flex items-center gap-3 pt-2 text-xs text-[#C8C4D9]">
            <span className="flex items-center gap-1 font-medium text-white">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#68DBA9]" />
              {completedTodayCount}/{total} completed
            </span>
            <span>•</span>
            <span className="text-[#918EA2]">{remaining} remaining</span>
            {maxStreak > 0 && (
              <>
                <span>•</span>
                <span className="inline-flex items-center gap-1 text-[#FFB77D] font-bold">
                  <Flame className="w-3.5 h-3.5 fill-[#FFB77D]" />
                  {maxStreak}d streak
                </span>
              </>
            )}
          </div>
        </div>

        {/* Circular Progress Ring */}
        <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-[#1C1C20]"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-[#5A45FF] transition-all duration-500 ease-out"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-black text-white">{percent}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
