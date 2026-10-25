"use client";

import React, { useState, useMemo } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Search, Check, FolderTree } from "lucide-react";
import { TaskList } from "@/types";
import { renderListIcon } from "./ListIconPicker";

interface AdjustParentListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLists: TaskList[];
  allLists: TaskList[];
  onConfirmMove: (targetListId: string) => Promise<void>;
}

export function AdjustParentListDialog({
  open,
  onOpenChange,
  selectedLists,
  allLists,
  onConfirmMove,
}: AdjustParentListDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedIds = useMemo(
    () => new Set(selectedLists.map((l) => l.id)),
    [selectedLists]
  );

  const eligibleLists = useMemo(() => {
    return allLists.filter((l) => {
      if (selectedIds.has(l.id)) return false;
      if (!searchQuery.trim()) return true;
      return l.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
    });
  }, [allLists, selectedIds, searchQuery]);

  const isSingle = selectedLists.length === 1;
  const singleList = selectedLists[0];

  const handleConfirm = async () => {
    if (!selectedTargetId) return;
    setLoading(true);
    try {
      await onConfirmMove(selectedTargetId);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-[#0C0C0F] border border-[#1C1C20] rounded-2xl p-6 shadow-2xl focus:outline-none">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#1C1C20]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#C5C0FF]/15 border border-[#C5C0FF]/30 flex items-center justify-center text-[#C5C0FF]">
                <FolderTree className="w-4 h-4" />
              </div>
              <div>
                <Dialog.Title className="text-base font-bold text-white leading-tight">
                  Adjust Parent
                </Dialog.Title>
                <p className="text-[11px] text-[#918EA2] mt-0.5 truncate max-w-[260px]">
                  {isSingle
                    ? `Move "${singleList?.name}" under another list`
                    : `Move ${selectedLists.length} lists under another list`}
                </p>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="p-1 rounded-lg text-[#918EA2] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Search box */}
          <div className="relative mt-4 mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#918EA2] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search target list..."
              className="w-full bg-[#161619] border border-[#474556]/40 focus:border-[#C5C0FF] rounded-xl pl-9 pr-3 py-2 text-xs text-[#E3E1EC] placeholder-[#918EA2] focus:outline-none transition-colors"
              autoFocus
            />
          </div>

          <p className="text-[11px] text-[#918EA2] mb-2 font-medium">
            Select target list:
          </p>

          {/* List of eligible target lists */}
          <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
            {eligibleLists.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-[#161619] border border-[#1C1C20] text-xs text-[#918EA2]">
                {searchQuery.trim()
                  ? "No matching target lists found"
                  : "No other lists available"}
              </div>
            ) : (
              eligibleLists.map((target) => {
                const isSelected = selectedTargetId === target.id;
                return (
                  <div
                    key={target.id}
                    onClick={() => setSelectedTargetId(target.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-[#C5C0FF]/15 border-[#C5C0FF] text-white"
                        : "bg-[#161619] border-[#1C1C20] text-[#C8C4D9] hover:border-[#474556] hover:bg-[#1A1A1E]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-[#252529] border border-[#474556]/30 flex items-center justify-center text-[#C5C0FF] shrink-0">
                        {renderListIcon(target.iconName, "w-3.5 h-3.5")}
                      </div>
                      <span className="text-xs font-semibold truncate">
                        {target.name}
                      </span>
                    </div>

                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-2 ${
                        isSelected
                          ? "border-[#C5C0FF] bg-[#C5C0FF] text-black"
                          : "border-[#918EA2]/40 bg-transparent"
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-[#1C1C20]">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-3.5 py-1.5 rounded-xl text-xs text-[#918EA2] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading || !selectedTargetId}
              onClick={handleConfirm}
              className="px-4 py-1.5 rounded-xl bg-[#5A45FF] hover:bg-[#5A45FF]/90 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
            >
              {loading
                ? "Moving..."
                : isSingle
                ? "Move List"
                : `Move ${selectedLists.length} Lists`}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
