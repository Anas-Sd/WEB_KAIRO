"use client";

import React, { useState, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CheckSquare, RefreshCw, Download, Plus, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AppHeader } from "@/components/AppHeader";
import { TaskFilterBar } from "@/components/TaskFilterBar";
import { TaskSectionHeader } from "@/components/TaskSectionHeader";
import { SortableTaskCard } from "@/components/SortableTaskCard";
import { Breadcrumb } from "@/components/Breadcrumb";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { SelectionActionBar } from "@/components/SelectionActionBar";
import { CreateEditTaskDialog } from "@/components/CreateEditTaskDialog";
import { TaskDetailsPanel } from "@/components/TaskDetailsPanel";
import {
  AdjustParentDialog,
  DeleteTaskDialog,
  ExportTasksDialog,
} from "@/components/TaskDialogs";
import { useAuthStore } from "@/store/useAuthStore";
import { useTaskStore, getDescendantIds } from "@/store/useTaskStore";
import { Task, TaskSection, Priority } from "@/types";
import {
  categorizeTask,
  isTaskOverdue,
  getNextUpcomingAlarm,
  parseDueDateMillis,
  getTaskSortDueMillis,
} from "@/lib/dateUtils";

export default function TasksPage() {
  const { user } = useAuthStore();
  const {
    tasks,
    expandedSection,
    toggleSection,
    selectedTaskIds,
    isSelectionMode,
    enterSelectionMode,
    exitSelectionMode,
    toggleSelectTask,
    selectAllSection,
    clearSelection,
    searchQuery,
    setSearchQuery,
    filter,
    setFilter,
    sort,
    setSort,
    clearFilters,
    breadcrumbParentId,
    setBreadcrumb,
    recentTones,
    fetchTasks,
    createTask,
    updateTask,
    toggleTaskCompletion,
    deleteTask,
    batchDeleteTasks,
    batchCompleteTasks,
    adjustParent,
    batchAdjustParent,
    reorderTasks,
    snoozeTask,
    reactivateForToday,
  } = useTaskStore();

  // Modals state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [parentForSubtask, setParentForSubtask] = useState<Task | null>(null);
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<Task | null>(null);
  const [taskForParentAdjust, setTaskForParentAdjust] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const userCode = user?.code || "";

  // 1. Filter and search tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Search query: filters across all levels
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.notes && t.notes.toLowerCase().includes(q))
      );
    } else if (breadcrumbParentId) {
      // Drilled into a parent: show direct children only
      result = result.filter((t) => t.parentId === breadcrumbParentId);
    } else {
      // Root view: show root tasks (parentId === null)
      result = result.filter((t) => !t.parentId);
    }

    // Filter criteria
    if (filter.status && filter.status.length > 0) {
      const hasActive = filter.status.includes("ACTIVE");
      const hasCompleted = filter.status.includes("COMPLETED");
      if (hasActive && !hasCompleted) {
        result = result.filter((t) => !t.isCompleted);
      } else if (!hasActive && hasCompleted) {
        result = result.filter((t) => t.isCompleted);
      }
    }

    if (filter.priority && filter.priority.length > 0) {
      const setP = new Set(filter.priority);
      result = result.filter((t) => setP.has(t.priority));
    }

    if (filter.dueDatePreset === "TODAY") {
      result = result.filter((t) => categorizeTask(t) === "TODAY");
    } else if (filter.dueDatePreset === "TOMORROW") {
      result = result.filter((t) => categorizeTask(t) === "TOMORROW");
    } else if (filter.dueDatePreset === "RANGE" && filter.startDate && filter.endDate) {
      const startMs = new Date(filter.startDate).getTime();
      const endMs = new Date(filter.endDate).getTime() + 86400000;
      result = result.filter((t) => {
        const ms = t.dueDateMillis || parseDueDateMillis(t.dueDate);
        return ms >= startMs && ms <= endMs;
      });
    }

    return result;
  }, [tasks, searchQuery, breadcrumbParentId, filter]);

  // Sort comparator
  const sortComparator = useMemo(() => {
    const priorityWeight: Record<Priority, number> = {
      URGENT: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };

    return (a: Task, b: Task) => {
      switch (sort) {
        case "NONE":
          return a.position - b.position || a.createdAt - b.createdAt;
        case "DUE_DATE_ASC": {
          const aMs = getTaskSortDueMillis(a);
          const bMs = getTaskSortDueMillis(b);
          if (aMs !== bMs) return aMs - bMs;
          return a.position - b.position || a.createdAt - b.createdAt;
        }
        case "DUE_DATE_DESC": {
          const aMs = getTaskSortDueMillis(a);
          const bMs = getTaskSortDueMillis(b);
          if (aMs !== bMs) return bMs - aMs;
          return a.position - b.position || a.createdAt - b.createdAt;
        }
        case "PRIORITY_DESC": {
          const diff = priorityWeight[b.priority] - priorityWeight[a.priority];
          if (diff !== 0) return diff;
          return a.position - b.position || a.createdAt - b.createdAt;
        }
        case "PRIORITY_ASC": {
          const diff = priorityWeight[a.priority] - priorityWeight[b.priority];
          if (diff !== 0) return diff;
          return a.position - b.position || a.createdAt - b.createdAt;
        }
        case "ALPHA_ASC":
          return a.title.localeCompare(b.title);
        case "ALPHA_DESC":
          return b.title.localeCompare(a.title);
        default:
          return a.position - b.position;
      }
    };
  }, [sort]);

  // 2. Partition into 6 sections
  const sectionsData = useMemo(() => {
    const snoozed: Task[] = [];
    const overdue: Task[] = [];
    const today: Task[] = [];
    const tomorrow: Task[] = [];
    const upcoming: Task[] = [];
    const completed: Task[] = [];

    const now = Date.now();

    for (const t of filteredTasks) {
      const cat = categorizeTask(t, now);
      switch (cat) {
        case "SNOOZED":
          snoozed.push(t);
          break;
        case "OVERDUE":
          overdue.push(t);
          break;
        case "TODAY":
          today.push(t);
          break;
        case "TOMORROW":
          tomorrow.push(t);
          break;
        case "UPCOMING":
          upcoming.push(t);
          break;
        case "COMPLETED":
          completed.push(t);
          break;
      }
    }

    return {
      SNOOZED: sort === "NONE" ? snoozed.sort((a, b) => b.updatedAt - a.updatedAt) : snoozed.sort(sortComparator),
      OVERDUE: overdue.sort(sortComparator),
      TODAY: today.sort(sortComparator),
      TOMORROW: tomorrow.sort(sortComparator),
      UPCOMING: upcoming.sort(sortComparator),
      COMPLETED: sort === "NONE" ? completed.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)) : completed.sort(sortComparator),
    };
  }, [filteredTasks, sortComparator, sort]);

  // Subtask progress map
  const subtaskProgressMap = useMemo(() => {
    const map = new Map<string, { done: number; total: number }>();
    for (const parent of tasks) {
      const children = tasks.filter((t) => t.parentId === parent.id);
      if (children.length > 0) {
        const done = children.filter((c) => c.isCompleted).length;
        map.set(parent.id, { done, total: children.length });
      }
    }
    return map;
  }, [tasks]);

  // Next upcoming alarm
  const nextAlarmInfo = useMemo(() => {
    const closest = getNextUpcomingAlarm(tasks);
    if (!closest) return null;
    return {
      taskTitle: closest.task.title,
      triggerMillis: closest.triggerMillis,
    };
  }, [tasks]);

  // Hierarchy map for search "↳ Parent Name" link
  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  // Handle Drag End
  const handleDragEnd = async (event: DragEndEvent, sectionKey: TaskSection) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const sectionTasks = sectionsData[sectionKey];
    const oldIndex = sectionTasks.findIndex((t) => t.id === active.id);
    const newIndex = sectionTasks.findIndex((t) => t.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(sectionTasks, oldIndex, newIndex);
      await reorderTasks(userCode, reordered);
    }
  };

  const handleOpenAddSubtask = (parent: Task) => {
    setParentForSubtask(parent);
    setCreateDialogOpen(true);
  };

  const selectedCount = selectedTaskIds.size;

  const isSearching = searchQuery.trim().length > 0;
  const totalMatches =
    sectionsData.SNOOZED.length +
    sectionsData.OVERDUE.length +
    sectionsData.TODAY.length +
    sectionsData.TOMORROW.length +
    sectionsData.UPCOMING.length +
    sectionsData.COMPLETED.length;

  const shouldShowSection = (section: TaskSection, count: number) => {
    if (isSearching) return count > 0;
    if (section === "SNOOZED" || section === "OVERDUE") return count > 0;
    return true;
  };

  const isSectionExpanded = (section: TaskSection) => {
    if (isSearching) return true;
    return expandedSection === section;
  };

  return (
    <AppShell>
      {({ onOpenSettings }) => (
        <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto px-4 sm:px-6">
          {/* App Header */}
          <AppHeader onOpenSettings={onOpenSettings} />

          <div className="mt-3">
            {/* Search, Filter, Sort, Export and 3-Dots Row */}
            <TaskFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Search tasks by name or notes..."
              filter={filter}
              sort={sort}
              onFilterChange={setFilter}
              onSortChange={setSort}
              onResetFilters={clearFilters}
              onOpenExport={() => setExportDialogOpen(true)}
              moreMenuItems={[
                {
                  label: isSelectionMode ? "Exit Selection" : "Select Tasks",
                  icon: <CheckSquare className="w-4 h-4 text-[#C5C0FF]" />,
                  onClick: () => {
                    if (isSelectionMode) exitSelectionMode();
                    else enterSelectionMode();
                  },
                },
                {
                  label: "Refresh Tasks",
                  icon: <RefreshCw className="w-4 h-4 text-[#68DBA9]" />,
                  onClick: () => fetchTasks(userCode),
                },
                {
                  label: "Export Tasks",
                  icon: <Download className="w-4 h-4 text-[#FFB77D]" />,
                  onClick: () => setExportDialogOpen(true),
                },
              ]}
            />

            {/* Breadcrumb if drilled into subtasks */}
            <Breadcrumb
              currentParentId={breadcrumbParentId}
              allTasks={tasks}
              onSelectCrumb={setBreadcrumb}
            />

            {/* Sections Accordion */}
            <div className="space-y-3 pb-24">
              {/* 1. SNOOZED SECTION */}
              {shouldShowSection("SNOOZED", sectionsData.SNOOZED.length) && (
                <div className="space-y-2">
                  <TaskSectionHeader
                    section="SNOOZED"
                    title="Snoozed Alarms"
                    count={sectionsData.SNOOZED.length}
                    isExpanded={isSectionExpanded("SNOOZED")}
                    onToggle={() => toggleSection("SNOOZED")}
                    isSelectionMode={isSelectionMode}
                    isAllSelected={sectionsData.SNOOZED.every((t) => selectedTaskIds.has(t.id))}
                    onToggleSelectAll={() =>
                      selectAllSection(sectionsData.SNOOZED.map((t) => t.id))
                    }
                  />
                  {isSectionExpanded("SNOOZED") && (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(e) => handleDragEnd(e, "SNOOZED")}
                    >
                      <SortableContext
                        items={sectionsData.SNOOZED.map((t) => t.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {sectionsData.SNOOZED.map((task) => (
                            <SortableTaskCard
                              key={task.id}
                              task={task}
                              hasSubtasks={subtaskProgressMap.has(task.id)}
                              subtaskProgress={subtaskProgressMap.get(task.id)}
                              parentTitle={task.parentId ? tasksById.get(task.parentId)?.title : null}
                              isSelectionMode={isSelectionMode}
                              isSelected={selectedTaskIds.has(task.id)}
                              onToggleSelect={() => toggleSelectTask(task.id)}
                              onToggleCompletion={() => toggleTaskCompletion(userCode, task.id)}
                              onDrillDown={() => setBreadcrumb(task.id)}
                              onNavigateToParent={() => task.parentId && setBreadcrumb(task.parentId)}
                              onShowDetails={() => setSelectedTaskForDetails(task)}
                              onEditTask={() => setTaskToEdit(task)}
                              onAddSubtask={() => handleOpenAddSubtask(task)}
                              onAdjustParent={() => setTaskForParentAdjust(task)}
                              onDeleteTask={() => setTaskToDelete(task)}
                              onReactivateForToday={
                                task.repeatType
                                  ? () => reactivateForToday(userCode, task.id)
                                  : undefined
                              }
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              )}

              {/* 2. OVERDUE SECTION */}
              {shouldShowSection("OVERDUE", sectionsData.OVERDUE.length) && (
                <div className="space-y-2">
                  <TaskSectionHeader
                    section="OVERDUE"
                    title="Overdue"
                    count={sectionsData.OVERDUE.length}
                    isExpanded={isSectionExpanded("OVERDUE")}
                    onToggle={() => toggleSection("OVERDUE")}
                    isSelectionMode={isSelectionMode}
                    isAllSelected={sectionsData.OVERDUE.every((t) => selectedTaskIds.has(t.id))}
                    onToggleSelectAll={() =>
                      selectAllSection(sectionsData.OVERDUE.map((t) => t.id))
                    }
                  />
                  {isSectionExpanded("OVERDUE") && (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(e) => handleDragEnd(e, "OVERDUE")}
                    >
                      <SortableContext
                        items={sectionsData.OVERDUE.map((t) => t.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {sectionsData.OVERDUE.map((task) => (
                            <SortableTaskCard
                              key={task.id}
                              task={task}
                              isOverdue
                              hasSubtasks={subtaskProgressMap.has(task.id)}
                              subtaskProgress={subtaskProgressMap.get(task.id)}
                              parentTitle={task.parentId ? tasksById.get(task.parentId)?.title : null}
                              isSelectionMode={isSelectionMode}
                              isSelected={selectedTaskIds.has(task.id)}
                              onToggleSelect={() => toggleSelectTask(task.id)}
                              onToggleCompletion={() => toggleTaskCompletion(userCode, task.id)}
                              onDrillDown={() => setBreadcrumb(task.id)}
                              onNavigateToParent={() => task.parentId && setBreadcrumb(task.parentId)}
                              onShowDetails={() => setSelectedTaskForDetails(task)}
                              onEditTask={() => setTaskToEdit(task)}
                              onAddSubtask={() => handleOpenAddSubtask(task)}
                              onAdjustParent={() => setTaskForParentAdjust(task)}
                              onDeleteTask={() => setTaskToDelete(task)}
                              onReactivateForToday={
                                task.repeatType
                                  ? () => reactivateForToday(userCode, task.id)
                                  : undefined
                              }
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              )}

              {/* 3. TODAY SECTION */}
              {shouldShowSection("TODAY", sectionsData.TODAY.length) && (
                <div className="space-y-2">
                  <TaskSectionHeader
                    section="TODAY"
                    title="Today"
                    count={sectionsData.TODAY.length}
                    isExpanded={isSectionExpanded("TODAY")}
                    onToggle={() => toggleSection("TODAY")}
                    isSelectionMode={isSelectionMode}
                    isAllSelected={
                      sectionsData.TODAY.length > 0 &&
                      sectionsData.TODAY.every((t) => selectedTaskIds.has(t.id))
                    }
                    onToggleSelectAll={() =>
                      selectAllSection(sectionsData.TODAY.map((t) => t.id))
                    }
                  />
                  {isSectionExpanded("TODAY") && (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(e) => handleDragEnd(e, "TODAY")}
                    >
                      <SortableContext
                        items={sectionsData.TODAY.map((t) => t.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {sectionsData.TODAY.length === 0 ? (
                            <div className="text-center py-6 text-xs text-[#918EA2] italic">
                              No tasks scheduled for today. Enjoy your day or tap + to plan ahead!
                            </div>
                          ) : (
                            sectionsData.TODAY.map((task) => (
                              <SortableTaskCard
                                key={task.id}
                                task={task}
                                hasSubtasks={subtaskProgressMap.has(task.id)}
                                subtaskProgress={subtaskProgressMap.get(task.id)}
                                parentTitle={task.parentId ? tasksById.get(task.parentId)?.title : null}
                                isSelectionMode={isSelectionMode}
                                isSelected={selectedTaskIds.has(task.id)}
                                onToggleSelect={() => toggleSelectTask(task.id)}
                                onToggleCompletion={() => toggleTaskCompletion(userCode, task.id)}
                                onDrillDown={() => setBreadcrumb(task.id)}
                                onNavigateToParent={() => task.parentId && setBreadcrumb(task.parentId)}
                                onShowDetails={() => setSelectedTaskForDetails(task)}
                                onEditTask={() => setTaskToEdit(task)}
                                onAddSubtask={() => handleOpenAddSubtask(task)}
                                onAdjustParent={() => setTaskForParentAdjust(task)}
                                onDeleteTask={() => setTaskToDelete(task)}
                                onReactivateForToday={
                                  task.repeatType
                                    ? () => reactivateForToday(userCode, task.id)
                                    : undefined
                                }
                              />
                            ))
                          )}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              )}

              {/* 4. TOMORROW SECTION */}
              {shouldShowSection("TOMORROW", sectionsData.TOMORROW.length) && (
                <div className="space-y-2">
                  <TaskSectionHeader
                    section="TOMORROW"
                    title="Tomorrow"
                    count={sectionsData.TOMORROW.length}
                    isExpanded={isSectionExpanded("TOMORROW")}
                    onToggle={() => toggleSection("TOMORROW")}
                    isSelectionMode={isSelectionMode}
                    isAllSelected={
                      sectionsData.TOMORROW.length > 0 &&
                      sectionsData.TOMORROW.every((t) => selectedTaskIds.has(t.id))
                    }
                    onToggleSelectAll={() =>
                      selectAllSection(sectionsData.TOMORROW.map((t) => t.id))
                    }
                  />
                  {isSectionExpanded("TOMORROW") && (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(e) => handleDragEnd(e, "TOMORROW")}
                    >
                      <SortableContext
                        items={sectionsData.TOMORROW.map((t) => t.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {sectionsData.TOMORROW.length === 0 ? (
                            <div className="text-center py-6 text-xs text-[#918EA2] italic">
                              Nothing scheduled for tomorrow.
                            </div>
                          ) : (
                            sectionsData.TOMORROW.map((task) => (
                              <SortableTaskCard
                                key={task.id}
                                task={task}
                                hasSubtasks={subtaskProgressMap.has(task.id)}
                                subtaskProgress={subtaskProgressMap.get(task.id)}
                                parentTitle={task.parentId ? tasksById.get(task.parentId)?.title : null}
                                isSelectionMode={isSelectionMode}
                                isSelected={selectedTaskIds.has(task.id)}
                                onToggleSelect={() => toggleSelectTask(task.id)}
                                onToggleCompletion={() => toggleTaskCompletion(userCode, task.id)}
                                onDrillDown={() => setBreadcrumb(task.id)}
                                onNavigateToParent={() => task.parentId && setBreadcrumb(task.parentId)}
                                onShowDetails={() => setSelectedTaskForDetails(task)}
                                onEditTask={() => setTaskToEdit(task)}
                                onAddSubtask={() => handleOpenAddSubtask(task)}
                                onAdjustParent={() => setTaskForParentAdjust(task)}
                                onDeleteTask={() => setTaskToDelete(task)}
                                onReactivateForToday={
                                  task.repeatType
                                    ? () => reactivateForToday(userCode, task.id)
                                    : undefined
                                }
                              />
                            ))
                          )}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              )}

              {/* 5. UPCOMING SECTION */}
              {shouldShowSection("UPCOMING", sectionsData.UPCOMING.length) && (
                <div className="space-y-2">
                  <TaskSectionHeader
                    section="UPCOMING"
                    title="Upcoming"
                    count={sectionsData.UPCOMING.length}
                    isExpanded={isSectionExpanded("UPCOMING")}
                    onToggle={() => toggleSection("UPCOMING")}
                    isSelectionMode={isSelectionMode}
                    isAllSelected={
                      sectionsData.UPCOMING.length > 0 &&
                      sectionsData.UPCOMING.every((t) => selectedTaskIds.has(t.id))
                    }
                    onToggleSelectAll={() =>
                      selectAllSection(sectionsData.UPCOMING.map((t) => t.id))
                    }
                  />
                  {isSectionExpanded("UPCOMING") && (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(e) => handleDragEnd(e, "UPCOMING")}
                    >
                      <SortableContext
                        items={sectionsData.UPCOMING.map((t) => t.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {sectionsData.UPCOMING.length === 0 ? (
                            <div className="text-center py-6 text-xs text-[#918EA2] italic">
                              No upcoming scheduled tasks.
                            </div>
                          ) : (
                            sectionsData.UPCOMING.map((task) => (
                              <SortableTaskCard
                                key={task.id}
                                task={task}
                                hasSubtasks={subtaskProgressMap.has(task.id)}
                                subtaskProgress={subtaskProgressMap.get(task.id)}
                                parentTitle={task.parentId ? tasksById.get(task.parentId)?.title : null}
                                isSelectionMode={isSelectionMode}
                                isSelected={selectedTaskIds.has(task.id)}
                                onToggleSelect={() => toggleSelectTask(task.id)}
                                onToggleCompletion={() => toggleTaskCompletion(userCode, task.id)}
                                onDrillDown={() => setBreadcrumb(task.id)}
                                onNavigateToParent={() => task.parentId && setBreadcrumb(task.parentId)}
                                onShowDetails={() => setSelectedTaskForDetails(task)}
                                onEditTask={() => setTaskToEdit(task)}
                                onAddSubtask={() => handleOpenAddSubtask(task)}
                                onAdjustParent={() => setTaskForParentAdjust(task)}
                                onDeleteTask={() => setTaskToDelete(task)}
                                onReactivateForToday={
                                  task.repeatType
                                    ? () => reactivateForToday(userCode, task.id)
                                    : undefined
                                }
                              />
                            ))
                          )}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              )}

              {/* 6. COMPLETED SECTION */}
              {shouldShowSection("COMPLETED", sectionsData.COMPLETED.length) && (
                <div className="space-y-2">
                  <TaskSectionHeader
                    section="COMPLETED"
                    title="Completed"
                    count={sectionsData.COMPLETED.length}
                    isExpanded={isSectionExpanded("COMPLETED")}
                    onToggle={() => toggleSection("COMPLETED")}
                    isSelectionMode={isSelectionMode}
                    isAllSelected={
                      sectionsData.COMPLETED.length > 0 &&
                      sectionsData.COMPLETED.every((t) => selectedTaskIds.has(t.id))
                    }
                    onToggleSelectAll={() =>
                      selectAllSection(sectionsData.COMPLETED.map((t) => t.id))
                    }
                  />
                  {isSectionExpanded("COMPLETED") && (
                    <div className="space-y-2">
                      {sectionsData.COMPLETED.length === 0 ? (
                        <div className="text-center py-6 text-xs text-[#918EA2] italic">
                          No completed tasks yet. Check off items as you finish them!
                        </div>
                      ) : (
                        sectionsData.COMPLETED.map((task) => (
                          <SortableTaskCard
                            key={task.id}
                            task={task}
                            hasSubtasks={subtaskProgressMap.has(task.id)}
                            subtaskProgress={subtaskProgressMap.get(task.id)}
                            parentTitle={task.parentId ? tasksById.get(task.parentId)?.title : null}
                            isSelectionMode={isSelectionMode}
                            isSelected={selectedTaskIds.has(task.id)}
                            onToggleSelect={() => toggleSelectTask(task.id)}
                            onToggleCompletion={() => toggleTaskCompletion(userCode, task.id)}
                            onDrillDown={() => setBreadcrumb(task.id)}
                            onNavigateToParent={() => task.parentId && setBreadcrumb(task.parentId)}
                            onShowDetails={() => setSelectedTaskForDetails(task)}
                            onEditTask={() => setTaskToEdit(task)}
                            onAddSubtask={() => handleOpenAddSubtask(task)}
                            onAdjustParent={() => setTaskForParentAdjust(task)}
                            onDeleteTask={() => setTaskToDelete(task)}
                            onReactivateForToday={
                              task.repeatType
                                ? () => reactivateForToday(userCode, task.id)
                                : undefined
                            }
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Empty state when searching and no matches found */}
              {isSearching && totalMatches === 0 && (
                <div className="text-center py-12 text-[#918EA2] space-y-2">
                  <Search className="w-8 h-8 mx-auto text-[#474556]" />
                  <p className="text-sm font-medium">No tasks found</p>
                  <p className="text-xs text-[#918EA2]">
                    No tasks matching &ldquo;{searchQuery}&rdquo; in any section.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Floating Action Button (+) */}
          <FloatingActionButton
            hidden={isSelectionMode}
            onClick={() => {
              setParentForSubtask(
                breadcrumbParentId ? tasksById.get(breadcrumbParentId) || null : null
              );
              setCreateDialogOpen(true);
            }}
          />

          {/* Selection Bottom Action Bar */}
          {isSelectionMode && (
            <SelectionActionBar
              selectedCount={selectedCount}
              onClear={clearSelection}
              onComplete={() => batchCompleteTasks(userCode, Array.from(selectedTaskIds))}
              onAdjustParent={() => {
                if (selectedTaskIds.size > 0) {
                  const first = tasksById.get(Array.from(selectedTaskIds)[0]) || null;
                  setTaskForParentAdjust(first);
                }
              }}
              onDelete={() => batchDeleteTasks(userCode, Array.from(selectedTaskIds))}
            />
          )}

          {/* Create / Edit Dialog */}
          <CreateEditTaskDialog
            open={createDialogOpen || !!taskToEdit}
            onOpenChange={(open) => {
              if (!open) {
                setCreateDialogOpen(false);
                setTaskToEdit(null);
                setParentForSubtask(null);
              }
            }}
            taskToEdit={taskToEdit}
            parentTask={parentForSubtask}
            recentTones={recentTones}
            onSave={async (data) => {
              if (taskToEdit) {
                await updateTask(userCode, taskToEdit.id, data);
              } else {
                await createTask(userCode, data);
              }
            }}
          />

          {/* Task Details Panel */}
          <TaskDetailsPanel
            task={selectedTaskForDetails}
            isOpen={!!selectedTaskForDetails}
            onClose={() => setSelectedTaskForDetails(null)}
            onEdit={(t) => {
              setSelectedTaskForDetails(null);
              setTaskToEdit(t);
            }}
            onDelete={(t) => {
              setSelectedTaskForDetails(null);
              setTaskToDelete(t);
            }}
            onReactivateForToday={
              selectedTaskForDetails?.repeatType
                ? (t) => reactivateForToday(userCode, t.id)
                : undefined
            }
            onSnooze={(t, mins) => snoozeTask(userCode, t.id, mins)}
          />

          {/* Adjust Parent Dialog */}
          <AdjustParentDialog
            open={!!taskForParentAdjust}
            onOpenChange={(open) => !open && setTaskForParentAdjust(null)}
            task={taskForParentAdjust}
            allTasks={tasks}
            onConfirm={async (newParentId, moveSubtasks) => {
              if (isSelectionMode && selectedTaskIds.size > 1) {
                await batchAdjustParent(userCode, Array.from(selectedTaskIds), newParentId);
              } else if (taskForParentAdjust) {
                await adjustParent(userCode, taskForParentAdjust.id, newParentId, moveSubtasks);
              }
            }}
          />

          {/* Delete Task Confirmation */}
          <DeleteTaskDialog
            open={!!taskToDelete}
            onOpenChange={(open) => !open && setTaskToDelete(null)}
            task={taskToDelete}
            hasSubtasks={taskToDelete ? subtaskProgressMap.has(taskToDelete.id) : false}
            onConfirm={async (cascade) => {
              if (taskToDelete) {
                await deleteTask(userCode, taskToDelete.id, cascade);
              }
            }}
          />

          {/* Export Dialog */}
          <ExportTasksDialog
            open={exportDialogOpen}
            onOpenChange={setExportDialogOpen}
            tasks={tasks}
            filteredTasks={filteredTasks}
          />
        </div>
      )}
    </AppShell>
  );
}
