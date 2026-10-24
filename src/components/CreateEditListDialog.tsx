"use client";

import React, { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Plus, Layers } from "lucide-react";
import { TaskList } from "@/types";
import { ListIconPicker, renderListIcon } from "./ListIconPicker";

interface CreateEditListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listToEdit?: TaskList | null;
  onSave: (name: string, iconName: string, initialItems: string[]) => Promise<void>;
}

export function CreateEditListDialog({
  open,
  onOpenChange,
  listToEdit,
  onSave,
}: CreateEditListDialogProps) {
  const isEditing = !!listToEdit;
  const [name, setName] = useState("");
  const [iconName, setIconName] = useState("list");
  const [itemInput, setItemInput] = useState("");
  const [initialItems, setInitialItems] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (listToEdit) {
        setName(listToEdit.name);
        setIconName(listToEdit.iconName);
        setItemInput("");
        setInitialItems([]);
      } else {
        setName("");
        setIconName("list");
        setItemInput("");
        setInitialItems([]);
      }
    }
  }, [open, listToEdit]);

  const commitItem = () => {
    const trimmed = itemInput.trim();
    if (!trimmed) return;
    const lines = trimmed
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length > 0) {
      setInitialItems((prev) => [...prev, ...lines]);
      setItemInput("");
    }
  };

  const removeItem = (index: number) => {
    setInitialItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    // Also commit any pending text in itemInput if user didn't hit enter
    let itemsToPass = [...initialItems];
    const pendingInput = itemInput.trim();
    if (pendingInput) {
      const extraLines = pendingInput
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      itemsToPass = [...itemsToPass, ...extraLines];
    }

    setIsSaving(true);
    try {
      await onSave(trimmed, iconName, itemsToPass);
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
          <div className="flex items-center justify-between pb-4 border-b border-[#1C1C20]">
            <Dialog.Title className="text-base font-bold text-white flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#5A45FF]/15 border border-[#5A45FF]/30 flex items-center justify-center text-[#C5C0FF]">
                {renderListIcon(iconName, "w-4 h-4")}
              </div>
              <span>{isEditing ? "Edit List" : "New List"}</span>
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="p-1.5 rounded-lg text-[#918EA2] hover:text-white hover:bg-[#161619]"
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-4 mt-4">
            {/* Name Input with preview badge */}
            <div>
              <label className="text-xs font-semibold text-[#918EA2] block mb-1.5 uppercase tracking-wider">
                List Name (Required)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Groceries, Sprint Tasks, Packing..."
                className="w-full bg-[#161619] border border-[#474556]/40 focus:border-[#C5C0FF] rounded-xl px-3.5 py-2.5 text-sm text-[#E3E1EC] placeholder-[#918EA2] focus:outline-none"
                autoFocus
              />
            </div>

            {/* Icon Picker Grid */}
            <div className="pt-2 border-t border-[#1C1C20]">
              <label className="text-xs font-semibold text-[#918EA2] block mb-2 uppercase tracking-wider">
                Select Icon / Emoji
              </label>
              <ListIconPicker selectedIcon={iconName} onSelectIcon={setIconName} />
            </div>

            {/* Add Tasks / Items Section (when creating a new list) */}
            {!isEditing && (
              <div className="pt-3 border-t border-[#1C1C20]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#918EA2] uppercase tracking-wider">
                    <Layers className="w-3.5 h-3.5 text-[#C5C0FF]" />
                    <span>Add Tasks / Items (Optional)</span>
                  </div>
                  {initialItems.length > 0 && (
                    <span className="text-[11px] font-semibold text-[#C5C0FF] bg-[#5A45FF]/15 border border-[#5A45FF]/30 px-2 py-0.5 rounded-full">
                      {initialItems.length} added
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={itemInput}
                    onChange={(e) => setItemInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitItem();
                      }
                    }}
                    placeholder="Type item & press Enter (or paste multi-line)"
                    className="flex-1 bg-[#161619] border border-[#474556]/40 focus:border-[#C5C0FF] rounded-xl px-3.5 py-2 text-xs text-[#E3E1EC] placeholder-[#918EA2] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={commitItem}
                    disabled={!itemInput.trim()}
                    className="p-2 rounded-xl bg-[#1C1C20] border border-[#474556]/40 hover:bg-[#5A45FF] hover:border-[#5A45FF] text-[#E3E1EC] hover:text-white disabled:opacity-40 transition-colors shrink-0"
                    title="Add item"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Added items as pills/capsules */}
                {initialItems.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 max-h-36 overflow-y-auto p-2 bg-[#111114] border border-[#1C1C20] rounded-xl">
                    {initialItems.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-[#1C1C20] border border-[#474556]/40 text-[#E3E1EC] animate-in fade-in"
                      >
                        <span className="max-w-[200px] truncate">{item}</span>
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-[#918EA2] hover:text-[#EF4444] rounded-full p-0.5 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#1C1C20]">
            <Dialog.Close asChild>
              <button
                type="button"
                className="px-4 py-2 text-sm text-[#918EA2] hover:text-white"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              disabled={isSaving || !name.trim()}
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-[#5A45FF] hover:bg-[#5A45FF]/90 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
            >
              {isSaving ? "Saving..." : isEditing ? "Save Changes" : "Create List"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
