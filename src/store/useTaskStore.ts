import { create } from "zustand";
import { Task, TaskDto, TaskSection, Priority, RepeatType, ToneOption } from "@/types";
import { supabase } from "@/lib/supabase";
import { startOfDay } from "date-fns";
import {
  formatDisplayDate,
  parseDueDateMillis,
  calculateNextRepeatDueDate,
  categorizeTask,
} from "@/lib/dateUtils";

interface FilterCriteria {
  status?: ("ACTIVE" | "COMPLETED")[];
  priority?: Priority[];
  dueDatePreset?: "ALL" | "TODAY" | "TOMORROW" | "RANGE";
  startDate?: string;
  endDate?: string;
}

export type SortOption =
  | "NONE"
  | "DUE_DATE_ASC"
  | "DUE_DATE_DESC"
  | "PRIORITY_DESC"
  | "PRIORITY_ASC"
  | "ALPHA_ASC"
  | "ALPHA_DESC";

interface TaskStoreState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  expandedSection: TaskSection | null;
  selectedTaskIds: Set<string>;
  isSelectionMode: boolean;
  searchQuery: string;
  filter: FilterCriteria;
  sort: SortOption;
  breadcrumbParentId: string | null;
  recentTones: ToneOption[];
  undoAction: { message: string; run: () => Promise<void> } | null;

  // Actions
  fetchTasks: (userCode: string) => Promise<void>;
  subscribeRealtime: (userCode: string) => () => void;
  createTask: (userCode: string, payload: Partial<Task>) => Promise<Task | null>;
  updateTask: (userCode: string, taskId: string, patch: Partial<Task>) => Promise<void>;
  toggleTaskCompletion: (userCode: string, taskId: string) => Promise<void>;
  deleteTask: (userCode: string, taskId: string, cascade: boolean) => Promise<void>;
  batchDeleteTasks: (userCode: string, taskIds: string[]) => Promise<void>;
  batchCompleteTasks: (userCode: string, taskIds: string[]) => Promise<void>;
  adjustParent: (
    userCode: string,
    taskId: string,
    newParentId: string | null,
    moveSubtasks?: boolean
  ) => Promise<void>;
  batchAdjustParent: (
    userCode: string,
    taskIds: string[],
    newParentId: string | null
  ) => Promise<void>;
  reorderTasks: (userCode: string, reorderedTasks: Task[]) => Promise<void>;
  snoozeTask: (userCode: string, taskId: string, minutes: number) => Promise<void>;
  reactivateForToday: (userCode: string, taskId: string) => Promise<void>;
  processOverdueRecurringTasks: (userCode: string) => Promise<void>;

  // UI state actions
  toggleSection: (section: TaskSection) => void;
  setExpandedSection: (section: TaskSection | null) => void;
  setSearchQuery: (query: string) => void;
  setBreadcrumb: (parentId: string | null) => void;
  enterSelectionMode: () => void;
  exitSelectionMode: () => void;
  toggleSelectTask: (taskId: string) => void;
  selectAllSection: (taskIds: string[]) => void;
  clearSelection: () => void;
  setFilter: (filter: FilterCriteria) => void;
  setSort: (sort: SortOption) => void;
  clearFilters: () => void;
  setUndoAction: (undo: { message: string; run: () => Promise<void> } | null) => void;
  executeUndo: () => Promise<void>;
}

