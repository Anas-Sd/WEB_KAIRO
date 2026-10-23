"use client";

import React, { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, FileText } from "lucide-react";

interface HabitNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  initialNote?: string | null;
  onSave: (note: string | null) => Promise<void>;
}

export function HabitNoteDialog({
  open,
  onOpenChange,
  date,
  initialNote,
  onSave,
}: HabitNoteDialogProps) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNote(initialNote || "");
    }
  }, [open, initialNote]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(note.trim() || null);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-[#0C0C0F] border border-[#1C1C20] rounded-2xl p-6 shadow-2xl focus:outline-none">
          <div className="flex items-center justify-between pb-3 border-b border-[#1C1C20]">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#C5C0FF]" />
              <Dialog.Title className="text-base font-bold text-white">
                Add Note for {date}
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

          <div className="my-4">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reflect on today's habit, write thoughts or reason..."
              rows={4}
              className="w-full bg-[#161619] border border-[#474556]/40 focus:border-[#C5C0FF] rounded-xl p-3 text-sm text-[#E3E1EC] placeholder-[#918EA2] focus:outline-none resize-none"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1C1C20]">
            <button
              type="button"
              onClick={handleSkip}
              className="px-3.5 py-1.5 text-xs text-[#918EA2] hover:text-white"
            >
              Skip
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="px-4 py-1.5 rounded-xl bg-[#5A45FF] hover:bg-[#5A45FF]/90 text-white text-xs font-semibold disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Note"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
