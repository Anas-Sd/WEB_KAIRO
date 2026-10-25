import { create } from "zustand";
import {
  Habit,
  HabitDto,
  HabitLog,
  HabitLogDto,
  HabitType,
  HabitRepeatType,
  NotePrompt,
} from "@/types";
import { supabase } from "@/lib/supabase";
import {
  format,
  subDays,
  parseISO,
  isBefore,
  startOfWeek,
  addDays,
  startOfDay,
  isSameDay,
} from "date-fns";

interface HabitStoreState {
  habits: Habit[];
  logs: Map<string, Map<string, HabitLog>>; // habitId -> (dateString -> HabitLog)
  selectedHabitId: string | null;
  isLoading: boolean;
  error: string | null;
  isSelectionMode: boolean;
  selectedHabitIds: Set<string>;
  searchQuery: string;

  // Actions
  fetchHabits: (userCode: string) => Promise<void>;
  fetchLogs: (userCode: string) => Promise<void>;
  subscribeRealtime: (userCode: string) => () => void;
  createHabit: (userCode: string, payload: Partial<Habit>) => Promise<Habit | null>;
  updateHabit: (userCode: string, habitId: string, patch: Partial<Habit>) => Promise<void>;
  deleteHabit: (userCode: string, habitId: string) => Promise<void>;
  batchDeleteHabits: (userCode: string, habitIds: string[]) => Promise<void>;
  reorderHabits: (userCode: string, reorderedHabits: Habit[]) => Promise<void>;

  // Log Actions
  setHabitState: (
    userCode: string,
    habitId: string,
    date: string,
    state: "DONE" | "MISSED" | "UNMARKED",
    value?: number | null,
    note?: string | null
  ) => Promise<void>;
  stepTargetValue: (
    userCode: string,
    habitId: string,
    date: string,
    delta: number
  ) => Promise<{ needNote: boolean; currentVal: number }>;
  autoMarkMissedPastDays: (userCode: string) => Promise<void>;

  // UI state
  setSelectedHabitId: (habitId: string | null) => void;
  setSearchQuery: (query: string) => void;
  enterSelectionMode: () => void;
  exitSelectionMode: () => void;
  toggleSelectHabit: (habitId: string) => void;
  selectAllHabits: (habitIds: string[]) => void;
  clearSelection: () => void;
}

export function isDayComplete(habit: Habit, log?: HabitLog): boolean {
  if (!log) return false;
  if (habit.type === "TARGET") {
    return (log.value ?? 0) >= habit.targetValue || log.state === "DONE";
  }
  return log.state === "DONE";
}

export function getEffectiveStartDate(habit: Habit): Date {
  if (habit.startDate && habit.startDate.trim().length > 0) {
    try {
      const d = parseISO(habit.startDate);
      if (!isNaN(d.getTime())) {
        return startOfDay(d);
      }
    } catch {}
  }
  if (habit.createdAt) {
    try {
      const d = new Date(habit.createdAt);
      if (!isNaN(d.getTime())) {
        return startOfDay(d);
      }
    } catch {}
  }
  return startOfDay(new Date());
}

