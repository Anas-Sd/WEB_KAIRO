import {
  format,
  parse,
  isValid,
  startOfDay,
  addDays,
  addMonths,
  isBefore,
  isSameDay,
} from "date-fns";
import { Task, TaskSection, RepeatType } from "@/types";

export function getTodayDisplayDate(): string {
  return format(new Date(), "MMM d");
}

export function parseDueDateMillis(
  dueDateStr?: string | null,
  fallback = Date.now()
): number {
  const raw = dueDateStr?.trim() || "";
  if (!raw) return fallback;

  const now = new Date();
  now.setHours(12, 0, 0, 0);

  const lower = raw.toLowerCase();
  if (lower.includes("today")) return now.getTime();
  if (lower.includes("tomorrow")) return addDays(now, 1).getTime();
  if (lower.includes("yesterday")) return addDays(now, -1).getTime();
  if (lower.includes("day after tomorrow")) return addDays(now, 2).getTime();

  const daysOfWeek: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  for (const [dayName, dayIndex] of Object.entries(daysOfWeek)) {
    if (lower.includes(dayName)) {
      const currentDay = now.getDay();
      let diff = dayIndex - currentDay;
      if (diff <= 0) diff += 7;
      return addDays(now, diff).getTime();
    }
  }

  const formats = [
    "MMM d",
    "MMM dd",
    "yyyy-MM-dd",
    "dd/MM/yyyy",
    "MMM dd, yyyy",
    "dd MMM yyyy",
    "EEE, MMM d",
    "d MMM",
    "yyyy-M-d",
  ];

  for (const fmt of formats) {
    try {
      const parsed = parse(raw, fmt, new Date());
      if (isValid(parsed)) {
        if (parsed.getFullYear() <= 1970) {
          parsed.setFullYear(new Date().getFullYear());
        }
        parsed.setHours(12, 0, 0, 0);
        return parsed.getTime();
      }
    } catch {
      // try next
    }
  }

  return fallback;
}

export function formatDisplayDate(
  dueDate?: string | null,
  dueDateMillis?: number | null
): string {
  if (dueDateMillis && dueDateMillis > 0) {
    return format(new Date(dueDateMillis), "MMM d");
  }
  const raw = dueDate?.trim() || "";
  if (!raw) return getTodayDisplayDate();
  const millis = parseDueDateMillis(raw);
  return format(new Date(millis), "MMM d");
}

export function calculateTriggerMillis(
  dueDate: string,
  dueTime?: string | null,
  dueDateMillis?: number | null
): number | null {
  const baseMillis = dueDateMillis || parseDueDateMillis(dueDate);
  const dateObj = new Date(baseMillis);

  let targetHour = 9;
  let targetMinute = 0;

  if (dueTime && dueTime.trim().length > 0) {
    const cleanTime = dueTime.trim();
    const formats = ["hh:mm a", "h:mm a", "HH:mm", "H:mm"];
    let parsed = false;

    for (const fmt of formats) {
      try {
        const timeDate = parse(cleanTime, fmt, new Date());
        if (isValid(timeDate)) {
          targetHour = timeDate.getHours();
          targetMinute = timeDate.getMinutes();
          parsed = true;
          break;
        }
      } catch {
        // try next
      }
    }

    if (!parsed) {
      const upper = cleanTime.toUpperCase();
      const isPM = upper.includes("PM");
      const isAM = upper.includes("AM");
      const digitsOnly = cleanTime.replace(/[^0-9:]/g, "");
      const parts = digitsOnly.split(":");
      if (parts.length >= 2) {
        let h = parseInt(parts[0], 10) || 9;
        const m = parseInt(parts[1], 10) || 0;
        if (isPM && h < 12) h += 12;
        else if (isAM && h === 12) h = 0;
        targetHour = h;
        targetMinute = m;
      }
    }
  }

  dateObj.setHours(targetHour, targetMinute, 0, 0);
  return dateObj.getTime();
}

export function formatRemainingTime(
  targetMillis: number,
  now = Date.now()
): string | null {
  const diffMs = targetMillis - now;
  if (diffMs <= 0) return null;

  const totalMinutes = Math.floor((diffMs + 59999) / 60000);
  if (totalMinutes < 60) {
    const mins = Math.max(1, totalMinutes);
    return `${mins} min`;
  }

  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMins = totalMinutes % 60;

  if (totalHours < 24) {
    const hrUnit = totalHours === 1 ? "hr" : "hrs";
    return remainingMins > 0
      ? `${totalHours} ${hrUnit} : ${remainingMins} min`
      : `${totalHours} ${hrUnit}`;
  }

  const days = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;
  const dayUnit = days === 1 ? "day" : "days";
  const hrUnit = remainingHours === 1 ? "hr" : "hrs";

  return remainingHours > 0
    ? `${days} ${dayUnit} : ${remainingHours} ${hrUnit}`
    : `${days} ${dayUnit}`;
}

