"use client";

import React, { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Layers, Edit2, Info, FolderTree, Trash2, Check, Calendar } from "lucide-react";
import { ListItem } from "@/types";
import { getItemDescendantIds } from "@/store/useListStore";
import { format, parseISO } from "date-fns";

// ==========================================
// ADD MULTIPLE ITEMS DIALOG
// ==========================================

interface AddMultipleItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId?: string | null;
  parentTitle?: string | null;
  onAdd: (titles: string[], parentId: string | null) => Promise<void>;
}

export function AddMultipleItemsDialog({
  open,
  onOpenChange,
  parentId = null,
  parentTitle = null,
  onAdd,
}: AddMultipleItemsDialogProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setText("");
  }, [open]);

  const handleSave = async () => {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    setLoading(true);
    try {
      await onAdd(lines, parentId);
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
          <div className="flex items-center justify-between pb-3 border-b border-[#1C1C20]">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#C5C0FF]" />
              <Dialog.Title className="text-base font-bold text-white">
                {parentTitle ? `Add Subtasks to: ${parentTitle}` : "Add Multiple Items"}
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="p-1 rounded-lg text-[#918EA2] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <p className="text-xs text-[#918EA2] mt-3 mb-2">
            Enter items below, one item per line:
          </p>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Milk&#10;Eggs&#10;Bread&#10;Apples"
            rows={6}
            className="w-full bg-[#161619] border border-[#474556]/40 focus:border-[#C5C0FF] rounded-xl p-3 text-sm text-[#E3E1EC] focus:outline-none resize-none font-sans"
            autoFocus
          />

          <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-[#1C1C20]">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-3.5 py-1.5 text-xs text-[#918EA2] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading || !text.trim()}
              onClick={handleSave}
              className="px-4 py-1.5 rounded-xl bg-[#5A45FF] hover:bg-[#5A45FF]/90 text-white text-xs font-semibold disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Items"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ==========================================
// EDIT ITEM DIALOG
// ==========================================

interface EditItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ListItem | null;
  onSave: (patch: Partial<ListItem>) => Promise<void>;
}

export function EditItemDialog({ open, onOpenChange, item, onSave }: EditItemDialogProps) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && item) {
      setTitle(item.title);
      setNotes(item.notes || "");
      setTargetDate(item.targetDate || "");
    }
  }, [open, item]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        notes: notes.trim() || null,
        targetDate: targetDate || null,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-[#0C0C0F] border border-[#1C1C20] rounded-2xl p-6 shadow-2xl focus:outline-none">
          <div className="flex items-center justify-between pb-3 border-b border-[#1C1C20]">
            <Dialog.Title className="text-base font-bold text-white">Edit List Item</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="p-1 rounded-lg text-[#918EA2] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-4 my-4">
            <div>
              <label className="text-xs font-semibold text-[#918EA2] block mb-1.5 uppercase tracking-wider">
                Item Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#161619] border border-[#474556]/40 focus:border-[#C5C0FF] rounded-xl px-3.5 py-2 text-sm text-[#E3E1EC] focus:outline-none"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#918EA2] block mb-1.5 uppercase tracking-wider">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Details, quantities, links..."
                className="w-full bg-[#161619] border border-[#474556]/40 focus:border-[#C5C0FF] rounded-xl px-3.5 py-2 text-sm text-[#E3E1EC] focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#918EA2] block mb-1.5 uppercase tracking-wider">
                Target Date
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full bg-[#161619] border border-[#474556]/40 focus:border-[#C5C0FF] rounded-xl px-3 py-2 text-sm text-[#E3E1EC] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1C1C20]">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-3.5 py-1.5 text-xs text-[#918EA2] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving || !title.trim()}
              onClick={handleSave}
              className="px-4 py-1.5 rounded-xl bg-[#5A45FF] hover:bg-[#5A45FF]/90 text-white text-xs font-semibold disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ==========================================
// ITEM DETAILS PANEL / DIALOG
// ==========================================

interface ItemDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ListItem | null;
}

export function ItemDetailsDialog({ open, onOpenChange, item }: ItemDetailsDialogProps) {
  if (!item) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-[#0C0C0F] border border-[#1C1C20] rounded-2xl p-6 shadow-2xl focus:outline-none">
          <div className="flex items-center justify-between pb-3 border-b border-[#1C1C20]">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-[#C5C0FF]" />
              <Dialog.Title className="text-base font-bold text-white">Item Details</Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="p-1 rounded-lg text-[#918EA2] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-4 my-4 text-xs">
            <div>
              <span className="text-[#918EA2] block mb-1">Title</span>
              <p className="text-sm font-semibold text-white">{item.title}</p>
            </div>

            {item.notes && (
              <div>
                <span className="text-[#918EA2] block mb-1">Notes</span>
                <p className="p-2.5 rounded-xl bg-[#161619] border border-[#1C1C20] text-[#E3E1EC] whitespace-pre-wrap">
                  {item.notes}
                </p>
              </div>
            )}

            {item.targetDate && (
              <div className="flex items-center justify-between">
                <span className="text-[#918EA2]">Target Date</span>
                <span className="text-white font-medium">{item.targetDate}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-[#918EA2]">Status</span>
              <span className={item.isCompleted ? "text-[#68DBA9] font-bold" : "text-[#C5C0FF]"}>
                {item.isCompleted ? "Completed" : "Active"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#918EA2]">Created</span>
              <span className="text-[#E3E1EC]">
                {format(new Date(item.createdAt), "MMM d, yyyy • h:mm a")}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-[#1C1C20] flex justify-end">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-1.5 rounded-xl bg-[#161619] hover:bg-[#1C1C20] text-xs font-medium text-white"
            >
              Close
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ==========================================
// ADJUST ITEM PARENT DIALOG
// ==========================================

interface AdjustItemParentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ListItem | null;
  allItemsInList: ListItem[];
  onConfirm: (newParentId: string | null, moveChildren: boolean) => Promise<void>;
}

export function AdjustItemParentDialog({
  open,
  onOpenChange,
  item,
  allItemsInList,
  onConfirm,
}: AdjustItemParentDialogProps) {
  const [selectedParentId, setSelectedParentId] = useState<string | null>(item?.parentId || null);
  const [moveChildren, setMoveChildren] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  if (!item) return null;

  const forbiddenIds = new Set<string>([
    item.id,
    ...Array.from(getItemDescendantIds(item.id, allItemsInList)),
  ]);
  const availableParents = allItemsInList.filter((i) => !forbiddenIds.has(i.id));

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await onConfirm(selectedParentId, moveChildren);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-[#0C0C0F] border border-[#1C1C20] rounded-2xl p-6 shadow-2xl focus:outline-none">
          <div className="flex items-center justify-between pb-3 border-b border-[#1C1C20]">
            <div className="flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-[#C5C0FF]" />
              <Dialog.Title className="text-base font-bold text-white">
                Adjust Item Parent
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="p-1 rounded-lg text-[#918EA2] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <p className="text-xs text-[#918EA2] mt-3">
            Select parent item for <strong className="text-white">"{item.title}"</strong>:
          </p>

          <div className="space-y-1.5 my-3 max-h-[260px] overflow-y-auto pr-1">
            <div
              onClick={() => setSelectedParentId(null)}
              className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-colors ${
                selectedParentId === null
                  ? "bg-[#C5C0FF]/15 border-[#C5C0FF] text-white font-medium"
                  : "bg-[#161619] border-[#1C1C20] text-[#C8C4D9] hover:border-[#474556]"
              }`}
            >
              <span className="text-xs font-semibold">📁 (None - Root Level)</span>
              {selectedParentId === null && <Check className="w-4 h-4 text-[#C5C0FF]" />}
            </div>

            {availableParents.map((p) => {
              const isSel = selectedParentId === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedParentId(p.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    isSel
                      ? "bg-[#C5C0FF]/15 border-[#C5C0FF] text-white font-medium"
                      : "bg-[#161619] border-[#1C1C20] text-[#C8C4D9] hover:border-[#474556]"
                  }`}
                >
                  <span className="text-xs truncate">{p.title}</span>
                  {isSel && <Check className="w-4 h-4 text-[#C5C0FF] shrink-0 ml-2" />}
                </div>
              );
            })}
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-[#1C1C20]">
            <input
              type="checkbox"
              checked={moveChildren}
              onChange={(e) => setMoveChildren(e.target.checked)}
              className="w-4 h-4 rounded text-[#5A45FF] bg-[#161619] border-[#474556] focus:ring-0"
            />
            <span className="text-xs text-[#E3E1EC]">Move child items too</span>
          </label>

          <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-[#1C1C20]">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-3.5 py-1.5 text-xs text-[#918EA2] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSave}
              className="px-4 py-1.5 rounded-xl bg-[#5A45FF] hover:bg-[#5A45FF]/90 text-white text-xs font-semibold disabled:opacity-50"
            >
              {submitting ? "Updating..." : "Save Parent"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ==========================================
// DELETE ITEM DIALOG
// ==========================================

interface DeleteItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ListItem | null;
  hasChildren: boolean;
  onConfirm: (cascade: boolean) => Promise<void>;
}

export function DeleteItemDialog({
  open,
  onOpenChange,
  item,
  hasChildren,
  onConfirm,
}: DeleteItemDialogProps) {
  const [deleting, setDeleting] = useState(false);

  if (!item) return null;

  const handleDelete = async (cascade: boolean) => {
    setDeleting(true);
    try {
      await onConfirm(cascade);
      onOpenChange(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-[#0C0C0F] border border-[#1C1C20] rounded-2xl p-6 shadow-2xl focus:outline-none">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-[#93000A]/20 border border-[#93000A]/40 text-[#FFB4AB]">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <Dialog.Title className="text-base font-bold text-white">
                Delete Item
              </Dialog.Title>
              <span className="text-xs text-[#918EA2] line-clamp-1">{item.title}</span>
            </div>
          </div>

          <p className="text-xs text-[#C8C4D9] mb-4">
            {hasChildren
              ? "This item contains sub-items. How would you like to proceed?"
              : "Permanently delete this list item?"}
          </p>

          <div className="space-y-2">
            {hasChildren ? (
              <>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => handleDelete(false)}
                  className="w-full py-2.5 px-3 text-xs font-semibold rounded-xl bg-[#161619] hover:bg-[#1C1C20] border border-[#1C1C20] text-white text-left flex items-center justify-between"
                >
                  <span>Delete only this item</span>
                  <span className="text-[10px] text-[#918EA2]">(keep sub-items)</span>
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => handleDelete(true)}
                  className="w-full py-2.5 px-3 text-xs font-semibold rounded-xl bg-[#93000A]/20 hover:bg-[#93000A]/35 border border-[#93000A]/40 text-[#FFB4AB] text-left flex items-center justify-between"
                >
                  <span>Delete with all sub-items</span>
                  <span className="text-[10px] text-[#FFB4AB]/80">(cascade delete)</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={deleting}
                onClick={() => handleDelete(false)}
                className="w-full py-2.5 text-xs font-semibold rounded-xl bg-[#EF4444] hover:bg-[#EF4444]/90 text-white"
              >
                {deleting ? "Deleting..." : "Delete Item"}
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-full py-2 text-xs text-[#918EA2] hover:text-white"
            >
              Cancel
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