export interface EffectiveDayInfo {
  state: "DONE" | "MISSED" | "UNMARKED";
  value: number;
  note: string | null;
  isRest: boolean;
  isBeforeStart: boolean;
  isPast: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export function getEffectiveDayState(
  habit: Habit,
  date: Date,
  log?: HabitLog,
  today = new Date()
): EffectiveDayInfo {
  const toIsoDay = (d: Date) => (d.getDay() === 0 ? 7 : d.getDay());
  const dateStr = format(date, "yyyy-MM-dd");
  const todayStr = format(today, "yyyy-MM-dd");

  const isToday = dateStr === todayStr;
  const isPast = isBefore(startOfDay(date), startOfDay(today));
  const isFuture = isBefore(startOfDay(today), startOfDay(date));

  const habitStartDate = getEffectiveStartDate(habit);
  const isBeforeStart = isBefore(startOfDay(date), habitStartDate);
  const isRest =
    habit.repeatType === "SPECIFIC_DAYS" && !habit.repeatDays.includes(toIsoDay(date));

  const value = log?.value ?? (log?.state === "DONE" ? (habit.targetValue || 1) : 0);
  const note = log?.note ?? null;

  let state: "DONE" | "MISSED" | "UNMARKED" = "UNMARKED";
  if (isRest || isBeforeStart) {
    state = "UNMARKED";
  } else if (isPast) {
    // In Android: any past day before today is either DONE or MISSED
    if (isDayComplete(habit, log)) {
      state = "DONE";
    } else {
      state = "MISSED";
    }
  } else if (isToday) {
    if (isDayComplete(habit, log)) {
      state = "DONE";
    } else if (log?.state === "MISSED") {
      state = "MISSED";
    } else {
      state = "UNMARKED";
    }
  } else {
    state = "UNMARKED";
  }

  return {
    state,
    value,
    note,
    isRest,
    isBeforeStart,
    isPast,
    isToday,
    isFuture,
  };
}

export function calculateHabitCounts(
  habit: Habit,
  logs: Map<string, HabitLog> | undefined,
  today = new Date()
) {
  const habitStartDate = getEffectiveStartDate(habit);
  const logsMap = logs || new Map();
  let totalDone = 0;
  let totalMissed = 0;

  logsMap.forEach((rec, dateStr) => {
    try {
      const d = parseISO(dateStr);
      if (!isBefore(d, habitStartDate)) {
        if (isDayComplete(habit, rec)) {
          totalDone++;
        } else if (rec.state === "MISSED") {
          totalMissed++;
        }
      }
    } catch {}
  });

  // Weekly done count for this current week (Monday to Sunday)
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  let weeklyDoneCount = 0;
  for (let i = 0; i < 7; i++) {
    const cur = addDays(currentWeekStart, i);
    const curStr = format(cur, "yyyy-MM-dd");
    const rec = logsMap.get(curStr);
    if (isDayComplete(habit, rec)) {
      weeklyDoneCount++;
    }
  }

  return { totalDone, totalMissed, weeklyDoneCount };
}

export function calculateHabitStreak(
  habit: Habit,
  habitLogs: Map<string, HabitLog>,
  today = new Date()
): { currentStreak: number; bestStreak: number } {
  const todayStr = format(today, "yyyy-MM-dd");

  if (habit.repeatType === "EVERYDAY") {
    const todayDone = isDayComplete(habit, habitLogs.get(todayStr));
    let streak = 0;
    let checkDate = todayDone ? today : subDays(today, 1);

    while (true) {
      const dStr = format(checkDate, "yyyy-MM-dd");
      if (isDayComplete(habit, habitLogs.get(dStr))) {
        streak++;
        checkDate = subDays(checkDate, 1);
      } else {
        break;
      }
    }
    return { currentStreak: streak, bestStreak: Math.max(streak, 0) };
  }

  if (habit.repeatType === "SPECIFIC_DAYS") {
    // habit.repeatDays: 1=Mon..7=Sun
    // JS getDay(): 0=Sun, 1=Mon, ..., 6=Sat
    const toIsoDay = (d: Date) => (d.getDay() === 0 ? 7 : d.getDay());

    const isTodayScheduled = habit.repeatDays.includes(toIsoDay(today));
    const todayDone = isDayComplete(habit, habitLogs.get(todayStr));

    let streak = 0;
    let checkDate =
      isTodayScheduled && todayDone
        ? today
        : (() => {
            let prev = subDays(today, 1);
            let safety = 0;
            while (!habit.repeatDays.includes(toIsoDay(prev)) && safety < 14) {
              prev = subDays(prev, 1);
              safety++;
            }
            return prev;
          })();

    let safety = 0;
    while (safety < 365) {
      safety++;
      const isoDay = toIsoDay(checkDate);
      if (habit.repeatDays.includes(isoDay)) {
        const dStr = format(checkDate, "yyyy-MM-dd");
        if (isDayComplete(habit, habitLogs.get(dStr))) {
          streak++;
          checkDate = subDays(checkDate, 1);
        } else {
          break;
        }
      } else {
        // Rest day -> skip without breaking streak
        checkDate = subDays(checkDate, 1);
      }
    }
    return { currentStreak: streak, bestStreak: Math.max(streak, 0) };
  }

  if (habit.repeatType === "WEEKLY_X") {
    const weeklyTarget = Math.max(1, Math.min(7, habit.weeklyTargetCount || 3));
    const toIsoDay = (d: Date) => (d.getDay() === 0 ? 7 : d.getDay());

    // Monday as start of week
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    let currentWeekDone = 0;
    let d = new Date(currentWeekStart);

    while (!isBefore(today, d)) {
      const dStr = format(d, "yyyy-MM-dd");
      if (isDayComplete(habit, habitLogs.get(dStr))) {
        currentWeekDone++;
      }
      d = addDays(d, 1);
    }

    const currentWeekTargetReached = currentWeekDone >= weeklyTarget;
    const daysRemainingInWeek = 7 - toIsoDay(today);
    const currentWeekPossible = currentWeekDone + daysRemainingInWeek >= weeklyTarget;

    if (!currentWeekTargetReached && !currentWeekPossible) {
      return { currentStreak: 0, bestStreak: 0 };
    }

    let streak = currentWeekTargetReached ? 1 : 0;
    let checkWeekStart = subDays(currentWeekStart, 7);
    let weekSafety = 0;

    while (weekSafety < 52) {
      weekSafety++;
      let weekDoneCount = 0;
      for (let offset = 0; offset < 7; offset++) {
        const dayInWeek = addDays(checkWeekStart, offset);
        const dStr = format(dayInWeek, "yyyy-MM-dd");
        if (isDayComplete(habit, habitLogs.get(dStr))) {
          weekDoneCount++;
        }
      }

      if (weekDoneCount >= weeklyTarget) {
        streak++;
        checkWeekStart = subDays(checkWeekStart, 7);
      } else {
        break;
      }
    }

    return { currentStreak: streak, bestStreak: Math.max(streak, 0) };
  }

  return { currentStreak: 0, bestStreak: 0 };
}

function dtoHabitToDomain(dto: HabitDto): Habit {
  const repeatDaysArr = (dto.repeat_days || "1,2,3,4,5,6,7")
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n));

  return {
    id: dto.id,
    userCode: dto.user_code,
    title: dto.title,
    type: (dto.type as HabitType) || "YES_NO",
    targetValue: dto.target_value ?? 1,
    targetUnit: dto.target_unit ?? "",
    repeatType: (dto.repeat_type as HabitRepeatType) || "EVERYDAY",
    repeatDays: repeatDaysArr.length > 0 ? repeatDaysArr : [1, 2, 3, 4, 5, 6, 7],
    weeklyTargetCount: dto.weekly_target_count ?? 3,
    reminderEnabled: dto.reminder_enabled ?? false,
    reminderTime: dto.reminder_time ?? null,
    reminderToneUri: dto.reminder_tone_uri ?? null,
    reminderToneTitle: dto.reminder_tone_title ?? null,
    position: dto.position ?? 0,
    notePrompt: (dto.note_prompt as NotePrompt) || "BOTH",
    startDate: dto.start_date || format(new Date(), "yyyy-MM-dd"),
    createdAt: dto.created_at ?? Date.now(),
    updatedAt: dto.updated_at ?? Date.now(),
  };
}

