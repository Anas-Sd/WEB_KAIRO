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

  const [selectedListId, setSelectedListId] = useState<string>(currentListId);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(
    singleItem?.parentId || null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [moveSubtasks, setMoveSubtasks] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setSelectedListId(currentListId);
      setSelectedParentId(singleItem?.parentId || null);
      setSearchQuery("");
      setMoveSubtasks(true);
    }
    prevOpenRef.current = open;
  }, [open, currentListId, singleItem]);

  // Compute forbidden IDs (the items themselves + all their descendants)
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

  // Available parent items in the selected target list
  const availableParents = useMemo(() => {
    const listItems = allItems.filter(
      (i) => i.listId === selectedListId && !forbiddenIds.has(i.id)
    );
    if (!searchQuery.trim()) return listItems;
    const q = searchQuery.toLowerCase().trim();
    return listItems.filter((i) => i.title.toLowerCase().includes(q));
  }, [allItems, selectedListId, forbiddenIds, searchQuery]);

  const selectedTargetList = useMemo(
    () => allLists.find((l) => l.id === selectedListId) || null,
    [allLists, selectedListId]
  );

  if (activeItems.length === 0) return null;

  const handleSave = async () => {
    setSubmitting(true);
    try {
      if (selectedParentId === "__STANDALONE__") {
        if (singleItem && onConvertToStandalone) {
          await onConvertToStandalone(singleItem.id);
        }
      } else {
        await onConfirmMove(selectedListId, selectedParentId, moveSubtasks);
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
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-[#0C0C0F] border border-[#1C1C20] rounded-2xl p-6 shadow-2xl focus:outline-none max-h-[90vh] flex flex-col">
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
                <p className="text-[11px] text-[#918EA2] mt-0.5 truncate max-w-[260px]">
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

          <div className="flex-1 overflow-y-auto pr-1 space-y-4 my-4">
            {/* Target List Selection */}
            <div>
              <label className="text-[11px] font-semibold text-[#918EA2] block mb-1.5 uppercase tracking-wider">
                1. Select Target List
              </label>
              <div className="grid grid-cols-2 gap-2">
                {allLists.map((l) => {
                  const isSel = selectedListId === l.id;
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => {
                        setSelectedListId(l.id);
                        if (selectedParentId !== "__STANDALONE__") {
                          setSelectedParentId(null);
                        }
                      }}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                        isSel
                          ? "bg-[#5A45FF]/20 border-[#5A45FF] text-white"
                          : "bg-[#161619] border-[#1C1C20] text-[#918EA2] hover:text-[#E3E1EC] hover:border-[#474556]"
                      }`}
                    >
                      <div className="w-6 h-6 rounded-lg bg-[#1C1C20] flex items-center justify-center text-[#C5C0FF] shrink-0 text-xs">
                        {renderListIcon(l.iconName || "list", "w-3.5 h-3.5")}
                      </div>
                      <span className="text-xs font-semibold truncate flex-1">
                        {l.name}
                      </span>
                      {isSel && (
                        <Check className="w-3.5 h-3.5 text-[#C5C0FF] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Parent Selection Inside Target List */}
            <div>
              <label className="text-[11px] font-semibold text-[#918EA2] block mb-1.5 uppercase tracking-wider">
                2. Select Parent in &quot;{selectedTargetList?.name || "List"}&quot;
              </label>

              {/* Search filter for items */}
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#918EA2] pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter items..."
                  className="w-full bg-[#161619] border border-[#474556]/40 focus:border-[#C5C0FF] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#E3E1EC] placeholder-[#918EA2] focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {/* Option 1: Top-Level in target list */}
                <div
                  onClick={() => setSelectedParentId(null)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    selectedParentId === null
                      ? "bg-[#5A45FF]/15 border-[#5A45FF] text-white font-medium"
                      : "bg-[#161619] border-[#1C1C20] text-[#C8C4D9] hover:border-[#474556]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-[#C5C0FF]" />
                    <div>
                      <span className="text-xs font-semibold block">
                        Top-Level in &quot;{selectedTargetList?.name}&quot;
                      </span>
                      <span className="text-[10px] text-[#918EA2]">
                        Stands as a root item directly under this list
                      </span>
                    </div>
                  </div>
                  {selectedParentId === null && (
                    <Check className="w-4 h-4 text-[#C5C0FF]" />
                  )}
                </div>

                {/* Option 2: Convert to Standalone List (if single item) */}
                {isSingle && onConvertToStandalone && (
                  <div
                    onClick={() => setSelectedParentId("__STANDALONE__")}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      selectedParentId === "__STANDALONE__"
                        ? "bg-[#5A45FF]/15 border-[#5A45FF] text-white font-medium"
                        : "bg-[#161619] border-[#1C1C20] text-[#C8C4D9] hover:border-[#474556]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <ListIcon className="w-4 h-4 text-[#68DBA9]" />
                      <div>
                        <span className="text-xs font-semibold block">
                          Make Standalone List
                        </span>
                        <span className="text-[10px] text-[#918EA2]">
                          Promotes this item into its own main list
                        </span>
                      </div>
                    </div>
                    {selectedParentId === "__STANDALONE__" && (
                      <Check className="w-4 h-4 text-[#68DBA9]" />
                    )}
                  </div>
                )}

                {/* Option 3: Candidate parent items */}
                {availableParents.map((p) => {
                  const isSel = selectedParentId === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedParentId(p.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-colors ${
                        isSel
                          ? "bg-[#5A45FF]/15 border-[#5A45FF] text-white font-medium"
                          : "bg-[#161619] border-[#1C1C20] text-[#C8C4D9] hover:border-[#474556]"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <div className="w-5 h-5 rounded-md bg-[#1C1C20] flex items-center justify-center text-[#C5C0FF] shrink-0 text-xs">
                          {renderListIcon(p.iconName || "list", "w-3 h-3")}
                        </div>
                        <span className="text-xs truncate">{p.title}</span>
                      </div>
                      {isSel && (
                        <Check className="w-4 h-4 text-[#C5C0FF] shrink-0 ml-2" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Checkbox: Move children too */}
            <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-[#1C1C20]">
              <input
                type="checkbox"
                checked={moveSubtasks}
                onChange={(e) => setMoveSubtasks(e.target.checked)}
                className="w-4 h-4 rounded text-[#5A45FF] bg-[#161619] border-[#474556] focus:ring-0"
              />
              <span className="text-xs text-[#E3E1EC]">
                Move all subtasks attached to {isSingle ? "this item" : "selected items"}
              </span>
            </label>
          </div>

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
