"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  FolderTree,
  Check,
  Search,
  Home,
  List as ListIcon,
  Layers,
} from "lucide-react";
import { ListItem, TaskList } from "@/types";
import { getItemDescendantIds } from "@/store/useListStore";
import { renderListIcon } from "./ListIconPicker";

interface AdjustItemParentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ListItem | null;
  itemsToMove?: ListItem[]; // For batch or single
  allLists: TaskList[];
  allItems: ListItem[];
  currentListId: string;
  onConfirmMove: (
    targetListId: string,
    newParentId: string | null,
    moveSubtasks: boolean
  ) => Promise<void>;
  onConvertToStandalone?: (itemId: string) => Promise<void>;
}

type SelectionTarget =
  | { type: "item"; listId: string; parentId: string }
  | { type: "top_level"; listId: string }
  | { type: "standalone" };

export function AdjustItemParentDialog({
  open,
  onOpenChange,
  item,
  itemsToMove,
  allLists,
  allItems,
  currentListId,
  onConfirmMove,
  onConvertToStandalone,
}: AdjustItemParentDialogProps) {
  const activeItems = useMemo(() => {
    if (itemsToMove && itemsToMove.length > 0) return itemsToMove;
    if (item) return [item];
    return [];
  }, [item, itemsToMove]);

  const isSingle = activeItems.length === 1;
  const singleItem = activeItems[0] || null;

  const [searchQuery, setSearchQuery] = useState("");
  const [moveSubtasks, setMoveSubtasks] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Initial target selection
  const [selection, setSelection] = useState<SelectionTarget>(() => {
    if (singleItem?.parentId) {
      return {
        type: "item",
        listId: singleItem.listId,
        parentId: singleItem.parentId,
      };
    }
    return {
      type: "top_level",
      listId: currentListId,
    };
  });

  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setSearchQuery("");
      setMoveSubtasks(true);
      if (singleItem?.parentId) {
        setSelection({
          type: "item",
          listId: singleItem.listId,
          parentId: singleItem.parentId,
        });
      } else {
        setSelection({
          type: "top_level",
          listId: currentListId || (allLists[0]?.id ?? ""),
        });
      }
    }
    prevOpenRef.current = open;
  }, [open, currentListId, singleItem, allLists]);

  // Compute forbidden IDs: active selected items + all their recursive descendants
  const forbiddenIds = useMemo(() => {
    const set = new Set<string>();
    for (const itm of activeItems) {
      set.add(itm.id);
      for (const d of getItemDescendantIds(itm.id, allItems)) {
        set.add(d);
      }
    }
    return set;
  }, [activeItems, allItems]);

  // Items mapped by ID for quick parent title lookup
  const itemMap = useMemo(() => {
    const map = new Map<string, ListItem>();
    for (const i of allItems) {
      map.set(i.id, i);
    }
    return map;
  }, [allItems]);

  // List mapped by ID
  const listMap = useMemo(() => {
    const map = new Map<string, TaskList>();
    for (const l of allLists) {
      map.set(l.id, l);
    }
    return map;
  }, [allLists]);

  // Subtask counts per item
  const subtaskCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of allItems) {
      if (i.parentId) {
        map.set(i.parentId, (map.get(i.parentId) || 0) + 1);
      }
    }
    return map;
  }, [allItems]);

  // Check if any of the active items has subtasks
  const hasDirectSubtasks = useMemo(() => {
    return activeItems.some(
      (itm) => (subtaskCountMap.get(itm.id) || 0) > 0
    );
  }, [activeItems, subtaskCountMap]);

  // Eligible tasks: all tasks except the forbidden ones
  const eligibleTasks = useMemo(() => {
    const list = allItems.filter((i) => !forbiddenIds.has(i.id));

    // Sort: current list items first, then by list, then by position
    return list.sort((a, b) => {
      const aIsCurrent = a.listId === currentListId ? 0 : 1;
      const bIsCurrent = b.listId === currentListId ? 0 : 1;
      if (aIsCurrent !== bIsCurrent) return aIsCurrent - bIsCurrent;
      if (a.listId !== b.listId) return a.listId.localeCompare(b.listId);
      return (a.position ?? 0) - (b.position ?? 0);
    });
  }, [allItems, forbiddenIds, currentListId]);

  // Filtered tasks by search query
  const filteredTasks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return eligibleTasks;

    return eligibleTasks.filter((t) => {
      if (t.title.toLowerCase().includes(q)) return true;
      const listName = listMap.get(t.listId)?.name?.toLowerCase() || "";
      if (listName.includes(q)) return true;
      if (t.parentId) {
        const pTitle = itemMap.get(t.parentId)?.title?.toLowerCase() || "";
        if (pTitle.includes(q)) return true;
      }
      return false;
    });
  }, [eligibleTasks, searchQuery, listMap, itemMap]);

  // Filtered top-level options by search query
  const filteredTopLevelLists = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allLists;
    return allLists.filter((l) => l.name.toLowerCase().includes(q) || "top-level".includes(q));
  }, [allLists, searchQuery]);

  // Standalone option matches search
  const showStandalone = useMemo(() => {
    if (!isSingle || !onConvertToStandalone) return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return "make standalone list".includes(q) || "new main list".includes(q);
  }, [isSingle, onConvertToStandalone, searchQuery]);

  if (activeItems.length === 0) return null;

  const handleSave = async () => {
    setSubmitting(true);
    try {
      if (selection.type === "standalone") {
        if (singleItem && onConvertToStandalone) {
          await onConvertToStandalone(singleItem.id);
        }
      } else if (selection.type === "top_level") {
        await onConfirmMove(selection.listId, null, moveSubtasks);
      } else if (selection.type === "item") {
        await onConfirmMove(selection.listId, selection.parentId, moveSubtasks);
      }
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-[#0C0C0F] border border-[#1C1C20] rounded-2xl p-6 shadow-2xl focus:outline-none max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#1C1C20] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#5A45FF]/15 border border-[#5A45FF]/30 flex items-center justify-center text-[#C5C0FF]">
                <FolderTree className="w-5 h-5" />
              </div>
              <div>
                <Dialog.Title className="text-base font-bold text-white leading-tight">
                  Adjust Parent
                </Dialog.Title>
                <p className="text-[11px] text-[#918EA2] mt-0.5 truncate max-w-[300px]">
                  {isSingle
                    ? `Move "${singleItem?.title}"`
                    : `Move ${activeItems.length} selected items`}
                </p>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="p-1.5 rounded-lg text-[#918EA2] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Search Bar */}
          <div className="relative mt-4 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#918EA2] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks, parent tasks, or lists..."
              className="w-full bg-[#161619] border border-[#474556]/40 focus:border-[#C5C0FF] rounded-xl pl-10 pr-9 py-2.5 text-xs text-[#E3E1EC] placeholder-[#918EA2] focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#918EA2] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* All Tasks, Parent Tasks & Options List */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-2 my-3">
            {/* 1. Make Standalone List Option */}
            {showStandalone && (
              <div
                onClick={() => setSelection({ type: "standalone" })}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  selection.type === "standalone"
                    ? "bg-[#68DBA9]/20 border-[#68DBA9] text-white"
                    : "bg-[#161619] border-[#1C1C20] text-[#C8C4D9] hover:border-[#474556] hover:bg-[#1C1C20]"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      selection.type === "standalone"
                        ? "border-[#68DBA9] bg-[#68DBA9]"
                        : "border-[#474556] bg-transparent"
                    }`}
                  >
                    {selection.type === "standalone" && (
                      <Check className="w-3 h-3 text-black stroke-[3]" />
                    )}
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-[#252529] border border-[#35343E] flex items-center justify-center text-[#68DBA9] shrink-0 text-xs">
                    <ListIcon className="w-4 h-4 text-[#68DBA9]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold text-[#E3E1EC] block">
                      Make Standalone List
                    </span>
                    <span className="text-[10px] text-[#918EA2]">
                      Promotes this item into its own main standalone list
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Top-Level Options per List */}
            {filteredTopLevelLists.map((list) => {
              const isSelected =
                selection.type === "top_level" && selection.listId === list.id;
              return (
                <div
                  key={`top_${list.id}`}
                  onClick={() =>
                    setSelection({ type: "top_level", listId: list.id })
                  }
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-[#5A45FF]/20 border-[#5A45FF] text-white"
                      : "bg-[#161619] border-[#1C1C20] text-[#C8C4D9] hover:border-[#474556] hover:bg-[#1C1C20]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? "border-[#5A45FF] bg-[#5A45FF]"
                          : "border-[#474556] bg-transparent"
                      }`}
                    >
                      {isSelected && (
                        <Check className="w-3 h-3 text-white stroke-[3]" />
                      )}
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-[#252529] border border-[#35343E] flex items-center justify-center text-[#C5C0FF] shrink-0 text-xs">
                      <Home className="w-4 h-4 text-[#C5C0FF]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-semibold text-[#E3E1EC] block">
                        Top-Level in &quot;{list.name}&quot;
                      </span>
                      <span className="text-[10px] text-[#918EA2]">
                        Stands as a root item (no parent) in {list.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111114] border border-[#252529] text-[10px] font-medium text-[#C5C0FF] shrink-0">
                      <span>
                        {renderListIcon(list.iconName || "list", "w-3 h-3")}
                      </span>
                      <span className="truncate max-w-[110px] uppercase font-bold">
                        {list.name}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Separator / Subheader */}
            {filteredTasks.length > 0 && (
              <div className="pt-2 pb-1">
                <span className="text-[10px] font-bold text-[#918EA2] uppercase tracking-wider block">
                  Tasks &amp; Parent Tasks ({filteredTasks.length})
                </span>
              </div>
            )}

            {/* 3. All Tasks and Parent Tasks */}
            {filteredTasks.map((t) => {
              const isSelected =
                selection.type === "item" && selection.parentId === t.id;
              const subCount = subtaskCountMap.get(t.id) || 0;
              const isParent = subCount > 0;
              const targetList = listMap.get(t.listId);
              const parentTitle = t.parentId
                ? itemMap.get(t.parentId)?.title
                : null;

              return (
                <div
                  key={t.id}
                  onClick={() =>
                    setSelection({
                      type: "item",
                      listId: t.listId,
                      parentId: t.id,
                    })
                  }
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-[#5A45FF]/20 border-[#5A45FF] text-white"
                      : "bg-[#161619] border-[#1C1C20] text-[#C8C4D9] hover:border-[#474556] hover:bg-[#1C1C20]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Radio indicator */}
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? "border-[#5A45FF] bg-[#5A45FF]"
                          : "border-[#474556] bg-transparent"
                      }`}
                    >
                      {isSelected && (
                        <Check className="w-3 h-3 text-white stroke-[3]" />
                      )}
                    </div>

                    {/* Task icon */}
                    <div className="w-8 h-8 rounded-lg bg-[#252529] border border-[#35343E] flex items-center justify-center text-[#C5C0FF] shrink-0 text-xs">
                      {renderListIcon(t.iconName || "list", "w-4 h-4")}
                    </div>

                    {/* Task Title & Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#E3E1EC] truncate">
                          {t.title}
                        </span>
                        {isParent && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#5A45FF]/20 text-[#C5C0FF] shrink-0 flex items-center gap-1">
                            <Layers className="w-2.5 h-2.5" />
                            <span>
                              {subCount} subtask{subCount !== 1 ? "s" : ""}
                            </span>
                          </span>
                        )}
                      </div>

                      {/* Parent hierarchy note if nested */}
                      {parentTitle && (
                        <div className="text-[10px] text-[#918EA2] mt-0.5 truncate">
                          ↳ under: {parentTitle}
                        </div>
                      )}
                    </div>

                    {/* List badge on the right */}
                    {targetList && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111114] border border-[#252529] text-[10px] font-medium text-[#C5C0FF] shrink-0">
                        <span>
                          {renderListIcon(
                            targetList.iconName || "list",
                            "w-3 h-3"
                          )}
                        </span>
                        <span className="truncate max-w-[100px] uppercase font-bold">
                          {targetList.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Empty Search State */}
            {filteredTasks.length === 0 &&
              filteredTopLevelLists.length === 0 &&
              !showStandalone && (
                <div className="text-center py-10 text-xs text-[#918EA2]">
                  No tasks or parent tasks found matching &quot;{searchQuery}&quot;
                </div>
              )}
          </div>

          {/* Move Subtasks Checkbox */}
          {hasDirectSubtasks && (
            <label className="flex items-center gap-2 cursor-pointer pt-3 border-t border-[#1C1C20] shrink-0">
              <input
                type="checkbox"
                checked={moveSubtasks}
                onChange={(e) => setMoveSubtasks(e.target.checked)}
                className="w-4 h-4 rounded text-[#5A45FF] bg-[#161619] border-[#474556] focus:ring-0"
              />
              <span className="text-xs text-[#E3E1EC]">
                Move all subtasks attached to{" "}
                {isSingle ? "this item" : "selected items"}
              </span>
            </label>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1C1C20] shrink-0">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-3.5 py-1.5 text-xs text-[#918EA2] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSave}
              className="px-4 py-1.5 rounded-xl bg-[#5A45FF] hover:bg-[#5A45FF]/90 text-white text-xs font-semibold disabled:opacity-50 transition-all shadow-md shadow-[#5A45FF]/20"
            >
              {submitting ? "Moving..." : "Apply Move"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
