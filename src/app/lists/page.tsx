"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Plus,
  Search,
  X,
  MoreVertical,
  Check,
  CheckSquare,
  RefreshCw,
  Layers,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  FileText,
  FolderTree,
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
  rectSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";

import { AppShell } from "@/components/AppShell";
import { AppHeader } from "@/components/AppHeader";
import { ListCard } from "@/components/ListCard";
import { CreateEditListDialog } from "@/components/CreateEditListDialog";
import { ListItemRow } from "@/components/ListItemTree";
import { SortableListItemRow } from "@/components/SortableListItemRow";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { SelectionActionBar } from "@/components/SelectionActionBar";
import { renderListIcon } from "@/components/ListIconPicker";
import { ListItemDetailsPanel } from "@/components/ListItemDetailsPanel";
import { ListDetailsPanel } from "@/components/ListDetailsPanel";
import { AdjustParentListDialog } from "@/components/AdjustParentListDialog";
import { AddSubtasksToLeafDialog } from "@/components/AddSubtasksToLeafDialog";
import { AdjustItemParentDialog } from "@/components/AdjustItemParentDialog";
import {
  AddMultipleItemsDialog,
  EditItemDialog,
  DeleteItemDialog,
} from "@/components/ListItemDialogs";
import { PinDialog, PinDialogMode } from "@/components/PinDialog";
import { Lock } from "lucide-react";

import { useAuthStore } from "@/store/useAuthStore";
import { useListStore } from "@/store/useListStore";
import { TaskList, ListItem } from "@/types";

// Sortable List Card Wrapper for drag-and-drop reordering
function SortableListCard(props: React.ComponentProps<typeof ListCard>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.list.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ListCard {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

function SearchItemRow({
  item,
  bPath,
  onNavigate,
  onToggle,
}: {
  item: ListItem;
  bPath: string[];
  onNavigate: () => void;
  onToggle: () => void;
}) {
  const [localCompleted, setLocalCompleted] = useState(item.isCompleted);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setLocalCompleted(item.isCompleted);
  }, [item.isCompleted]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !localCompleted;
    setLocalCompleted(next);
    setIsAnimating(true);
    setTimeout(() => {
      onToggle();
      setIsAnimating(false);
    }, 300);
  };

  return (
    <div
      onClick={onNavigate}
      className="group flex items-start gap-3 p-3 bg-[#111114] hover:bg-[#161619] border border-[#1C1C20] hover:border-[#474556]/50 rounded-2xl cursor-pointer transition-all"
    >
      <motion.button
        type="button"
        onClick={handleToggle}
        animate={isAnimating ? { scale: [1, 1.35, 0.9, 1] } : { scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
          localCompleted
            ? "bg-[#5A45FF] border-[#5A45FF] text-white shadow-sm shadow-[#5A45FF]/30"
            : "border-[#474556] hover:border-[#C5C0FF] bg-transparent"
        }`}
      >
        {localCompleted && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          >
            <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
          </motion.div>
        )}
      </motion.button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-medium truncate transition-all duration-200 ${
              localCompleted ? "line-through text-[#918EA2]" : "text-[#E3E1EC]"
            }`}
          >
            {item.title}
          </span>
        </div>
        {bPath.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium text-[#C5C0FF] bg-[#C5C0FF]/10 border border-[#C5C0FF]/20 px-2 py-0.5 rounded-md w-fit">
            <FolderTree className="w-3 h-3 text-[#C5C0FF] shrink-0" />
            <span className="truncate max-w-[280px]">
              {bPath.join("  ›  ")}
            </span>
          </div>
        )}
        {item.notes && (
          <p className="text-xs text-[#918EA2] truncate mt-1">
            {item.notes}
          </p>
        )}
      </div>
    </div>
  );
}

