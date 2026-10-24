"use client";

import React, { useState, useMemo } from "react";
import {
  CheckSquare,
  RefreshCw,
  Download,
  Flame,
  Plus,
  Search,
  X,
  MoreVertical,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
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
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { AppShell } from "@/components/AppShell";
import { AppHeader } from "@/components/AppHeader";
import { DisciplineOverviewCard } from "@/components/DisciplineOverviewCard";
import { HabitCard } from "@/components/HabitCard";
import { CreateEditHabitDialog } from "@/components/CreateEditHabitDialog";
import { HabitDetailView } from "@/components/HabitDetailView";
import { HabitNoteDialog } from "@/components/HabitNoteDialog";
import { DeleteHabitDialog, ExportHabitsDialog } from "@/components/HabitDialogs";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { SelectionActionBar } from "@/components/SelectionActionBar";

import { useAuthStore } from "@/store/useAuthStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useHabitStore, isDayComplete } from "@/store/useHabitStore";
import { Habit } from "@/types";
import { format } from "date-fns";

// Sortable Habit Card Wrapper
function SortableHabitItem(props: React.ComponentProps<typeof HabitCard>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.habit.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <div ref={setNodeRef} style={style}>
      <HabitCard {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

export default function HabitsPage() {
  const { user } = useAuthStore();
  const { recentTones } = useTaskStore();
  const {
    habits,
    logs,
    selectedHabitId,
    setSelectedHabitId,
    searchQuery,
    setSearchQuery,
    isSelectionMode,
    enterSelectionMode,
    exitSelectionMode,
    selectedHabitIds,
    toggleSelectHabit,
    clearSelection,
    fetchHabits,
    fetchLogs,
    createHabit,
    updateHabit,
    deleteHabit,
    batchDeleteHabits,
    reorderHabits,
    setHabitState,
    stepTargetValue,
  } = useHabitStore();

  const userCode = user?.code || "";

  // Modals state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [habitToEdit, setHabitToEdit] = useState<Habit | null>(null);
  const [habitToDelete, setHabitToDelete] = useState<Habit | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // Note Prompt Modal state
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteDate, setNoteDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [noteInitialVal, setNoteInitialVal] = useState<string | null>(null);
  const [activeNoteHabitId, setActiveNoteHabitId] = useState<string | null>(null);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const toIsoDay = (d: Date) => (d.getDay() === 0 ? 7 : d.getDay());
  const todayIso = toIsoDay(new Date());

  // Filter & Auto-sort: Pending -> Completed today -> Rest days
  const displayHabits = useMemo(() => {
    let list = [...habits];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((h) => h.title.toLowerCase().includes(q));
    } else {
      // Auto-sort order when not actively searching
      list.sort((a, b) => {
        const aSched =
          a.repeatType === "EVERYDAY"
            ? true
            : a.repeatType === "SPECIFIC_DAYS"
            ? a.repeatDays.includes(todayIso)
            : true;
        const bSched =
          b.repeatType === "EVERYDAY"
            ? true
            : b.repeatType === "SPECIFIC_DAYS"
            ? b.repeatDays.includes(todayIso)
            : true;

        const aLog = logs.get(a.id)?.get(todayStr);
        const bLog = logs.get(b.id)?.get(todayStr);

        const aDone = isDayComplete(a, aLog);
        const bDone = isDayComplete(b, bLog);

        const aRank = !aSched ? 2 : aDone ? 1 : 0;
        const bRank = !bSched ? 2 : bDone ? 1 : 0;

        if (aRank !== bRank) return aRank - bRank;
        return a.position - b.position;
      });
    }
    return list;
  }, [habits, searchQuery, logs, todayIso, todayStr]);

  const currentSelectedHabit = useMemo(
    () => habits.find((h) => h.id === selectedHabitId) || null,
    [habits, selectedHabitId]
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    document.body.classList.remove("is-dragging");
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = displayHabits.findIndex((h) => h.id === active.id);
    const newIdx = displayHabits.findIndex((h) => h.id === over.id);
    if (oldIdx !== -1 && newIdx !== -1) {
      const reordered = arrayMove(displayHabits, oldIdx, newIdx);
      await reorderHabits(userCode, reordered);
    }
  };

  const handleSetHabitStateWithPrompt = async (
    habit: Habit,
    date: string,
    state: "DONE" | "MISSED" | "UNMARKED"
  ) => {
    await setHabitState(userCode, habit.id, date, state);

    // Check if note prompt should trigger
    if (state === "DONE" && (habit.notePrompt === "BOTH" || habit.notePrompt === "DONE_ONLY")) {
      setActiveNoteHabitId(habit.id);
      setNoteDate(date);
      setNoteInitialVal(logs.get(habit.id)?.get(date)?.note || null);
      setNoteModalOpen(true);
    } else if (
      state === "MISSED" &&
      (habit.notePrompt === "BOTH" || habit.notePrompt === "MISSED_ONLY")
    ) {
      setActiveNoteHabitId(habit.id);
      setNoteDate(date);
      setNoteInitialVal(logs.get(habit.id)?.get(date)?.note || null);
      setNoteModalOpen(true);
    }
  };

  const handleStepTargetWithPrompt = async (habit: Habit, date: string, delta: number) => {
    const { needNote } = await stepTargetValue(userCode, habit.id, date, delta);
    if (needNote) {
      setActiveNoteHabitId(habit.id);
      setNoteDate(date);
      setNoteInitialVal(logs.get(habit.id)?.get(date)?.note || null);
      setNoteModalOpen(true);
    }
  };

  return (
    <AppShell>
      {({ onOpenSettings }) => (
        <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto px-4 sm:px-6">
          {/* ======================================================== */}
          {/* SCREEN 1: HABITS OVERVIEW                                 */}
          {/* ======================================================== */}
          {!selectedHabitId ? (
            <>
              <AppHeader onOpenSettings={onOpenSettings} />

              {/* Persistent Search and Controls Row */}
              <div className="flex items-center gap-2 mt-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#918EA2] pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search habits by name..."
                    className="w-full bg-[#111114] border border-[#1C1C20] hover:border-[#474556]/50 focus:border-[#C5C0FF] rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-[#E3E1EC] placeholder-[#918EA2] transition-colors focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#918EA2] hover:text-white p-0.5 rounded-full"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setExportDialogOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#111114] border border-[#1C1C20] text-[#68DBA9] hover:bg-[#68DBA9]/10 hover:border-[#68DBA9]/40 transition-colors shrink-0"
                  title="Export habits"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export</span>
                </button>

                {/* 3-dots Menu Button */}
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      type="button"
                      className="p-2 rounded-xl bg-[#111114] border border-[#1C1C20] text-[#918EA2] hover:text-white hover:border-[#474556] transition-colors shrink-0"
                      title="More options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      align="end"
                      sideOffset={6}
                      className="z-50 min-w-[170px] bg-[#1C1C20] border border-[#474556]/40 rounded-xl p-1 shadow-2xl animate-in fade-in-80"
                    >
                      <DropdownMenu.Item
                        onClick={() => {
                          if (isSelectionMode) exitSelectionMode();
                          else enterSelectionMode();
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg cursor-pointer outline-none transition-colors text-[#E3E1EC] hover:bg-[#252529] hover:text-[#C5C0FF]"
                      >
                        <CheckSquare className="w-4 h-4 text-[#C5C0FF]" />
                        <span>{isSelectionMode ? "Exit Selection" : "Select Habits"}</span>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        onClick={() => {
                          fetchHabits(userCode);
                          fetchLogs(userCode);
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg cursor-pointer outline-none transition-colors text-[#E3E1EC] hover:bg-[#252529] hover:text-[#68DBA9]"
                      >
                        <RefreshCw className="w-4 h-4 text-[#68DBA9]" />
                        <span>Refresh Habits</span>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        onClick={() => setExportDialogOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg cursor-pointer outline-none transition-colors text-[#E3E1EC] hover:bg-[#252529] hover:text-[#FFB77D]"
                      >
                        <Download className="w-4 h-4 text-[#FFB77D]" />
                        <span>Export Habits</span>
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>

              <div>
                {/* Discipline Overview Ring Card */}
                {!searchQuery && <DisciplineOverviewCard habits={habits} logs={logs} />}

                {/* Section Header */}
                <div className="flex items-center justify-between mb-3 px-1">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#918EA2]">
                    {searchQuery ? `Search Results (${displayHabits.length})` : `All Habits (${displayHabits.length})`}
                  </h2>
                </div>

                {displayHabits.length === 0 ? (
                  <div className="text-center py-16 px-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#161619] border border-[#1C1C20] flex items-center justify-center mx-auto mb-3 text-[#FFB77D]">
                      <Flame className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-white">No habits tracked yet</p>
                    <p className="text-xs text-[#918EA2] mt-1 max-w-xs mx-auto">
                      Build daily momentum! Tap + below to add your first habit or routine.
                    </p>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={() => document.body.classList.add("is-dragging")}
                    onDragEnd={handleDragEnd}
                    onDragCancel={() => document.body.classList.remove("is-dragging")}
                  >
                    <SortableContext
                      items={displayHabits.map((h) => h.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3 pb-24">
                        {displayHabits.map((habit) => (
                          <SortableHabitItem
                            key={habit.id}
                            habit={habit}
                            logs={logs.get(habit.id)}
                            onClick={() => setSelectedHabitId(habit.id)}
                            onEdit={() => setHabitToEdit(habit)}
                            onDelete={() => setHabitToDelete(habit)}
                            onSetState={(d, st) => handleSetHabitStateWithPrompt(habit, d, st)}
                            onStepTarget={(d, delta) => handleStepTargetWithPrompt(habit, d, delta)}
                            isSelectionMode={isSelectionMode}
                            isSelected={selectedHabitIds.has(habit.id)}
                            onToggleSelect={() => toggleSelectHabit(habit.id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>

              {/* FAB (+) */}
              <FloatingActionButton
                hidden={isSelectionMode}
                label="Create habit"
                onClick={() => setCreateDialogOpen(true)}
              />

              {/* Selection Bottom Action Bar */}
              {isSelectionMode && selectedHabitIds.size > 0 && (
                <SelectionActionBar
                  selectedCount={selectedHabitIds.size}
                  onClear={clearSelection}
                  onExport={() => setExportDialogOpen(true)}
                  onDelete={() => batchDeleteHabits(userCode, Array.from(selectedHabitIds))}
                />
              )}
            </>
          ) : (
            /* ======================================================== */
            /* SCREEN 2: HABIT DETAIL VIEW                               */
            /* ======================================================== */
            currentSelectedHabit && (
              <HabitDetailView
                habit={currentSelectedHabit}
                logs={logs.get(currentSelectedHabit.id)}
                onBack={() => setSelectedHabitId(null)}
                onEdit={() => setHabitToEdit(currentSelectedHabit)}
                onDelete={() => setHabitToDelete(currentSelectedHabit)}
                onSetState={async (date, state, value, note) => {
                  await setHabitState(userCode, currentSelectedHabit.id, date, state, value, note);
                }}
                onStepTarget={async (date, delta) => {
                  return await stepTargetValue(userCode, currentSelectedHabit.id, date, delta);
                }}
                onOpenNoteDialog={(date, currentNote) => {
                  setActiveNoteHabitId(currentSelectedHabit.id);
                  setNoteDate(date);
                  setNoteInitialVal(currentNote || null);
                  setNoteModalOpen(true);
                }}
              />
            )
          )}

          {/* Create / Edit Habit Dialog */}
          <CreateEditHabitDialog
            open={createDialogOpen || !!habitToEdit}
            onOpenChange={(open) => {
              if (!open) {
                setCreateDialogOpen(false);
                setHabitToEdit(null);
              }
            }}
            habitToEdit={habitToEdit}
            recentTones={recentTones}
            onSave={async (data) => {
              if (habitToEdit) {
                await updateHabit(userCode, habitToEdit.id, data);
              } else {
                await createHabit(userCode, data);
              }
            }}
          />

          {/* Delete Habit Confirmation Dialog */}
          <DeleteHabitDialog
            open={!!habitToDelete}
            onOpenChange={(open) => !open && setHabitToDelete(null)}
            habit={habitToDelete}
            onConfirm={async () => {
              if (habitToDelete) {
                await deleteHabit(userCode, habitToDelete.id);
              }
            }}
          />

          {/* Note Prompt Modal */}
          <HabitNoteDialog
            open={noteModalOpen}
            onOpenChange={setNoteModalOpen}
            date={noteDate}
            initialNote={noteInitialVal}
            onSave={async (noteText) => {
              if (activeNoteHabitId) {
                const existing = logs.get(activeNoteHabitId)?.get(noteDate);
                if (existing) {
                  await setHabitState(
                    userCode,
                    activeNoteHabitId,
                    noteDate,
                    existing.state,
                    existing.value,
                    noteText
                  );
                }
              }
            }}
          />

          {/* Export Habits Dialog */}
          <ExportHabitsDialog
            open={exportDialogOpen}
            onOpenChange={setExportDialogOpen}
            habits={
              isSelectionMode && selectedHabitIds.size > 0
                ? habits.filter((h) => selectedHabitIds.has(h.id))
                : habits
            }
            logs={logs}
          />
        </div>
      )}
    </AppShell>
  );
}