function habitDomainToDto(habit: Habit): HabitDto {
  return {
    id: habit.id,
    user_code: habit.userCode,
    title: habit.title,
    type: habit.type,
    target_value: habit.targetValue,
    target_unit: habit.targetUnit,
    repeat_type: habit.repeatType,
    repeat_days: habit.repeatDays.join(","),
    weekly_target_count: habit.weeklyTargetCount,
    reminder_enabled: habit.reminderEnabled,
    reminder_time: habit.reminderTime,
    reminder_tone_uri: habit.reminderToneUri,
    reminder_tone_title: habit.reminderToneTitle,
    position: habit.position,
    note_prompt: habit.notePrompt,
    start_date: habit.startDate,
    created_at: habit.createdAt,
    updated_at: habit.updatedAt,
  };
}

function dtoLogToDomain(dto: HabitLogDto): HabitLog {
  return {
    id: dto.id,
    habitId: dto.habit_id,
    userCode: dto.user_code,
    date: dto.date,
    state: (dto.state as any) || "DONE",
    value: dto.value ?? null,
    note: dto.note ?? null,
    createdAt: dto.created_at ?? Date.now(),
  };
}

function logDomainToDto(log: HabitLog): HabitLogDto {
  return {
    id: log.id,
    habit_id: log.habitId,
    user_code: log.userCode,
    date: log.date,
    state: log.state,
    value: log.value,
    note: log.note,
    created_at: log.createdAt,
  };
}

