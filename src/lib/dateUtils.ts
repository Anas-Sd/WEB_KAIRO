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

  // Strip any appended time portions, e.g. "Nov 24 at 19:56", "Nov 24 @ 7:00 PM"
  const clean = raw.split(/ at /i)[0].split("@")[0].trim();
  if (!clean) return fallback;

  const now = new Date();
  now.setHours(12, 0, 0, 0);

  const lower = clean.toLowerCase();
  if (lower === "today" || lower.startsWith("today")) return now.getTime();
  if (lower === "tomorrow" || lower.startsWith("tomorrow")) return addDays(now, 1).getTime();
  if (lower === "yesterday" || lower.startsWith("yesterday")) return addDays(now, -1).getTime();
  if (lower.includes("day after tomorrow")) return addDays(now, 2).getTime();

  // Try direct Date.parse first (handles ISO strings and standard date formats)
  const direct = Date.parse(clean);
  if (!isNaN(direct)) {
    const d = new Date(direct);
    if (d.getFullYear() > 1970) {
      d.setHours(12, 0, 0, 0);
      return d.getTime();
    }
  }

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
    "MM/dd/yyyy",
    "MMM dd, yyyy",
    "MMM d, yyyy",
    "dd MMM yyyy",
    "d MMM yyyy",
    "EEE, MMM d",
    "EEEE, MMM d",
    "d MMM",
    "yyyy-M-d",
  ];

  for (const fmt of formats) {
    try {
      const parsed = parse(clean, fmt, new Date());
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

/**
 * Returns accurate epoch milliseconds combining task's due date AND due time for sorting.
 * If task has an explicit due time (e.g. 09:30, 14:00), that exact time is applied.
 * Untimed tasks default to end-of-day (23:59:59) so timed tasks on the same date appear first in ASC.
 */
export function getTaskSortDueMillis(task: Task): number {
  let dayMillis: number;
  if (task.dueDateMillis && !isNaN(task.dueDateMillis) && task.dueDateMillis > 0) {
    dayMillis = task.dueDateMillis;
  } else {
    dayMillis = parseDueDateMillis(task.dueDate, task.createdAt || Date.now());
  }

  const d = new Date(dayMillis);
  if (isNaN(d.getTime())) {
    return task.createdAt || Date.now();
  }

  d.setHours(0, 0, 0, 0);

  if (task.dueTime && task.dueTime.trim()) {
    const rawTime = task.dueTime.trim();
    const match = rawTime.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const meridiem = match[3]?.toUpperCase();

      if (meridiem === "PM" && hours < 12) hours += 12;
      else if (meridiem === "AM" && hours === 12) hours = 0;

      d.setHours(hours, minutes, 0, 0);
      return d.getTime();
    }
  }

  d.setHours(23, 59, 59, 0);
  return d.getTime();
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

/**
 * Calculates the next future occurrence timestamp for a recurring task.
 * Ensures that recurring reminders are always scheduled ahead even if past instances were not completed.
 */
/**
 * Determines whether a specific calendar date matches a task's recurrence definition.
 * Supports: EVERYDAY, DAILY, DAYS (specific weekdays), DATES (specific dates),
 * MONTHLY_DATES (dates repeated every month), BOTH (weekdays + specific dates),
 * and BOTH_MONTHLY (weekdays + monthly dates).
 */
export function isDateMatchingRecurrence(
  date: Date,
  repeatType?: string | null,
  repeatDays?: string | null,
  repeatDates?: string | null
): boolean {
  if (!repeatType || repeatType.toUpperCase() === "NONE") return false;

  const type = repeatType.toUpperCase();
  if (type === "EVERYDAY" || type === "DAILY") return true;

  const hasDays = type.includes("DAYS") || type.includes("BOTH");
  const hasDates = type.includes("DATES") || type.includes("BOTH");

  let daysMatch = false;
  if (hasDays && repeatDays && repeatDays.trim().length > 0) {
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
      repeatDays
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .map((s) => dayMap[s])
        .filter((n) => n !== undefined)
    );
    if (targetDays.has(date.getDay())) {
      daysMatch = true;
    }
  }

  let datesMatch = false;
  if (hasDates && repeatDates && repeatDates.trim().length > 0) {
    const isMonthly = type.includes("MONTHLY");
    const rawDateList = repeatDates.split(",").map((s) => s.trim()).filter((s) => s.length > 0);

    if (isMonthly) {
      const currentDayOfMonth = date.getDate();
      for (const dateStr of rawDateList) {
        const dayNum = parseInt(dateStr.replace(/[^0-9]/g, ""), 10);
        if (!isNaN(dayNum) && dayNum === currentDayOfMonth) {
          datesMatch = true;
          break;
        }
      }
    } else {
      const formats = ["MMM d", "MMM dd", "yyyy-MM-dd"];
      const currentMonth = date.getMonth();
      const currentDay = date.getDate();

      for (const dateStr of rawDateList) {
        for (const fmt of formats) {
          try {
            const parsed = parse(dateStr, fmt, new Date());
            if (isValid(parsed)) {
              if (parsed.getMonth() === currentMonth && parsed.getDate() === currentDay) {
                datesMatch = true;
                break;
              }
            }
          } catch {}
        }
        if (datesMatch) break;
      }
    }
  }

  if (hasDays && hasDates) {
    return daysMatch || datesMatch;
  }
  if (hasDays) return daysMatch;
  if (hasDates) return datesMatch;
  return false;
}

export function calculateNextFutureTriggerMillis(
  dueTime?: string | null,
  repeatType?: RepeatType,
  repeatDays?: string | null,
  repeatDates?: string | null,
  now = Date.now()
): number | null {
  if (!repeatType || repeatType === "NONE") return null;

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
      } catch {}
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

  // Today candidate
  let candidate = new Date(now);
  candidate.setHours(targetHour, targetMinute, 0, 0);

  // If today's time has already elapsed, start searching from tomorrow
  if (candidate.getTime() <= now) {
    candidate = addDays(candidate, 1);
  }

  for (let i = 0; i <= 366; i++) {
    if (isDateMatchingRecurrence(candidate, repeatType, repeatDays, repeatDates)) {
      return candidate.getTime();
    }
    candidate = addDays(candidate, 1);
  }

  return null;
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
  repeatDates?: string | null,
  dueTime?: string | null
): { nextDueDate: string; nextDueDateMillis: number } | null {
  if (!repeatType || repeatType === "NONE") return null;

  const baseMillis = currentDueDateMillis || parseDueDateMillis(currentDueDateStr);

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
      } catch {}
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

  let candidate = new Date(baseMillis);
  candidate.setHours(targetHour, targetMinute, 0, 0);

  const now = Date.now();
  if (candidate.getTime() <= now) {
    candidate = new Date(now);
    candidate.setHours(targetHour, targetMinute, 0, 0);
    if (candidate.getTime() <= now) {
      candidate = addDays(candidate, 1);
    }
  } else {
    candidate = addDays(candidate, 1);
  }

  for (let i = 0; i <= 366; i++) {
    if (isDateMatchingRecurrence(candidate, repeatType, repeatDays, repeatDates)) {
      const dayStart = startOfDay(candidate).getTime();
      return { nextDueDate: format(candidate, "MMM d"), nextDueDateMillis: dayStart };
    }
    candidate = addDays(candidate, 1);
  }

  const fallback = addDays(new Date(baseMillis), 1);
  return { nextDueDate: format(fallback, "MMM d"), nextDueDateMillis: startOfDay(fallback).getTime() };
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

export function determineTaskSection(
  dueDateStr: string,
  dueDateMillis?: number | null,
  dueTime?: string | null,
  now = Date.now()
): "OVERDUE" | "TODAY" | "UPCOMING" | "COMPLETED" {
  const todayStart = startOfDay(new Date(now)).getTime();
  const dateMillis = dueDateMillis || parseDueDateMillis(dueDateStr, now);
  if (dateMillis < todayStart) {
    return "OVERDUE";
  }
  const todayEnd = todayStart + 86400000 - 1;
  if (dateMillis <= todayEnd || dueDateStr.toLowerCase().includes("today")) {
    return "TODAY";
  }
  return "UPCOMING";
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
  if (task.repeatType && task.repeatType !== "NONE") {
    const nextFuture = calculateNextFutureTriggerMillis(
      task.dueTime,
      task.repeatType,
      task.repeatDays,
      task.repeatDates,
      now
    );
    if (nextFuture && nextFuture > now) {
      return nextFuture;
    }
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