function dtoToTask(dto: TaskDto): Task {
  return {
    id: dto.id,
    title: dto.title,
    notes: dto.notes ?? null,
    priority: (dto.priority as Priority) || "LOW",
    dueDate: dto.due_date || "Today",
    dueDateMillis: dto.due_date_millis ?? null,
    dueTime: dto.due_time ?? null,
    location: dto.location ?? null,
    attachmentName: dto.attachment_name ?? null,
    attachmentUri: dto.attachment_uri ?? null,
    isCompleted: dto.is_completed ?? false,
    section: (dto.section as any) || "TODAY",
    createdAt: dto.created_at ?? Date.now(),
    updatedAt: dto.updated_at ?? Date.now(),
    completedAt: dto.completed_at ?? null,
    alarmToneUri: dto.alarm_tone_uri ?? null,
    alarmToneTitle: dto.alarm_tone_title ?? null,
    repeatType: (dto.repeat_type as RepeatType) ?? null,
    repeatDays: dto.repeat_days ?? null,
    repeatDates: dto.repeat_dates ?? null,
    parentId: dto.parent_id ?? null,
    position: dto.position ?? 0,
    latitude: dto.latitude ?? null,
    longitude: dto.longitude ?? null,
    locationRadius: dto.radius_meters ?? 500,
    snoozeUntilMillis: dto.snooze_until_millis ?? null,
    userCode: dto.user_code ?? null,
  };
}

function taskToDto(task: Task, userCode: string): TaskDto {
  return {
    id: task.id,
    user_code: userCode,
    title: task.title,
    notes: task.notes,
    priority: task.priority,
    due_date: task.dueDate,
    due_date_millis: task.dueDateMillis,
    due_time: task.dueTime,
    location: task.location,
    attachment_name: task.attachmentName,
    attachment_uri: task.attachmentUri,
    is_completed: task.isCompleted,
    section: task.section,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
    completed_at: task.completedAt,
    alarm_tone_uri: task.alarmToneUri,
    alarm_tone_title: task.alarmToneTitle,
    repeat_type: task.repeatType,
    repeat_days: task.repeatDays,
    repeat_dates: task.repeatDates,
    parent_id: task.parentId,
    position: task.position,
    latitude: task.latitude,
    longitude: task.longitude,
    radius_meters: task.locationRadius,
  };
}

export function getDescendantIds(taskId: string, allTasks: Task[]): Set<string> {
  const result = new Set<string>();
  const queue = [taskId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const t of allTasks) {
      if (t.parentId === current && !result.has(t.id)) {
        result.add(t.id);
        queue.push(t.id);
      }
    }
  }
  return result;
}

export function getAncestorIds(taskId: string, allTasks: Task[]): string[] {
  const byId = new Map(allTasks.map((t) => [t.id, t]));
  const ancestors: string[] = [];
  let curr = byId.get(taskId)?.parentId;
  const visited = new Set<string>([taskId]);
  while (curr && !visited.has(curr)) {
    visited.add(curr);
    ancestors.push(curr);
    curr = byId.get(curr)?.parentId;
  }
  return ancestors;
}