export const useHabitStore = create<HabitStoreState>((set, get) => ({
  habits: [],
  logs: new Map(),
  selectedHabitId: null,
  isLoading: false,
  error: null,
  isSelectionMode: false,
  selectedHabitIds: new Set<string>(),
  searchQuery: "",

  fetchHabits: async (userCode: string) => {
    if (!userCode) return;
    if (get().habits.length === 0) {
      set({ isLoading: true, error: null });
    }
    try {
      const { data, error } = await supabase
        .from("habits")
        .select("*")
        .eq("user_code", userCode)
        .order("position", { ascending: true });

      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }

      set({ habits: (data || []).map(dtoHabitToDomain), isLoading: false });
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : "Failed to load habits",
        isLoading: false,
      });
    }
  },

  fetchLogs: async (userCode: string) => {
    if (!userCode) return;
    try {
      const { data, error } = await supabase
        .from("habit_logs")
        .select("*")
        .eq("user_code", userCode);

      if (error) {
        console.error("Failed to load habit logs:", error);
        return;
      }

      const map = new Map<string, Map<string, HabitLog>>();
      for (const row of data || []) {
        const domain = dtoLogToDomain(row);
        if (!map.has(domain.habitId)) {
          map.set(domain.habitId, new Map());
        }
        map.get(domain.habitId)!.set(domain.date, domain);
      }

      set({ logs: map });
    } catch (err) {
      console.error("Error loading habit logs:", err);
    }
  },

  subscribeRealtime: (userCode: string) => {
    if (!userCode) return () => {};

    const habitsChannel = supabase
      .channel(`realtime:habits:${userCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "habits",
          filter: `user_code=eq.${userCode}`,
        },
        (payload) => {
          const current = get().habits;
          if (payload.eventType === "INSERT") {
            const newHabit = dtoHabitToDomain(payload.new as HabitDto);
            if (!current.some((h) => h.id === newHabit.id)) {
              set({ habits: [...current, newHabit] });
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = dtoHabitToDomain(payload.new as HabitDto);
            set({ habits: current.map((h) => (h.id === updated.id ? updated : h)) });
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id: string })?.id;
            if (deletedId) {
              set({ habits: current.filter((h) => h.id !== deletedId) });
            }
          }
        }
      )
      .subscribe();

    const logsChannel = supabase
      .channel(`realtime:habit_logs:${userCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "habit_logs",
          filter: `user_code=eq.${userCode}`,
        },
        (payload) => {
          const currentLogs = new Map(get().logs);
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const log = dtoLogToDomain(payload.new as HabitLogDto);
            if (!currentLogs.has(log.habitId)) {
              currentLogs.set(log.habitId, new Map());
            }
            currentLogs.get(log.habitId)!.set(log.date, log);
            set({ logs: currentLogs });
          } else if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { habit_id?: string; date?: string; id?: string };
            if (oldRow?.habit_id && oldRow?.date) {
              const hMap = currentLogs.get(oldRow.habit_id);
              if (hMap) {
                hMap.delete(oldRow.date);
                set({ logs: currentLogs });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(habitsChannel);
      supabase.removeChannel(logsChannel);
    };
  },

  createHabit: async (userCode: string, payload: Partial<Habit>) => {
    const title = payload.title?.trim();
    if (!title) return null;

    const now = Date.now();
    const id = crypto.randomUUID();
    const newHabit: Habit = {
      id,
      userCode,
      title,
      type: payload.type || "YES_NO",
      targetValue: payload.targetValue ?? 1,
      targetUnit: payload.targetUnit ?? "",
      repeatType: payload.repeatType || "EVERYDAY",
      repeatDays: payload.repeatDays || [1, 2, 3, 4, 5, 6, 7],
      weeklyTargetCount: payload.weeklyTargetCount ?? 3,
      reminderEnabled: payload.reminderEnabled ?? false,
      reminderTime: payload.reminderTime ?? null,
      reminderToneUri: payload.reminderToneUri ?? null,
      reminderToneTitle: payload.reminderToneTitle ?? "Default Alarm Tone",
      position: get().habits.length,
      notePrompt: payload.notePrompt || "BOTH",
      startDate: payload.startDate || format(new Date(), "yyyy-MM-dd"),
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({ habits: [...state.habits, newHabit] }));
    await supabase.from("habits").insert(habitDomainToDto(newHabit));
    return newHabit;
  },

  updateHabit: async (userCode: string, habitId: string, patch: Partial<Habit>) => {
    const now = Date.now();
    set((state) => ({
      habits: state.habits.map((h) =>
        h.id === habitId ? { ...h, ...patch, updatedAt: now } : h
      ),
    }));

    const existing = get().habits.find((h) => h.id === habitId);
    if (existing) {
      await supabase.from("habits").update(habitDomainToDto(existing)).eq("id", habitId);
    }
  },

  deleteHabit: async (userCode: string, habitId: string) => {
    set((state) => {
      const nextLogs = new Map(state.logs);
      nextLogs.delete(habitId);
      return {
        habits: state.habits.filter((h) => h.id !== habitId),
        logs: nextLogs,
        selectedHabitId: state.selectedHabitId === habitId ? null : state.selectedHabitId,
      };
    });

    await supabase.from("habit_logs").delete().eq("habit_id", habitId);
    await supabase.from("habits").delete().eq("id", habitId);
  },

  batchDeleteHabits: async (userCode: string, habitIds: string[]) => {
    const setIds = new Set(habitIds);
    set((state) => {
      const nextLogs = new Map(state.logs);
      for (const id of habitIds) {
        nextLogs.delete(id);
      }
      return {
        habits: state.habits.filter((h) => !setIds.has(h.id)),
        logs: nextLogs,
        selectedHabitIds: new Set(),
        isSelectionMode: false,
      };
    });

    for (const id of habitIds) {
      await supabase.from("habit_logs").delete().eq("habit_id", id);
      await supabase.from("habits").delete().eq("id", id);
    }
  },

  reorderHabits: async (userCode: string, reorderedHabits: Habit[]) => {
    const updated = reorderedHabits.map((h, idx) => ({ ...h, position: idx }));
    set({ habits: updated });

    for (const h of updated) {
      await supabase.from("habits").update({ position: h.position }).eq("id", h.id);
    }
  },

  setHabitState: async (
    userCode: string,
    habitId: string,
    date: string,
    state: "DONE" | "MISSED" | "UNMARKED",
    value = null,
    note = null
  ) => {
    const currentLogs = new Map(get().logs);
    if (!currentLogs.has(habitId)) {
      currentLogs.set(habitId, new Map());
    }
    const habitMap = currentLogs.get(habitId)!;
    const existingLog = habitMap.get(date);

    if (state === "UNMARKED") {
      habitMap.delete(date);
      set({ logs: currentLogs });
      await supabase.from("habit_logs").delete().eq("habit_id", habitId).eq("date", date);
      return;
    }

    const logId = `${habitId}_${date}`;
    const newLog: HabitLog = {
      id: logId,
      habitId,
      userCode,
      date,
      state,
      value: value ?? (existingLog?.value ?? null),
      note: note !== undefined ? note : (existingLog?.note ?? null),
      createdAt: existingLog?.createdAt ?? Date.now(),
    };

    habitMap.set(date, newLog);
    set({ logs: currentLogs });

    await supabase.from("habit_logs").upsert(logDomainToDto(newLog));
  },

  stepTargetValue: async (userCode: string, habitId: string, date: string, delta: number) => {
    const habit = get().habits.find((h) => h.id === habitId);
    if (!habit) return { needNote: false, currentVal: 0 };

    const habitLogs = get().logs.get(habitId);
    const existing = habitLogs?.get(date);
    const currentVal = existing?.value ?? 0;
    const nextVal = Math.max(0, Math.min(habit.targetValue, currentVal + delta));

    const state: "DONE" | "MISSED" = nextVal >= habit.targetValue ? "DONE" : "MISSED";

    await get().setHabitState(userCode, habitId, date, state, nextVal, existing?.note);

    const needNote =
      delta > 0 &&
      (habit.notePrompt === "BOTH" || habit.notePrompt === "DONE_ONLY");

    return { needNote, currentVal: nextVal };
  },

  autoMarkMissedPastDays: async (userCode: string) => {
    const habits = get().habits;
    const logs = get().logs;
    const today = startOfDay(new Date());
    const toIsoDay = (d: Date) => (d.getDay() === 0 ? 7 : d.getDay());

    const logsToUpsert: HabitLogDto[] = [];
    const currentLogs = new Map(logs);

    for (const habit of habits) {
      const habitStartDate = getEffectiveStartDate(habit);
      const minDate = subDays(today, 60);
      const start = isBefore(minDate, habitStartDate) ? habitStartDate : minDate;

      let checkDate = start;
      const habitDates = currentLogs.get(habit.id) || new Map();

      while (isBefore(checkDate, today)) {
        let isScheduled = false;
        if (habit.repeatType === "EVERYDAY") {
          isScheduled = true;
        } else if (habit.repeatType === "SPECIFIC_DAYS") {
          isScheduled = habit.repeatDays.includes(toIsoDay(checkDate));
        }

        if (isScheduled) {
          const dateStr = format(checkDate, "yyyy-MM-dd");
          const existing = habitDates.get(dateStr);
          const isDone = isDayComplete(habit, existing);

          if (!isDone && existing?.state !== "MISSED") {
            const missedLog: HabitLog = {
              id: `${habit.id}_${dateStr}`,
              habitId: habit.id,
              userCode,
              date: dateStr,
              state: "MISSED",
              value: existing?.value ?? 0,
              note: existing?.note || "missed",
              createdAt: existing?.createdAt ?? Date.now(),
            };
            habitDates.set(dateStr, missedLog);
            logsToUpsert.push(logDomainToDto(missedLog));
          }
        }
        checkDate = addDays(checkDate, 1);
      }
      currentLogs.set(habit.id, habitDates);
    }

    if (logsToUpsert.length > 0) {
      set({ logs: currentLogs });
      await supabase.from("habit_logs").upsert(logsToUpsert);
    }
  },

  setSelectedHabitId: (habitId: string | null) => set({ selectedHabitId: habitId }),
  setSearchQuery: (query: string) => set({ searchQuery: query }),

  enterSelectionMode: () =>
    set({ isSelectionMode: true, selectedHabitIds: new Set() }),
  exitSelectionMode: () =>
    set({ isSelectionMode: false, selectedHabitIds: new Set() }),

  toggleSelectHabit: (habitId: string) =>
    set((state) => {
      const next = new Set(state.selectedHabitIds);
      if (next.has(habitId)) next.delete(habitId);
      else next.add(habitId);
      return { selectedHabitIds: next };
    }),

  selectAllHabits: (habitIds: string[]) =>
    set((state) => {
      const next = new Set(state.selectedHabitIds);
      const allSelected = habitIds.length > 0 && habitIds.every((id) => next.has(id));
      if (allSelected) {
        habitIds.forEach((id) => next.delete(id));
      } else {
        habitIds.forEach((id) => next.add(id));
      }
      return { selectedHabitIds: next };
    }),

  clearSelection: () => set({ selectedHabitIds: new Set() }),
}));