export function calculateNextRepeatDueDate(
  currentDueDateMillis?: number | null,
  currentDueDateStr?: string | null,
  repeatType?: RepeatType,
  repeatDays?: string | null,
  repeatDates?: string | null
): { nextDueDate: string; nextDueDateMillis: number } | null {
  if (!repeatType || repeatType === "NONE") return null;

  const baseMillis = currentDueDateMillis || parseDueDateMillis(currentDueDateStr);
  let cal = new Date(baseMillis);

  const todayStart = startOfDay(new Date());
  if (isBefore(cal, todayStart)) {
    cal = new Date(todayStart);
  }

  const upperType = repeatType.toUpperCase();

  if (upperType === "EVERYDAY" || upperType === "DAILY") {
    cal = addDays(cal, 1);
    const ms = cal.getTime();
    return { nextDueDate: format(cal, "MMM d"), nextDueDateMillis: ms };
  }

  if (upperType === "DAYS") {
    const dayMap: Record<string, number> = {
      SUN: 0,
      MON: 1,
      TUE: 2,
      WED: 3,
      THU: 4,
      FRI: 5,
      SAT: 6,
    };

    const targetDays = new Set(
      (repeatDays || "")
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .map((s) => dayMap[s])
        .filter((n) => n !== undefined)
    );

    if (targetDays.size === 0 || targetDays.size === 7) {
      cal = addDays(cal, 1);
      const ms = cal.getTime();
      return { nextDueDate: format(cal, "MMM d"), nextDueDateMillis: ms };
    }

    for (let i = 1; i <= 14; i++) {
      cal = addDays(cal, 1);
      if (targetDays.has(cal.getDay())) {
        const ms = cal.getTime();
        return { nextDueDate: format(cal, "MMM d"), nextDueDateMillis: ms };
      }
    }

    cal = addDays(cal, 1);
    return { nextDueDate: format(cal, "MMM d"), nextDueDateMillis: cal.getTime() };
  }

  if (upperType === "MONTHLY_DATES" || upperType === "BOTH_MONTHLY") {
    cal = addMonths(cal, 1);
    const ms = cal.getTime();
    return { nextDueDate: format(cal, "MMM d"), nextDueDateMillis: ms };
  }

  cal = addDays(cal, 1);
  return { nextDueDate: format(cal, "MMM d"), nextDueDateMillis: cal.getTime() };
}

export function isTaskSnoozed(task: Task, now = Date.now()): boolean {
  if (task.isCompleted) return false;
  const snooze = task.snoozeUntilMillis;
  return !!snooze && snooze > now;
}

export function isTaskOverdue(task: Task, now = Date.now()): boolean {
  if (task.isCompleted) return false;
  if (isTaskSnoozed(task, now)) return false;
  if (task.dueDate.toLowerCase().includes("yesterday")) return true;

  const trigger = calculateTriggerMillis(task.dueDate, task.dueTime, task.dueDateMillis);
  if (trigger && trigger < now) return true;

  const todayStart = startOfDay(new Date()).getTime();
  const dateMillis = task.dueDateMillis || parseDueDateMillis(task.dueDate);
  if (dateMillis < todayStart) return true;

  return false;
}

export function isTaskToday(task: Task, now = Date.now()): boolean {
  if (task.isCompleted) return false;
  if (isTaskSnoozed(task, now)) return false;
  if (isTaskOverdue(task, now)) return false;

  const lower = task.dueDate.toLowerCase();
  if (lower.includes("today")) return true;

  const todayStart = startOfDay(new Date()).getTime();
  const tomorrowStart = addDays(new Date(todayStart), 1).getTime();
  const dateMillis = task.dueDateMillis || parseDueDateMillis(task.dueDate);

  return dateMillis >= todayStart && dateMillis < tomorrowStart;
}

export function isTaskTomorrow(task: Task, now = Date.now()): boolean {
  if (task.isCompleted) return false;
  if (isTaskSnoozed(task, now)) return false;
  if (isTaskOverdue(task, now)) return false;
  if (isTaskToday(task, now)) return false;

  const lower = task.dueDate.toLowerCase();
  if (lower.includes("tomorrow")) return true;

  const todayStart = startOfDay(new Date()).getTime();
  const tomorrowStart = addDays(new Date(todayStart), 1).getTime();
  const dayAfterStart = addDays(new Date(todayStart), 2).getTime();
  const dateMillis = task.dueDateMillis || parseDueDateMillis(task.dueDate);

  return dateMillis >= tomorrowStart && dateMillis < dayAfterStart;
}

export function isTaskUpcoming(task: Task, now = Date.now()): boolean {
  if (task.isCompleted) return false;
  if (isTaskSnoozed(task, now)) return false;
  if (isTaskOverdue(task, now)) return false;
  if (isTaskToday(task, now)) return false;
  if (isTaskTomorrow(task, now)) return false;
  return true;
}

export function categorizeTask(task: Task, now = Date.now()): TaskSection {
  if (task.isCompleted) return "COMPLETED";
  if (isTaskSnoozed(task, now)) return "SNOOZED";
  if (isTaskOverdue(task, now)) return "OVERDUE";
  if (isTaskToday(task, now)) return "TODAY";
  if (isTaskTomorrow(task, now)) return "TOMORROW";
  return "UPCOMING";
}

export function getTaskAlarmTargetMillis(task: Task, now = Date.now()): number | null {
  if (task.isCompleted) return null;
  if (task.snoozeUntilMillis && task.snoozeUntilMillis > now) {
    return task.snoozeUntilMillis;
  }
  const trigger = calculateTriggerMillis(task.dueDate, task.dueTime, task.dueDateMillis);
  if (trigger && trigger > now) {
    return trigger;
  }
  return null;
}

export function getNextUpcomingAlarm(
  tasks: Task[],
  now = Date.now()
): { task: Task; triggerMillis: number } | null {
  let closest: { task: Task; triggerMillis: number } | null = null;
  for (const t of tasks) {
    const target = getTaskAlarmTargetMillis(t, now);
    if (target) {
      if (!closest || target < closest.triggerMillis) {
        closest = { task: t, triggerMillis: target };
      }
    }
  }
  return closest;
}
