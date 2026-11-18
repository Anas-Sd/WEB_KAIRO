"use client";

import React, { useState, useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Plus, Layers, Laptop, Check } from "lucide-react";
import { ListItem } from "@/types";
import { renderListIcon, ListIconPicker } from "./ListIconPicker";

interface AddSubtasksToLeafDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leafItem: ListItem | null;
  onConfirm: (
    updatedTitle: string,
    updatedIconName: string,
    subtasks: string[]
  ) => Promise<void>;
}


export function AddSubtasksToLeafDialog({
  open,
  onOpenChange,
  leafItem,
  onConfirm,
}: AddSubtasksToLeafDialogProps) {
  const [title, setTitle] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("laptop");
  const [subtaskInput, setSubtaskInput] = useState("");
  const [subtaskList, setSubtaskList] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const prevOpenRef = useRef(false);
  const prevItemIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const isOpening = open && !prevOpenRef.current;
    const isItemSwitched = open && (leafItem?.id ?? null) !== prevItemIdRef.current;

    if (isOpening || isItemSwitched) {
      if (leafItem) {
        setTitle(leafItem.title);
        // Default to item's icon if already customized, or "laptop" / "list"
        setSelectedIcon(
          leafItem.iconName && leafItem.iconName !== "list"
            ? leafItem.iconName
            : "💻"
        );
        setSubtaskInput("");
        setSubtaskList([]);
      }
    }

    prevOpenRef.current = open;
    prevItemIdRef.current = leafItem?.id ?? null;
  }, [open, leafItem?.id]);

  if (!leafItem) return null;

  const commitSubtask = () => {
    const trimmed = subtaskInput.trim();
    if (!trimmed) return;
    const lines = trimmed
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length > 0) {
      setSubtaskList((prev) => [...prev, ...lines]);
      setSubtaskInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitSubtask();
    }
  };

  const removeSubtask = (index: number) => {
    setSubtaskList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const finalTitle = title.trim();
    if (!finalTitle) return;

    // Also commit any pending input
    const pending = subtaskInput.trim();
    const finalSubtasks = [...subtaskList];
    if (pending) {
      const lines = pending
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      finalSubtasks.push(...lines);
    }

    if (finalSubtasks.length === 0) return;

    setIsSaving(true);
    try {
      await onConfirm(finalTitle, selectedIcon, finalSubtasks);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#0C0C0F] border border-[#1C1C20] rounded-2xl p-6 shadow-2xl focus:outline-none">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#1C1C20]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#5A45FF]/15 border border-[#5A45FF]/30 flex items-center justify-center text-[#C5C0FF] text-xl">
                {renderListIcon(selectedIcon, "w-5 h-5")}
              </div>
              <div>
                <Dialog.Title className="text-base font-bold text-white leading-tight">
                  Add Subtasks
                </Dialog.Title>
                <p className="text-[11px] text-[#918EA2] mt-0.5">
                  Promote &quot;{leafItem.title}&quot; to parent with icon &amp; subtasks
                </p>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="p-1.5 rounded-lg text-[#918EA2] hover:text-white hover:bg-[#161619] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-4 mt-4">
            {/* Item Title Input */}
            <div>
              <label className="text-xs font-semibold text-[#918EA2] block mb-1.5 uppercase tracking-wider">
                Item Title <span className="text-[#FFB4AB]">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. LAPTOP"
                className="w-full bg-[#161619] border border-[#474556]/40 focus:border-[#C5C0FF] rounded-xl px-3.5 py-2.5 text-sm text-[#E3E1EC] focus:outline-none transition-colors"
                autoFocus
              />
            </div>

            {/* Choose Icon */}
            <div>
              <label className="text-xs font-semibold text-[#918EA2] block mb-2 uppercase tracking-wider">
                Choose Parent Icon
              </label>
              <div className="p-3 bg-[#161619] rounded-xl border border-[#1C1C20]">
                <ListIconPicker
                  selectedIcon={selectedIcon}
                  onSelectIcon={setSelectedIcon}
                />
              </div>
            </div>

            {/* Subtasks Addition */}
            <div>
              <label className="text-xs font-semibold text-[#918EA2] block mb-1.5 uppercase tracking-wider">
                Add Subtasks <span className="text-[#FFB4AB]">*</span>
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={subtaskInput}
                  onChange={(e) => setSubtaskInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a subtask and press Enter..."
                  className="flex-1 bg-[#161619] border border-[#474556]/40 focus:border-[#C5C0FF] rounded-xl px-3.5 py-2 text-xs text-[#E3E1EC] focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={commitSubtask}
                  disabled={!subtaskInput.trim()}
                  className="px-3 py-2 rounded-xl bg-[#5A45FF] hover:bg-[#5A45FF]/90 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </div>

              {/* Subtask Pills / List */}
              {subtaskList.length > 0 ? (
                <div className="space-y-1.5 max-h-40 overflow-y-auto p-2 rounded-xl bg-[#111114] border border-[#1C1C20]">
                  {subtaskList.map((sub, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#161619] border border-[#1C1C20] text-xs text-[#E3E1EC]"
                    >
                      <span className="truncate pr-2">• {sub}</span>
                      <button
                        type="button"
                        onClick={() => removeSubtask(idx)}
                        className="text-[#918EA2] hover:text-[#FFB4AB] transition-colors p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-[#918EA2] italic">
                  No subtasks added yet. Add at least one subtask to promote to parent.
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1C1C20]">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#918EA2] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  isSaving ||
                  !title.trim() ||
                  (subtaskList.length === 0 && !subtaskInput.trim())
                }
                onClick={handleSave}
                className="px-5 py-2 rounded-xl bg-[#5A45FF] hover:bg-[#5A45FF]/90 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-md shadow-[#5A45FF]/25"
              >
                {isSaving ? "Saving..." : `Save (${subtaskList.length + (subtaskInput.trim() ? 1 : 0)} Subtasks)`}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