export const useTaskStore = create<TaskStoreState>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,
  expandedSection: null, // all collapsed by default
  selectedTaskIds: new Set<string>(),
  isSelectionMode: false,
  searchQuery: "",
  filter: {},
  sort: "NONE",
  breadcrumbParentId: null,
  recentTones: [{ title: "Default Alarm Tone", uri: null }],
  undoAction: null,

  fetchTasks: async (userCode: string) => {
    if (!userCode) return;
    if (get().tasks.length === 0) {
      set({ isLoading: true, error: null });
    }
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_code", userCode)
        .order("position", { ascending: true });

      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }

      const tasks = (data || [])
        .filter((row: TaskDto) => !row.id.startsWith("sys_") && row.title !== "__SYSTEM_RECENT_TONES__")
        .map(dtoToTask);

      // Extract unique recent tones
      const tonesMap = new Map<string, ToneOption>();
      tonesMap.set("default", { title: "Default Alarm Tone", uri: null });
      for (const t of tasks) {
        if (t.alarmToneTitle) {
          tonesMap.set(t.alarmToneTitle, {
            title: t.alarmToneTitle,
            uri: t.alarmToneUri,
          });
        }
      }

      const nextRecentTones = Array.from(tonesMap.values());
      const currentTones = get().recentTones;
      const tonesChanged =
        currentTones.length !== nextRecentTones.length ||
        currentTones.some(
          (tone, i) =>
            tone.title !== nextRecentTones[i]?.title || tone.uri !== nextRecentTones[i]?.uri
        );

      set({
        tasks,
        isLoading: false,
        ...(tonesChanged ? { recentTones: nextRecentTones } : {}),
      });

      // Automatically inspect and roll over any overdue recurring tasks from past days
      get().processOverdueRecurringTasks(userCode).catch(() => {});
    } catch (err: unknown) {
      set({
        error: err instanceof Error ? err.message : "Failed to load tasks",
        isLoading: false,
      });
    }
  },

  subscribeRealtime: (userCode: string) => {
    if (!userCode) return () => {};

    const channel = supabase
      .channel(`realtime:tasks:${userCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `user_code=eq.${userCode}`,
        },
        (payload) => {
          const currentTasks = get().tasks;
          if (payload.eventType === "INSERT") {
            const newTask = dtoToTask(payload.new as TaskDto);
            if (
              !newTask.id.startsWith("sys_") &&
              newTask.title !== "__SYSTEM_RECENT_TONES__" &&
              !currentTasks.some((t) => t.id === newTask.id)
            ) {
              set({ tasks: [newTask, ...currentTasks] });
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = dtoToTask(payload.new as TaskDto);
            set({
              tasks: currentTasks.map((t) => (t.id === updated.id ? updated : t)),
            });
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id: string })?.id;
            if (deletedId) {
              set({
                tasks: currentTasks.filter((t) => t.id !== deletedId),
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  createTask: async (userCode: string, payload: Partial<Task>) => {
    const title = payload.title?.trim();
    if (!title) return null;

    const now = Date.now();
    const id = crypto.randomUUID();
    const dueDateMillis = payload.dueDateMillis ?? parseDueDateMillis(payload.dueDate);
    const dueDate = payload.dueDate || formatDisplayDate(null, dueDateMillis);

    const newTask: Task = {
      id,
      title,
      notes: payload.notes ?? null,
      priority: payload.priority || "LOW",
      dueDate,
      dueDateMillis,
      dueTime: payload.dueTime ?? null,
      location: payload.location ?? null,
      attachmentName: payload.attachmentName ?? null,
      attachmentUri: payload.attachmentUri ?? null,
      isCompleted: false,
      section: "TODAY",
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      alarmToneUri: payload.alarmToneUri ?? null,
      alarmToneTitle: payload.alarmToneTitle ?? "Default Alarm Tone",
      repeatType: payload.repeatType ?? null,
      repeatDays: payload.repeatDays ?? null,
      repeatDates: payload.repeatDates ?? null,
      parentId: payload.parentId ?? null,
      position: get().tasks.length,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      locationRadius: payload.locationRadius ?? 500,
      snoozeUntilMillis: null,
      userCode,
    };

    // Optimistic UI update
    set((state) => ({ tasks: [newTask, ...state.tasks] }));

    try {
      const dto = taskToDto(newTask, userCode);
      const { error } = await supabase.from("tasks").insert(dto);
      if (error) {
        console.error("Failed to insert task:", error);
      }
      return newTask;
    } catch (e) {
      console.error("Error creating task:", e);
      return newTask;
    }
  },

  updateTask: async (userCode: string, taskId: string, patch: Partial<Task>) => {
    const all = get().tasks;
    const existing = all.find((t) => t.id === taskId);
    if (!existing) return;

    const now = Date.now();
    let isReopened = false;
    let completedAt = existing.completedAt;

    // If date/time changed and task was completed -> auto-reopen task
    if (
      existing.isCompleted &&
      ((patch.dueDate && patch.dueDate !== existing.dueDate) ||
        (patch.dueTime && patch.dueTime !== existing.dueTime) ||
        (patch.dueDateMillis && patch.dueDateMillis !== existing.dueDateMillis))
    ) {
      isReopened = true;
      completedAt = null;
    }

    const updated: Task = {
      ...existing,
      ...patch,
      isCompleted: isReopened ? false : (patch.isCompleted ?? existing.isCompleted),
      completedAt,
      updatedAt: now,
    };

    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === taskId ? updated : t)),
    }));

    try {
      const dto = taskToDto(updated, userCode);
      await supabase.from("tasks").update(dto).eq("id", taskId);
    } catch (err) {
      console.error("Failed to update task", err);
    }
  },

  toggleTaskCompletion: async (userCode: string, taskId: string) => {
    const all = get().tasks;
    const target = all.find((t) => t.id === taskId);
    if (!target) return;

    const now = Date.now();
    const prevSnapshot = [...all];
    const newIsCompleted = !target.isCompleted;

    const byId = new Map(all.map((t) => [t.id, { ...t }]));

    if (newIsCompleted) {
      // 1. Target and all descendants complete
      const toComplete = new Set<string>([taskId]);
      for (const id of getDescendantIds(taskId, all)) {
        toComplete.add(id);
      }

      for (const id of toComplete) {
        const item = byId.get(id);
        if (item) {
          item.isCompleted = true;
          item.completedAt = now;
          item.section = "COMPLETED";
          item.snoozeUntilMillis = null;
          item.updatedAt = now;
        }
      }

      // 2. Cascade upward: parent completed if all siblings are completed
      let currParentId = target.parentId;
      const visited = new Set<string>();
      while (currParentId && !visited.has(currParentId)) {
        visited.add(currParentId);
        const parent = byId.get(currParentId);
        if (!parent) break;
        const siblings = Array.from(byId.values()).filter((t) => t.parentId === currParentId);
        const allDone = siblings.every((s) => s.isCompleted);
        if (allDone) {
          parent.isCompleted = true;
          parent.completedAt = now;
          parent.section = "COMPLETED";
          parent.snoozeUntilMillis = null;
          parent.updatedAt = now;
          currParentId = parent.parentId;
        } else {
          break;
        }
      }

      // 3. Recurring task: create next occurrence
      if (target.repeatType && target.repeatType !== "NONE") {
        const nextRepeat = calculateNextRepeatDueDate(
          target.dueDateMillis,
          target.dueDate,
          target.repeatType,
          target.repeatDays,
          target.repeatDates
        );
        if (nextRepeat) {
          const snapshotId = `snapshot_${target.id}_${now}`;
          const completedSnapshot: Task = {
            ...target,
            id: snapshotId,
            isCompleted: true,
            completedAt: now,
            section: "COMPLETED",
            repeatType: null,
            updatedAt: now,
          };

          // Roll over master task to next occurrence
          target.dueDate = nextRepeat.nextDueDate;
          target.dueDateMillis = nextRepeat.nextDueDateMillis;
          target.isCompleted = false;
          target.completedAt = null;
          target.section = "TODAY";
          target.updatedAt = now;

          byId.set(snapshotId, completedSnapshot);
          byId.set(target.id, target);

          // Persist both snapshot and master task
          const snapDto = taskToDto(completedSnapshot, userCode);
          const masterDto = taskToDto(target, userCode);
          supabase.from("tasks").insert(snapDto).then();
          supabase.from("tasks").update(masterDto).eq("id", target.id).then();
        }
      }
    } else {
      // Uncompleting: uncomplete target and all ancestors
      target.isCompleted = false;
      target.completedAt = null;
      target.updatedAt = now;
      target.section = categorizeTask(target, now) as any;
      byId.set(target.id, target);

      for (const pId of getAncestorIds(taskId, all)) {
        const p = byId.get(pId);
        if (p) {
          p.isCompleted = false;
          p.completedAt = null;
          p.updatedAt = now;
          p.section = categorizeTask(p, now) as any;
        }
      }
    }

    const updatedTasks = Array.from(byId.values());
    set({
      tasks: updatedTasks,
      undoAction: {
        message: newIsCompleted ? "Task completed" : "Task restored",
        run: async () => {
          set({ tasks: prevSnapshot });
          for (const t of prevSnapshot) {
            await supabase.from("tasks").update(taskToDto(t, userCode)).eq("id", t.id);
          }
        },
      },
    });

    // Batch update affected tasks in Supabase
    const changed = updatedTasks.filter((t) => {
      const orig = prevSnapshot.find((p) => p.id === t.id);
      return !orig || orig.isCompleted !== t.isCompleted || orig.completedAt !== t.completedAt;
    });

    for (const t of changed) {
      await supabase.from("tasks").update(taskToDto(t, userCode)).eq("id", t.id);
    }
  },

  deleteTask: async (userCode: string, taskId: string, cascade: boolean) => {
    const all = get().tasks;
    const prevSnapshot = [...all];
    const target = all.find((t) => t.id === taskId);
    if (!target) return;

    let toDeleteIds: string[] = [taskId];
    let toOrphan: Task[] = [];

    if (cascade) {
      const descendants = getDescendantIds(taskId, all);
      toDeleteIds = [taskId, ...Array.from(descendants)];
    } else {
      // Orphan direct children to target's parentId
      toOrphan = all
        .filter((t) => t.parentId === taskId)
        .map((t) => ({ ...t, parentId: target.parentId, updatedAt: Date.now() }));
    }

    const deleteSet = new Set(toDeleteIds);
    const remainingTasks = all
      .filter((t) => !deleteSet.has(t.id))
      .map((t) => {
        const orphan = toOrphan.find((o) => o.id === t.id);
        return orphan || t;
      });

    set({
      tasks: remainingTasks,
      undoAction: {
        message: "Task deleted",
        run: async () => {
          set({ tasks: prevSnapshot });
          for (const id of toDeleteIds) {
            const restored = prevSnapshot.find((p) => p.id === id);
            if (restored) {
              await supabase.from("tasks").insert(taskToDto(restored, userCode));
            }
          }
        },
      },
    });

    for (const id of toDeleteIds) {
      await supabase.from("tasks").delete().eq("id", id);
    }
    for (const o of toOrphan) {
      await supabase.from("tasks").update({ parent_id: o.parentId }).eq("id", o.id);
    }
  },

  batchDeleteTasks: async (userCode: string, taskIds: string[]) => {
    if (taskIds.length === 0) return;
    const all = get().tasks;
    const prevSnapshot = [...all];
    const deleteSet = new Set<string>();

    for (const id of taskIds) {
      deleteSet.add(id);
      for (const d of getDescendantIds(id, all)) {
        deleteSet.add(d);
      }
    }

    const remaining = all.filter((t) => !deleteSet.has(t.id));
    set({
      tasks: remaining,
      selectedTaskIds: new Set(),
      isSelectionMode: false,
      undoAction: {
        message: `${deleteSet.size} tasks deleted`,
        run: async () => {
          set({ tasks: prevSnapshot });
          for (const t of prevSnapshot) {
            if (deleteSet.has(t.id)) {
              await supabase.from("tasks").insert(taskToDto(t, userCode));
            }
          }
        },
      },
    });

    for (const id of Array.from(deleteSet)) {
      await supabase.from("tasks").delete().eq("id", id);
    }
  },

  batchCompleteTasks: async (userCode: string, taskIds: string[]) => {
    if (taskIds.length === 0) return;
    const all = get().tasks;
    const prevSnapshot = [...all];
    const now = Date.now();

    const completeSet = new Set<string>();
    for (const id of taskIds) {
      completeSet.add(id);
      for (const d of getDescendantIds(id, all)) {
        completeSet.add(d);
      }
    }

    const updated = all.map((t) => {
      if (completeSet.has(t.id)) {
        return {
          ...t,
          isCompleted: true,
          completedAt: now,
          section: "COMPLETED" as const,
          updatedAt: now,
        };
      }
      return t;
    });

    set({
      tasks: updated,
      selectedTaskIds: new Set(),
      isSelectionMode: false,
      undoAction: {
        message: `${completeSet.size} tasks completed`,
        run: async () => {
          set({ tasks: prevSnapshot });
          for (const id of Array.from(completeSet)) {
            const original = prevSnapshot.find((p) => p.id === id);
            if (original) {
              await supabase.from("tasks").update(taskToDto(original, userCode)).eq("id", id);
            }
          }
        },
      },
    });

    for (const id of Array.from(completeSet)) {
      await supabase
        .from("tasks")
        .update({ is_completed: true, completed_at: now, section: "COMPLETED", updated_at: now })
        .eq("id", id);
    }
  },

  adjustParent: async (
    userCode: string,
    taskId: string,
    newParentId: string | null,
    moveSubtasks = true
  ) => {
    const all = get().tasks;
    const target = all.find((t) => t.id === taskId);
    if (!target) return;

    if (!moveSubtasks) {
      // Orphan children to target's existing parent
      const children = all.filter((t) => t.parentId === taskId);
      for (const c of children) {
        await supabase.from("tasks").update({ parent_id: target.parentId }).eq("id", c.id);
      }
    }

    set((state) => ({
      tasks: state.tasks.map((t) => {
        if (t.id === taskId) {
          return { ...t, parentId: newParentId, updatedAt: Date.now() };
        }
        if (!moveSubtasks && t.parentId === taskId) {
          return { ...t, parentId: target.parentId, updatedAt: Date.now() };
        }
        return t;
      }),
    }));

    await supabase.from("tasks").update({ parent_id: newParentId, updated_at: Date.now() }).eq("id", taskId);
  },

  batchAdjustParent: async (userCode: string, taskIds: string[], newParentId: string | null) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        taskIds.includes(t.id) ? { ...t, parentId: newParentId, updatedAt: Date.now() } : t
      ),
      selectedTaskIds: new Set(),
      isSelectionMode: false,
    }));

    for (const id of taskIds) {
      await supabase.from("tasks").update({ parent_id: newParentId, updated_at: Date.now() }).eq("id", id);
    }
  },

  reorderTasks: async (userCode: string, reorderedTasks: Task[]) => {
    const updated = reorderedTasks.map((t, idx) => ({ ...t, position: idx }));
    set({ tasks: updated });

    for (const t of updated) {
      await supabase.from("tasks").update({ position: t.position }).eq("id", t.id);
    }
  },

  snoozeTask: async (userCode: string, taskId: string, minutes: number) => {
    const all = get().tasks;
    const target = all.find((t) => t.id === taskId);
    if (!target) return;

    const snoozeUntil = Date.now() + minutes * 60 * 1000;
    const updated: Task = {
      ...target,
      snoozeUntilMillis: snoozeUntil,
      updatedAt: Date.now(),
    };

    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === taskId ? updated : t)),
      expandedSection: "SNOOZED",
    }));

    // Try updating snooze_until_millis
    try {
      await supabase.from("tasks").update({ snooze_until_millis: snoozeUntil, updated_at: Date.now() }).eq("id", taskId);
    } catch {
      // Ignored if column not in schema
    }
  },

  reactivateForToday: async (userCode: string, taskId: string) => {
    const today = formatDisplayDate(null, Date.now());
    const snapshotPrefix = `snapshot_${taskId}_`;
    const all = get().tasks;
    const snapshotsToRemove = all.filter((t) => t.id.startsWith(snapshotPrefix));

    set((state) => ({
      tasks: state.tasks
        .filter((t) => !t.id.startsWith(snapshotPrefix))
        .map((t) =>
          t.id === taskId
            ? {
                ...t,
                dueDate: today,
                dueDateMillis: Date.now(),
                section: "TODAY",
                snoozeUntilMillis: null,
                isCompleted: false,
                completedAt: null,
                updatedAt: Date.now(),
              }
            : t
        ),
    }));

    await get().updateTask(userCode, taskId, {
      dueDate: today,
      dueDateMillis: Date.now(),
      section: "TODAY",
      snoozeUntilMillis: null,
      isCompleted: false,
      completedAt: null,
    });

    for (const snap of snapshotsToRemove) {
      await supabase.from("tasks").delete().eq("id", snap.id);
    }
  },

  processOverdueRecurringTasks: async (userCode: string) => {
    if (!userCode) return;
    const all = get().tasks;
    const now = Date.now();
    const todayStart = startOfDay(new Date()).getTime();

    const overdueRecurring = all.filter(
      (t) =>
        !t.isCompleted &&
        !t.id.startsWith("snapshot_") &&
        t.repeatType &&
        t.repeatType !== "NONE" &&
        (t.dueDateMillis || parseDueDateMillis(t.dueDate)) < todayStart
    );

    if (overdueRecurring.length === 0) return;

    const newSnapshots: Task[] = [];
    const updatedMasters: Task[] = [];

    for (const target of overdueRecurring) {
      const pastMillis = target.dueDateMillis || parseDueDateMillis(target.dueDate);
      const snapshotId = `snapshot_${target.id}_${pastMillis}`;

      if (!all.some((t) => t.id === snapshotId) && !newSnapshots.some((t) => t.id === snapshotId)) {
        const missedSnapshot: Task = {
          ...target,
          id: snapshotId,
          isCompleted: false,
          completedAt: null,
          dueDate: target.dueDate.toLowerCase().includes("snoozed")
            ? formatDisplayDate(null, pastMillis)
            : target.dueDate,
          section: "COMPLETED",
          repeatType: null,
          notes: target.notes ? `[MISSED] ${target.notes}` : "[MISSED]",
          updatedAt: now,
        };
        newSnapshots.push(missedSnapshot);
      }

      const rolledOver: Task = {
        ...target,
        dueDate: "Today",
        dueDateMillis: todayStart,
        section: "TODAY",
        snoozeUntilMillis: null,
        isCompleted: false,
        completedAt: null,
        updatedAt: now,
      };
      updatedMasters.push(rolledOver);
    }

    const masterMap = new Map(updatedMasters.map((m) => [m.id, m]));
    const updatedAll = all.map((t) => masterMap.get(t.id) || t);
    updatedAll.push(...newSnapshots);

    set({ tasks: updatedAll });

    for (const snap of newSnapshots) {
      await supabase.from("tasks").insert(taskToDto(snap, userCode));
    }
    for (const m of updatedMasters) {
      await supabase.from("tasks").update(taskToDto(m, userCode)).eq("id", m.id);
    }
  },

  toggleSection: (section: TaskSection) => {
    const current = get().expandedSection;
    set({ expandedSection: current === section ? null : section });
  },

  setExpandedSection: (section: TaskSection | null) => {
    set({ expandedSection: section });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setBreadcrumb: (parentId: string | null) => {
    set({ breadcrumbParentId: parentId });
  },

  enterSelectionMode: () => set({ isSelectionMode: true, selectedTaskIds: new Set() }),
  exitSelectionMode: () => set({ isSelectionMode: false, selectedTaskIds: new Set() }),

  toggleSelectTask: (taskId: string) => {
    set((state) => {
      const next = new Set(state.selectedTaskIds);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return { selectedTaskIds: next };
    });
  },

  selectAllSection: (taskIds: string[]) => {
    set((state) => {
      const next = new Set(state.selectedTaskIds);
      const allSelected = taskIds.length > 0 && taskIds.every((id) => next.has(id));
      if (allSelected) {
        taskIds.forEach((id) => next.delete(id));
      } else {
        taskIds.forEach((id) => next.add(id));
      }
      return { selectedTaskIds: next };
    });
  },

  clearSelection: () => set({ selectedTaskIds: new Set() }),

  setFilter: (filter: FilterCriteria) => set({ filter }),
  setSort: (sort: SortOption) => set({ sort }),
  clearFilters: () => set({ filter: {}, searchQuery: "" }),

  setUndoAction: (undo) => set({ undoAction: undo }),

  executeUndo: async () => {
    const undo = get().undoAction;
    if (undo) {
      await undo.run();
      set({ undoAction: null });
    }
  },
}));