export default function ListsPage() {
  const { user } = useAuthStore();
  const {
    lists,
    items,
    selectedListId,
    setSelectedListId,
    searchQuery,
    setSearchQuery,
    itemSearchQuery,
    setItemSearchQuery,
    isSelectionMode,
    enterSelectionMode,
    exitSelectionMode,
    selectedListIds,
    toggleSelectList,
    selectedItemIds,
    toggleSelectItem,
    clearSelection,
    completedSectionExpanded,
    toggleCompletedSection,
    fetchLists,
    fetchItems,
    createList,
    updateList,
    deleteList,
    batchDeleteLists,
    reorderLists,
    moveListIntoList,
    moveListsIntoList,
    createItem,
    createMultipleItems,
    updateItem,
    toggleItemCompletion,
    deleteItem,
    batchDeleteItems,
    batchCompleteItems,
    adjustItemParent,
    batchAdjustItemParent,
    moveItemsToParent,
    convertItemToStandaloneList,
    convertLeafToParentWithSubtasks,
    reorderItems,
    lockedListPins,
    unlockedListIds,
    fetchListPins,
    setListPin,
    removeListPin,
    unlockListTemporarily,
    lockListAgain,
    isListLocked,
  } = useListStore();

  const userCode = user?.code || "";

  // PIN Lock Dialog State
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [pinDialogMode, setPinDialogMode] = useState<PinDialogMode>("SET_PIN");
  const [pinTargetList, setPinTargetList] = useState<TaskList | null>(null);

  // Fetch pins on mount
  useEffect(() => {
    if (userCode) {
      fetchListPins(userCode);
    }
  }, [userCode, fetchListPins]);

  // Modals state
  const [createListOpen, setCreateListOpen] = useState(false);
  const [listToEdit, setListToEdit] = useState<TaskList | null>(null);
  const [listToDelete, setListToDelete] = useState<TaskList | null>(null);
  const [listForDetails, setListForDetails] = useState<TaskList | null>(null);
  const [listToAdjustParent, setListToAdjustParent] = useState<TaskList | null>(null);
  const [batchListsToAdjust, setBatchListsToAdjust] = useState<TaskList[] | null>(null);

  // Item Modals state
  const [quickItemTitle, setQuickItemTitle] = useState("");
  const [addMultipleOpen, setAddMultipleOpen] = useState(false);
  const [leafItemForAddSubtasks, setLeafItemForAddSubtasks] = useState<ListItem | null>(null);
  const [parentForSubtasks, setParentForSubtasks] = useState<ListItem | null>(null);
  const [itemToEdit, setItemToEdit] = useState<ListItem | null>(null);
  const [itemForDetails, setItemForDetails] = useState<ListItem | null>(null);
  const [itemForAdjustParent, setItemForAdjustParent] = useState<ListItem | null>(null);
  const [batchItemsToAdjust, setBatchItemsToAdjust] = useState<ListItem[] | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ListItem | null>(null);

  // Breadcrumb navigation stack for infinite hierarchy drill-down
  const [itemBreadcrumbs, setItemBreadcrumbs] = useState<ListItem[]>([]);
  const pendingBreadcrumbsRef = React.useRef<ListItem[] | null>(null);
  const currentParent = itemBreadcrumbs[itemBreadcrumbs.length - 1] || null;

  // Clear breadcrumbs when switching or exiting lists (unless navigation specifically set pending breadcrumbs)
  useEffect(() => {
    if (pendingBreadcrumbsRef.current !== null) {
      setItemBreadcrumbs(pendingBreadcrumbsRef.current);
      pendingBreadcrumbsRef.current = null;
    } else {
      setItemBreadcrumbs([]);
    }
    if (!selectedListId) {
      setItemForDetails(null);
      setListForDetails(null);
    }
  }, [selectedListId]);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const currentList = useMemo(
    () => lists.find((l) => l.id === selectedListId) || null,
    [lists, selectedListId]
  );

  // List stats: total & completed
  const listStatsMap = useMemo(() => {
    const map = new Map<string, { total: number; completed: number }>();
    for (const l of lists) {
      const listItems = items.filter((i) => i.listId === l.id);
      const done = listItems.filter((i) => i.isCompleted).length;
      map.set(l.id, { total: listItems.length, completed: done });
    }
    return map;
  }, [lists, items]);

  // Helper to construct full breadcrumb path for any item (e.g. ["GOALS", "ABBU"])
  const getItemBreadcrumbPath = useCallback(
    (item: ListItem): string[] => {
      const list = lists.find((l) => l.id === item.listId);
      const listItems = items.filter((i) => i.listId === item.listId);
      const itemMap = new Map(listItems.map((i) => [i.id, i]));
      const ancestors: string[] = [];
      let curr = item.parentId;
      const visited = new Set<string>();
      while (curr && !visited.has(curr)) {
        visited.add(curr);
        const parent = itemMap.get(curr);
        if (parent) {
          ancestors.unshift(parent.title);
          curr = parent.parentId;
        } else {
          break;
        }
      }
      const path: string[] = [];
      if (list?.name) {
        path.push(list.name);
      }
      path.push(...ancestors);
      return path;
    },
    [lists, items]
  );

  // Helper to drill down directly to an item
  const navigateToItem = useCallback(
    (item: ListItem) => {
      const listItems = items.filter((i) => i.listId === item.listId);
      const itemMap = new Map(listItems.map((i) => [i.id, i]));
      const ancestors: ListItem[] = [];
      let curr = item.parentId;
      const visited = new Set<string>();
      while (curr && !visited.has(curr)) {
        visited.add(curr);
        const parent = itemMap.get(curr);
        if (parent) {
          ancestors.unshift(parent);
          curr = parent.parentId;
        } else {
          break;
        }
      }
      const hasSubtasks = listItems.some((i) => i.parentId === item.id);
      if (hasSubtasks) {
        ancestors.push(item);
      }

      pendingBreadcrumbsRef.current = ancestors;

      const targetList = lists.find((l) => l.id === item.listId);
      if (targetList && isListLocked(targetList.id)) {
        setPinTargetList(targetList);
        setPinDialogMode("UNLOCK_TEMPORARY");
        setPinDialogOpen(true);
        return;
      }

      if (selectedListId === item.listId) {
        setItemBreadcrumbs(ancestors);
        pendingBreadcrumbsRef.current = null;
      } else {
        setSelectedListId(item.listId);
      }
      setSearchQuery("");
      setItemSearchQuery("");
    },
    [lists, items, selectedListId, isListLocked, setSearchQuery, setItemSearchQuery, setSelectedListId, setPinTargetList, setPinDialogMode, setPinDialogOpen]
  );

  // Filtered lists and global items for overview
  const { filteredLists, matchingGlobalItems } = useMemo(() => {
    if (!searchQuery.trim()) {
      return { filteredLists: lists, matchingGlobalItems: [] };
    }
    const q = searchQuery.toLowerCase().trim();
    const matchingItems = items.filter(
      (i) => i.title.toLowerCase().includes(q) || (i.notes && i.notes.toLowerCase().includes(q))
    );
    const matchedLists = lists.filter((l) => l.name.toLowerCase().includes(q));
    return {
      filteredLists: matchedLists,
      matchingGlobalItems: matchingItems,
    };
  }, [lists, items, searchQuery]);

  // Items for currently selected list
  const currentListItems = useMemo(() => {
    if (!selectedListId) return [];
    return items.filter((i) => i.listId === selectedListId);
  }, [items, selectedListId]);

  // Keep breadcrumbs synchronized with item state updates
  useEffect(() => {
    if (selectedListId && currentListItems.length > 0 && itemBreadcrumbs.length > 0) {
      const validMap = new Map(currentListItems.map((i) => [i.id, i]));
      const nextBreadcrumbs: ListItem[] = [];
      for (const crumb of itemBreadcrumbs) {
        const fresh = validMap.get(crumb.id);
        if (fresh) nextBreadcrumbs.push(fresh);
        else break;
      }
      if (nextBreadcrumbs.length !== itemBreadcrumbs.length) {
        setItemBreadcrumbs(nextBreadcrumbs);
      }
    }
  }, [selectedListId, currentListItems, itemBreadcrumbs]);

  // Subtask statistics map per parent
  const subtaskStatsMap = useMemo(() => {
    const map = new Map<string, { total: number; completed: number }>();
    for (const it of currentListItems) {
      if (it.parentId) {
        const curr = map.get(it.parentId) || { total: 0, completed: 0 };
        curr.total += 1;
        if (it.isCompleted) curr.completed += 1;
        map.set(it.parentId, curr);
      }
    }
    return map;
  }, [currentListItems]);

  // Scoped items for the current drill-down level
  const { scopedActiveItems, scopedCompletedItems } = useMemo(() => {
    const isSearching = itemSearchQuery.trim().length > 0;
    const q = itemSearchQuery.toLowerCase().trim();

    let base: ListItem[];
    if (isSearching) {
      base = currentListItems.filter(
        (i) => i.title.toLowerCase().includes(q) || (i.notes && i.notes.toLowerCase().includes(q))
      );
    } else if (currentParent == null) {
      base = currentListItems.filter((i) => !i.parentId);
    } else {
      base = currentListItems.filter((i) => i.parentId === currentParent.id);
    }

    const active = base.filter((i) => !i.isCompleted);
    const completed = base.filter((i) => i.isCompleted);

    return {
      scopedActiveItems: active.sort((a, b) => a.position - b.position),
      scopedCompletedItems: completed.sort(
        (a, b) => (b.completedAt || 0) - (a.completedAt || 0)
      ),
    };
  }, [currentListItems, itemSearchQuery, currentParent]);

  const handleQuickAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickItemTitle.trim() || !selectedListId) return;
    const title = quickItemTitle.trim();
    setQuickItemTitle("");
    await createItem(
      userCode,
      selectedListId,
      title,
      currentParent ? currentParent.id : null
    );
  };

  const handleListDragEnd = async (event: DragEndEvent) => {
    document.body.classList.remove("is-dragging");
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = lists.findIndex((l) => l.id === active.id);
    const newIdx = lists.findIndex((l) => l.id === over.id);
    if (oldIdx !== -1 && newIdx !== -1) {
      const reordered = arrayMove(lists, oldIdx, newIdx);
      await reorderLists(userCode, reordered);
    }
  };

  const handleItemDragEnd = async (event: DragEndEvent) => {
    document.body.classList.remove("is-dragging");
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = scopedActiveItems.findIndex((i) => i.id === active.id);
    const newIdx = scopedActiveItems.findIndex((i) => i.id === over.id);
    if (oldIdx !== -1 && newIdx !== -1) {
      const reordered = arrayMove(scopedActiveItems, oldIdx, newIdx);
      await reorderItems(userCode, reordered);
    }
  };

  const currentStats = currentList ? listStatsMap.get(currentList.id) : null;
  const currentPercent =
    currentStats && currentStats.total > 0
      ? Math.round((currentStats.completed / currentStats.total) * 100)
      : 0;

  return (
    <AppShell>
      {({ onOpenSettings }) => (
        <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto px-4 sm:px-6">
          {/* ======================================================== */}
          {/* SCREEN 1: LISTS OVERVIEW SCREEN                           */}
          {/* ======================================================== */}
          {!selectedListId ? (
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
                    placeholder="Search lists..."
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
                  onClick={() => setCreateListOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#111114] border border-[#1C1C20] text-[#C5C0FF] hover:bg-[#C5C0FF]/10 hover:border-[#C5C0FF]/40 transition-colors shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">New List</span>
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
                        <span>{isSelectionMode ? "Exit Selection" : "Select Lists"}</span>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        onClick={() => {
                          fetchLists(userCode);
                          fetchItems(userCode);
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg cursor-pointer outline-none transition-colors text-[#E3E1EC] hover:bg-[#252529] hover:text-[#68DBA9]"
                      >
                        <RefreshCw className="w-4 h-4 text-[#68DBA9]" />
                        <span>Refresh Lists</span>
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>

              <div>
                {searchQuery.trim() ? (
                  /* Search View: Show matching lists AND matching items */
                  filteredLists.length === 0 && matchingGlobalItems.length === 0 ? (
                    <div className="text-center py-16 px-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#161619] border border-[#1C1C20] flex items-center justify-center mx-auto mb-3 text-[#C5C0FF]">
                        <Search className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-semibold text-white">
                        No lists or items matching "{searchQuery}"
                      </p>
                      <p className="text-xs text-[#918EA2] mt-1 max-w-xs mx-auto">
                        Try searching for another keyword or check spelling.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6 pb-24">
                      {/* Matching Lists Section */}
                      {filteredLists.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-3 px-1">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-[#918EA2]">
                              Lists ({filteredLists.length})
                            </h2>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {filteredLists.map((list) => {
                              const stats = listStatsMap.get(list.id) || { total: 0, completed: 0 };
                              const locked = isListLocked(list.id);
                              return (
                                <ListCard
                                  key={list.id}
                                  list={list}
                                  totalItems={stats.total}
                                  completedItems={stats.completed}
                                  isLocked={locked}
                                  onClick={() => {
                                    if (locked) {
                                      setPinTargetList(list);
                                      setPinDialogMode("UNLOCK_TEMPORARY");
                                      setPinDialogOpen(true);
                                    } else {
                                      setSelectedListId(list.id);
                                    }
                                  }}
                                  onEdit={() => setListToEdit(list)}
                                  onAdjustParent={() => setListToAdjustParent(list)}
                                  onDelete={() => {
                                    if (!locked) {
                                      setListToDelete(list);
                                    }
                                  }}
                                  onShowDetails={() => setListForDetails(list)}
                                  onToggleLock={() => {
                                    setPinTargetList(list);
                                    if (lockedListPins[list.id]) {
                                      setPinDialogMode("REMOVE_PIN");
                                    } else {
                                      setPinDialogMode("SET_PIN");
                                    }
                                    setPinDialogOpen(true);
                                  }}
                                  isSelectionMode={isSelectionMode}
                                  isSelected={selectedListIds.has(list.id)}
                                  onToggleSelect={() => toggleSelectList(list.id)}
                                />
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Matching Items Section */}
                      {matchingGlobalItems.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-3 px-1">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-[#918EA2]">
                              Items ({matchingGlobalItems.length})
                            </h2>
                          </div>
                          <div className="space-y-2">
                            {matchingGlobalItems.map((item) => (
                              <SearchItemRow
                                key={item.id}
                                item={item}
                                bPath={getItemBreadcrumbPath(item)}
                                onNavigate={() => navigateToItem(item)}
                                onToggle={() => toggleItemCompletion(userCode, item.id)}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  /* Standard Lists View (when not searching) */
                  <>
                    <div className="flex items-center justify-between mb-3 px-1">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-[#918EA2]">
                        My Task Lists ({lists.length})
                      </h2>
                    </div>

                    {lists.length === 0 ? (
                      <div className="text-center py-16 px-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#161619] border border-[#1C1C20] flex items-center justify-center mx-auto mb-3 text-[#C5C0FF]">
                          <Layers className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-semibold text-white">No task lists yet</p>
                        <p className="text-xs text-[#918EA2] mt-1 max-w-xs mx-auto">
                          Create dedicated lists for groceries, work projects, travel packing, or personal goals.
                        </p>
                      </div>
                    ) : (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={() => document.body.classList.add("is-dragging")}
                        onDragEnd={handleListDragEnd}
                        onDragCancel={() => document.body.classList.remove("is-dragging")}
                      >
                        <SortableContext
                          items={lists.map((l) => l.id)}
                          strategy={rectSortingStrategy}
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-24">
                            {lists.map((list) => {
                              const stats = listStatsMap.get(list.id) || { total: 0, completed: 0 };
                              const locked = isListLocked(list.id);
                              return (
                                <SortableListCard
                                  key={list.id}
                                  list={list}
                                  totalItems={stats.total}
                                  completedItems={stats.completed}
                                  isLocked={locked}
                                  onClick={() => {
                                    if (locked) {
                                      setPinTargetList(list);
                                      setPinDialogMode("UNLOCK_TEMPORARY");
                                      setPinDialogOpen(true);
                                    } else {
                                      setSelectedListId(list.id);
                                    }
                                  }}
                                  onEdit={() => setListToEdit(list)}
                                  onAdjustParent={() => setListToAdjustParent(list)}
                                  onDelete={() => {
                                    if (!locked) {
                                      setListToDelete(list);
                                    }
                                  }}
                                  onShowDetails={() => setListForDetails(list)}
                                  onToggleLock={() => {
                                    setPinTargetList(list);
                                    if (lockedListPins[list.id]) {
                                      setPinDialogMode("REMOVE_PIN");
                                    } else {
                                      setPinDialogMode("SET_PIN");
                                    }
                                    setPinDialogOpen(true);
                                  }}
                                  isSelectionMode={isSelectionMode}
                                  isSelected={selectedListIds.has(list.id)}
                                  onToggleSelect={() => toggleSelectList(list.id)}
                                />
                              );
                            })}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                  </>
                )}
              </div>

              {/* FAB (+) for creating list */}
              <FloatingActionButton
                hidden={isSelectionMode}
                label="Create list"
                onClick={() => setCreateListOpen(true)}
              />

              {/* Selection Bar for Lists */}
              {isSelectionMode && selectedListIds.size > 0 && (
                <SelectionActionBar
                  selectedCount={selectedListIds.size}
                  onClear={clearSelection}
                  onAdjustParent={() => {
                    const sel = lists.filter((l) => selectedListIds.has(l.id));
                    setBatchListsToAdjust(sel);
                  }}
                  onDelete={() => batchDeleteLists(userCode, Array.from(selectedListIds))}
                />
              )}
            </>
          ) : (
            /* ======================================================== */
            /* SCREEN 2: LIST DETAIL VIEW                                */
            /* ======================================================== */
            <div className="flex-1 flex flex-col">
              {/* Toolbar Header */}
              <div className="sticky top-0 z-30 bg-[#09090B]/90 backdrop-blur-md border-b border-[#1C1C20] py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 truncate">
                    <button
                      type="button"
                      onClick={() => {
                        if (itemSearchQuery) {
                          setItemSearchQuery("");
                        } else if (itemBreadcrumbs.length > 0) {
                          setItemBreadcrumbs((prev) => prev.slice(0, -1));
                        } else {
                          if (currentList) {
                            lockListAgain(currentList.id);
                          }
                          setSelectedListId(null);
                          setItemBreadcrumbs([]);
                        }
                      }}
                      className="p-1.5 rounded-xl text-[#918EA2] hover:text-white hover:bg-[#161619] transition-colors"
                      title={itemBreadcrumbs.length > 0 ? "Back one level" : "Back to lists"}
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>

                    <div className="w-8 h-8 rounded-xl bg-[#161619] border border-[#1C1C20] flex items-center justify-center text-[#C5C0FF] shrink-0">
                      {renderListIcon(currentList?.iconName || "list", "w-4 h-4")}
                    </div>

                    <div className="truncate">
                      <h2 className="text-base font-bold text-white truncate">
                        {currentList?.name}
                      </h2>
                      <span className="text-[11px] text-[#918EA2]">
                        {currentStats?.completed || 0}/{currentStats?.total || 0} completed
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    {/* Search box (flex-1) */}
                    <div className="relative flex-1">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#918EA2] pointer-events-none" />
                      <input
                        type="text"
                        value={itemSearchQuery}
                        onChange={(e) => setItemSearchQuery(e.target.value)}
                        placeholder="Search items in this list..."
                        className="w-full bg-[#111114] border border-[#1C1C20] hover:border-[#474556]/50 focus:border-[#C5C0FF] rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-[#E3E1EC] placeholder-[#918EA2] transition-colors focus:outline-none"
                      />
                      {itemSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setItemSearchQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#918EA2] hover:text-white p-0.5 rounded-full"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* 3-dots Menu */}
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
                          className="z-50 min-w-[180px] bg-[#1C1C20] border border-[#474556]/40 rounded-xl p-1 shadow-2xl animate-in fade-in-80"
                        >
                          {currentList && !isListLocked(currentList.id) && (
                            <DropdownMenu.Item
                              onClick={() => {
                                setParentForSubtasks(currentParent);
                                setAddMultipleOpen(true);
                              }}
                              className="flex items-center gap-2 px-3 py-2 text-xs text-[#E3E1EC] hover:bg-[#252529] hover:text-[#C5C0FF] rounded-lg cursor-pointer outline-none transition-colors"
                            >
                              <Layers className="w-3.5 h-3.5 text-[#C5C0FF]" />
                              <span>Add Multiple Items</span>
                            </DropdownMenu.Item>
                          )}
                          <DropdownMenu.Item
                            onClick={() => {
                              if (currentList) setListForDetails(currentList);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-xs text-[#E3E1EC] hover:bg-[#252529] hover:text-[#C5C0FF] rounded-lg cursor-pointer outline-none transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#C5C0FF]" />
                            <span>List Details</span>
                          </DropdownMenu.Item>
                          <DropdownMenu.Item
                            onClick={() => {
                              if (currentList) setListToAdjustParent(currentList);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-xs text-[#E3E1EC] hover:bg-[#252529] hover:text-[#FFB77D] rounded-lg cursor-pointer outline-none transition-colors"
                          >
                            <FolderTree className="w-3.5 h-3.5 text-[#FFB77D]" />
                            <span>Adjust Parent List</span>
                          </DropdownMenu.Item>
                          {currentList && isListLocked(currentList.id) && (
                            <DropdownMenu.Item
                              onClick={() => {
                                setPinTargetList(currentList);
                                setPinDialogMode("UNLOCK_TEMPORARY");
                                setPinDialogOpen(true);
                              }}
                              className="flex items-center gap-2 px-3 py-2 text-xs text-[#E3E1EC] hover:bg-[#252529] hover:text-[#68DBA9] rounded-lg cursor-pointer outline-none transition-colors"
                            >
                              <Lock className="w-3.5 h-3.5 text-[#68DBA9]" />
                              <span>Unlock List</span>
                            </DropdownMenu.Item>
                          )}
                          {currentList && lockedListPins[currentList.id] && !isListLocked(currentList.id) && (
                            <>
                              <DropdownMenu.Item
                                onClick={() => {
                                  lockListAgain(currentList.id);
                                }}
                                className="flex items-center gap-2 px-3 py-2 text-xs text-[#E3E1EC] hover:bg-[#252529] hover:text-[#FFB77D] rounded-lg cursor-pointer outline-none transition-colors"
                              >
                                <Lock className="w-3.5 h-3.5 text-[#FFB77D]" />
                                <span>Lock Now</span>
                              </DropdownMenu.Item>
                              <DropdownMenu.Item
                                onClick={() => {
                                  setPinTargetList(currentList);
                                  setPinDialogMode("REMOVE_PIN");
                                  setPinDialogOpen(true);
                                }}
                                className="flex items-center gap-2 px-3 py-2 text-xs text-[#E3E1EC] hover:bg-[#252529] hover:text-[#FFB4AB] rounded-lg cursor-pointer outline-none transition-colors"
                              >
                                <Lock className="w-3.5 h-3.5 text-[#FFB4AB]" />
                                <span>Unlock Permanently</span>
                              </DropdownMenu.Item>
                            </>
                          )}
                          {currentList && !lockedListPins[currentList.id] && (
                            <DropdownMenu.Item
                              onClick={() => {
                                setPinTargetList(currentList);
                                setPinDialogMode("SET_PIN");
                                setPinDialogOpen(true);
                              }}
                              className="flex items-center gap-2 px-3 py-2 text-xs text-[#E3E1EC] hover:bg-[#252529] hover:text-[#C5C0FF] rounded-lg cursor-pointer outline-none transition-colors"
                            >
                              <Lock className="w-3.5 h-3.5 text-[#C5C0FF]" />
                              <span>Lock List</span>
                            </DropdownMenu.Item>
                          )}
                          <DropdownMenu.Item
                            onClick={() => {
                              if (isSelectionMode) exitSelectionMode();
                              else enterSelectionMode();
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-xs text-[#E3E1EC] hover:bg-[#252529] hover:text-[#C5C0FF] rounded-lg cursor-pointer outline-none transition-colors"
                          >
                            <CheckSquare className="w-3.5 h-3.5 text-[#C5C0FF]" />
                            <span>{isSelectionMode ? "Exit Selection" : "Select Items"}</span>
                          </DropdownMenu.Item>
                          <DropdownMenu.Item
                            onClick={() => fetchItems(userCode)}
                            className="flex items-center gap-2 px-3 py-2 text-xs text-[#E3E1EC] hover:bg-[#252529] hover:text-[#68DBA9] rounded-lg cursor-pointer outline-none transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-[#68DBA9]" />
                            <span>Refresh Items</span>
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1 bg-[#161619] rounded-full overflow-hidden mt-3">
                  <div
                    className="h-full bg-gradient-to-r from-[#5A45FF] to-[#68DBA9] transition-all duration-300"
                    style={{ width: `${currentPercent}%` }}
                  />
                </div>

                {!currentList || !isListLocked(currentList.id) ? (
                  /* Breadcrumb Navigation Bar */
                  <div className="flex items-center gap-1.5 pt-2.5 pb-1 overflow-x-auto no-scrollbar">
                    <button
                      type="button"
                      onClick={() => setItemBreadcrumbs([])}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-colors flex items-center gap-1.5 shrink-0 ${
                        itemBreadcrumbs.length === 0
                          ? "bg-[#C5C0FF]/15 text-[#C5C0FF] font-bold"
                          : "text-[#918EA2] hover:text-white hover:bg-[#161619]"
                      }`}
                    >
                      <span>{currentList?.name}</span>
                    </button>

                    {itemBreadcrumbs.map((crumb, idx) => {
                      const isLast = idx === itemBreadcrumbs.length - 1;
                      return (
                        <React.Fragment key={crumb.id}>
                          <ChevronRight className="w-3.5 h-3.5 text-[#474556] shrink-0" />
                          <button
                            type="button"
                            onClick={() => setItemBreadcrumbs(itemBreadcrumbs.slice(0, idx + 1))}
                            className={`px-2.5 py-1 rounded-lg text-xs transition-colors truncate max-w-[160px] shrink-0 ${
                              isLast
                                ? "bg-[#C5C0FF]/15 text-[#C5C0FF] font-bold"
                                : "text-[#918EA2] hover:text-white hover:bg-[#161619]"
                            }`}
                            title={crumb.title}
                          >
                            {crumb.title}
                          </button>
                        </React.Fragment>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              {currentList && isListLocked(currentList.id) ? (
                <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-[#5A45FF]/10 border border-[#5A45FF]/30 flex items-center justify-center text-[#C5C0FF] mb-4 shadow-lg shadow-[#5A45FF]/10">
                    <Lock className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1.5">
                    {currentList.name} is Locked
                  </h3>
                  <p className="text-xs text-[#918EA2] max-w-sm mb-6 leading-relaxed">
                    This list is protected with a PIN. Enter the PIN to view subtasks and manage items in this list.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setPinTargetList(currentList);
                      setPinDialogMode("UNLOCK_TEMPORARY");
                      setPinDialogOpen(true);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-[#5A45FF] hover:bg-[#5A45FF]/90 text-white font-semibold text-xs flex items-center gap-2 transition-colors shadow-lg shadow-[#5A45FF]/20"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Enter PIN to Unlock</span>
                  </button>
                </div>
              ) : (
                <>

              {/* Inline Quick Add Item */}
              <form onSubmit={handleQuickAddItem} className="mt-3 mb-4">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={quickItemTitle}
                    onChange={(e) => setQuickItemTitle(e.target.value)}
                    placeholder={
                      currentParent
                        ? `Add subtask under "${currentParent.title}"...`
                        : "Add item... (Press Enter to save)"
                    }
                    className="flex-1 bg-[#161619] border border-[#474556]/40 focus:border-[#C5C0FF] rounded-xl px-3.5 py-2.5 text-sm text-[#E3E1EC] placeholder-[#918EA2] focus:outline-none transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!quickItemTitle.trim()}
                    className="p-2.5 rounded-xl bg-[#5A45FF] hover:bg-[#5A45FF]/90 disabled:opacity-40 text-white font-semibold flex items-center justify-center transition-colors"
                    title="Add item"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </form>

              {/* Items List */}
              <div className="space-y-3 pb-24">
                {scopedActiveItems.length === 0 && scopedCompletedItems.length === 0 ? (
                  <div className="text-center py-12 text-xs text-[#918EA2] italic">
                    {itemSearchQuery.trim()
                      ? `No items matching "${itemSearchQuery}"`
                      : currentParent
                      ? `No subtasks under "${currentParent.title}". Type above to add one!`
                      : "No items in this list yet. Type above to add your first item!"}
                  </div>
                ) : (
                  <>
                    {/* Active items with Drag & Drop */}
                    {scopedActiveItems.length > 0 && (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={() => document.body.classList.add("is-dragging")}
                        onDragEnd={handleItemDragEnd}
                        onDragCancel={() => document.body.classList.remove("is-dragging")}
                      >
                        <SortableContext
                          items={scopedActiveItems.map((i) => i.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-2">
                            {scopedActiveItems.map((item) => (
                              <SortableListItemRow
                                key={item.id}
                                item={item}
                                subtaskStats={subtaskStatsMap.get(item.id)}
                                breadcrumbPath={
                                  itemSearchQuery.trim() ? getItemBreadcrumbPath(item) : null
                                }
                                onNavigateToLocation={() => navigateToItem(item)}
                                parentTitle={
                                  item.parentId
                                    ? currentListItems.find((p) => p.id === item.parentId)?.title
                                    : null
                                }
                                isSelectionMode={isSelectionMode}
                                isSelected={selectedItemIds.has(item.id)}
                                onToggleSelect={() => toggleSelectItem(item.id)}
                                onToggleCompletion={(itemId) => toggleItemCompletion(userCode, itemId)}
                                onDrillDown={(it) => setItemBreadcrumbs((prev) => [...prev, it])}
                                onShowDetails={setItemForDetails}
                                onEditItem={setItemToEdit}
                                onAddSubtasks={(parent) => {
                                  const subCount = subtaskStatsMap.get(parent.id)?.total || 0;
                                  if (subCount === 0) {
                                    setLeafItemForAddSubtasks(parent);
                                  } else {
                                    setParentForSubtasks(parent);
                                    setAddMultipleOpen(true);
                                  }
                                }}
                                onAdjustParent={setItemForAdjustParent}
                                onDeleteItem={setItemToDelete}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}

                    {/* Completed Items Accordion */}
                    {scopedCompletedItems.length > 0 && (
                      <div className="mt-6 pt-3 border-t border-[#1C1C20]">
                        <button
                          type="button"
                          onClick={toggleCompletedSection}
                          className="w-full flex items-center justify-between py-2 text-xs font-semibold text-[#918EA2] hover:text-[#E3E1EC] uppercase tracking-wider"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-[#68DBA9]" />
                            <span>Completed ({scopedCompletedItems.length})</span>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 transition-transform duration-200 ${
                              completedSectionExpanded || itemSearchQuery.trim().length > 0
                                ? "rotate-180"
                                : ""
                            }`}
                          />
                        </button>

                        {(completedSectionExpanded || itemSearchQuery.trim().length > 0) && (
                          <div className="space-y-2 mt-2">
                            {scopedCompletedItems.map((item) => (
                              <ListItemRow
                                key={item.id}
                                item={item}
                                subtaskStats={subtaskStatsMap.get(item.id)}
                                breadcrumbPath={
                                  itemSearchQuery.trim() ? getItemBreadcrumbPath(item) : null
                                }
                                onNavigateToLocation={() => navigateToItem(item)}
                                parentTitle={
                                  item.parentId
                                    ? currentListItems.find((p) => p.id === item.parentId)?.title
                                    : null
                                }
                                isSelectionMode={isSelectionMode}
                                isSelected={selectedItemIds.has(item.id)}
                                onToggleSelect={() => toggleSelectItem(item.id)}
                                onToggleCompletion={(itemId) => toggleItemCompletion(userCode, itemId)}
                                onDrillDown={(it) => setItemBreadcrumbs((prev) => [...prev, it])}
                                onShowDetails={setItemForDetails}
                                onEditItem={setItemToEdit}
                                onAddSubtasks={(parent) => {
                                  const subCount = subtaskStatsMap.get(parent.id)?.total || 0;
                                  if (subCount === 0) {
                                    setLeafItemForAddSubtasks(parent);
                                  } else {
                                    setParentForSubtasks(parent);
                                    setAddMultipleOpen(true);
                                  }
                                }}
                                onAdjustParent={setItemForAdjustParent}
                                onDeleteItem={setItemToDelete}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Selection Bar for Items */}
              {isSelectionMode && selectedItemIds.size > 0 && (
                <SelectionActionBar
                  selectedCount={selectedItemIds.size}
                  onClear={clearSelection}
                  onComplete={() =>
                    batchCompleteItems(userCode, Array.from(selectedItemIds))
                  }
                  onAdjustParent={() => {
                    const selItems = currentListItems.filter((i) => selectedItemIds.has(i.id));
                    setBatchItemsToAdjust(selItems);
                  }}
                  onDelete={() =>
                    batchDeleteItems(userCode, Array.from(selectedItemIds))
                  }
                />
              )}
                </>
              )}
            </div>
          )}

          {/* Create / Edit List Dialog */}
          <CreateEditListDialog
            open={createListOpen || !!listToEdit}
            onOpenChange={(open) => {
              if (!open) {
                setCreateListOpen(false);
                setListToEdit(null);
              }
            }}
            listToEdit={listToEdit}
            onSave={async (name, icon, initialItems) => {
              if (listToEdit) {
                await updateList(userCode, listToEdit.id, name, icon);
              } else {
                const created = await createList(userCode, name, icon);
                if (created && initialItems && initialItems.length > 0) {
                  await createMultipleItems(userCode, created.id, initialItems, null);
                }
              }
            }}
          />

          {/* Add Multiple Items / Subtasks Dialog */}
          <AddMultipleItemsDialog
            open={addMultipleOpen}
            onOpenChange={setAddMultipleOpen}
            parentId={parentForSubtasks?.id || null}
            parentTitle={parentForSubtasks?.title || null}
            onAdd={async (titles, pId) => {
              if (selectedListId) {
                await createMultipleItems(userCode, selectedListId, titles, pId);
              }
            }}
          />

          {/* Edit Item Dialog */}
          <EditItemDialog
            open={!!itemToEdit}
            onOpenChange={(open) => !open && setItemToEdit(null)}
            item={itemToEdit}
            onSave={async (patch) => {
              if (itemToEdit) {
                await updateItem(userCode, itemToEdit.id, patch);
              }
            }}
          />

          {/* Item Details Right Sidebar Panel */}
          <ListItemDetailsPanel
            isOpen={!!itemForDetails}
            onClose={() => setItemForDetails(null)}
            item={itemForDetails}
            listName={currentList?.name}
            parentTitle={
              itemForDetails?.parentId
                ? currentListItems.find((p) => p.id === itemForDetails.parentId)?.title
                : null
            }
            subtaskStats={
              itemForDetails ? subtaskStatsMap.get(itemForDetails.id) : undefined
            }
            onEdit={(it) => setItemToEdit(it)}
            onAdjustParent={(it) => setItemForAdjustParent(it)}
            onDelete={(it) => setItemToDelete(it)}
          />

          {/* List Details Right Sidebar Panel */}
          <ListDetailsPanel
            isOpen={!!listForDetails}
            onClose={() => setListForDetails(null)}
            list={listForDetails}
            stats={listForDetails ? listStatsMap.get(listForDetails.id) : undefined}
            onOpenList={(l) => {
              setSelectedListId(l.id);
              setListForDetails(null);
            }}
            onEdit={(l) => setListToEdit(l)}
            onAdjustParent={(l) => setListToAdjustParent(l)}
            onDelete={(l) => setListToDelete(l)}
          />

          {/* Adjust Parent List Dialog (Single or Batch Lists) */}
          <AdjustParentListDialog
            open={!!listToAdjustParent || !!batchListsToAdjust}
            onOpenChange={(open) => {
              if (!open) {
                setListToAdjustParent(null);
                setBatchListsToAdjust(null);
              }
            }}
            selectedLists={
              batchListsToAdjust && batchListsToAdjust.length > 0
                ? batchListsToAdjust
                : listToAdjustParent
                ? [listToAdjustParent]
                : []
            }
            allLists={lists}
            onConfirmMove={async (targetListId) => {
              if (batchListsToAdjust && batchListsToAdjust.length > 0) {
                await moveListsIntoList(
                  userCode,
                  batchListsToAdjust.map((l) => l.id),
                  targetListId
                );
              } else if (listToAdjustParent) {
                await moveListIntoList(userCode, listToAdjustParent.id, targetListId);
              }
              setListToAdjustParent(null);
              setBatchListsToAdjust(null);
            }}
          />

          {/* Add Subtasks To Leaf Item Dialog (promotes leaf item to parent item with icon + subtasks) */}
          <AddSubtasksToLeafDialog
            open={!!leafItemForAddSubtasks}
            onOpenChange={(open) => !open && setLeafItemForAddSubtasks(null)}
            leafItem={leafItemForAddSubtasks}
            onConfirm={async (updatedTitle, updatedIconName, subtasks) => {
              if (leafItemForAddSubtasks) {
                await convertLeafToParentWithSubtasks(
                  userCode,
                  leafItemForAddSubtasks.id,
                  updatedTitle,
                  updatedIconName,
                  subtasks
                );
                setLeafItemForAddSubtasks(null);
              }
            }}
          />

          {/* Adjust Item Parent Dialog (Single or Batch Items, In-list or Cross-list) */}
          <AdjustItemParentDialog
            open={!!itemForAdjustParent || !!batchItemsToAdjust}
            onOpenChange={(open) => {
              if (!open) {
                setItemForAdjustParent(null);
                setBatchItemsToAdjust(null);
              }
            }}
            item={itemForAdjustParent}
            itemsToMove={batchItemsToAdjust || undefined}
            allLists={lists}
            allItems={items}
            currentListId={selectedListId || ""}
            onConfirmMove={async (targetListId, newParentId, moveSubtasks) => {
              const targetItems =
                batchItemsToAdjust && batchItemsToAdjust.length > 0
                  ? batchItemsToAdjust
                  : itemForAdjustParent
                  ? [itemForAdjustParent]
                  : [];
              if (targetItems.length > 0) {
                await moveItemsToParent(
                  userCode,
                  targetItems.map((i) => i.id),
                  targetListId,
                  newParentId,
                  moveSubtasks
                );
              }
              setItemForAdjustParent(null);
              setBatchItemsToAdjust(null);
              if (isSelectionMode) clearSelection();
            }}
            onConvertToStandalone={async (itemId) => {
              await convertItemToStandaloneList(userCode, itemId);
              setItemForAdjustParent(null);
            }}
          />

          {/* Delete Item Dialog */}
          <DeleteItemDialog
            open={!!itemToDelete}
            onOpenChange={(open) => !open && setItemToDelete(null)}
            item={itemToDelete}
            hasChildren={itemToDelete ? (subtaskStatsMap.get(itemToDelete.id)?.total ?? 0) > 0 : false}
            onConfirm={async (cascade) => {
              if (itemToDelete) {
                await deleteItem(userCode, itemToDelete.id, cascade);
              }
            }}
          />

          {/* PIN Lock / Unlock Dialog */}
          <PinDialog
            open={pinDialogOpen}
            onOpenChange={(open) => {
              setPinDialogOpen(open);
              if (!open) setPinTargetList(null);
            }}
            mode={pinDialogMode}
            listName={pinTargetList?.name || "List"}
            onConfirm={async (pin) => {
              if (!pinTargetList) return false;
              if (pinDialogMode === "SET_PIN") {
                await setListPin(userCode, pinTargetList.id, pin);
                return true;
              } else if (pinDialogMode === "UNLOCK_TEMPORARY") {
                const actualPin = lockedListPins[pinTargetList.id];
                if (actualPin && actualPin === pin) {
                  unlockListTemporarily(pinTargetList.id);
                  if (pendingBreadcrumbsRef.current !== null) {
                    setItemBreadcrumbs(pendingBreadcrumbsRef.current);
                    pendingBreadcrumbsRef.current = null;
                  }
                  setSelectedListId(pinTargetList.id);
                  return true;
                }
                return false;
              } else if (pinDialogMode === "REMOVE_PIN") {
                const actualPin = lockedListPins[pinTargetList.id];
                if (actualPin && actualPin === pin) {
                  await removeListPin(userCode, pinTargetList.id);
                  return true;
                }
                return false;
              }
              return false;
            }}
          />
        </div>
      )}
    </AppShell>
  );
}
