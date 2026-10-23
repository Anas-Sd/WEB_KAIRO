"use client";

import React, { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { TaskList } from "@/types";
import { ListIconPicker, renderListIcon } from "./ListIconPicker";

interface CreateEditListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listToEdit?: TaskList | null;
  onSave: (name: string, iconName: string) => Promise<void>;
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
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (listToEdit) {
        setName(listToEdit.name);
        setIconName(listToEdit.iconName);
      } else {
        setName("");
        setIconName("list");
      }
    }
  }, [open, listToEdit]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setIsSaving(true);
    try {
      await onSave(trimmed, iconName);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md max-h-[90vh] overflow-y-auto bg-[#0C0C0F] border border-[#1C1C20] rounded-2xl p-6 shadow-2xl focus:outline-none">
          <div className="flex items-center justify-between pb-4 border-b border-[#1C1C20]">
            <Dialog.Title className="text-base font-bold text-white">
              {isEditing ? "Edit List" : "Create New List"}
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
                List Name
              </label>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#161619] border border-[#474556]/40 flex items-center justify-center text-[#C5C0FF] shrink-0">
                  {renderListIcon(iconName, "w-5 h-5")}
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Shopping, Travel, Project..."
                  className="flex-1 bg-[#161619] border border-[#474556]/40 focus:border-[#C5C0FF] rounded-xl px-3.5 py-2.5 text-sm text-[#E3E1EC] placeholder-[#918EA2] focus:outline-none"
                  autoFocus
                />
              </div>
            </div>

            {/* Icon Picker Grid */}
            <div className="pt-2 border-t border-[#1C1C20]">
              <ListIconPicker selectedIcon={iconName} onSelectIcon={setIconName} />
            </div>
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
