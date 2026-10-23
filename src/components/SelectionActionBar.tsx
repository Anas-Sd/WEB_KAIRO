"use client";

import React from "react";
import { CheckCircle2, FolderTree, Trash2, X } from "lucide-react";

interface SelectionActionBarProps {
  selectedCount: number;
  onClear: () => void;
  onComplete?: () => void;
  onAdjustParent?: () => void;
  onDelete: () => void;
  onExport?: () => void;
}

export function SelectionActionBar({
  selectedCount,
  onClear,
  onComplete,
  onAdjustParent,
  onDelete,
  onExport,
}: SelectionActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center justify-between gap-4 px-4 py-3 bg-[#1C1C20] border border-[#474556]/60 rounded-2xl shadow-2xl min-w-[320px] max-w-md animate-in slide-in-from-bottom-5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClear}
          className="p-1 rounded-lg text-[#918EA2] hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
        <span className="text-xs font-bold text-white">
          {selectedCount} selected
        </span>
      </div>

      <div className="flex items-center gap-2">
        {onComplete && (
          <button
            type="button"
            onClick={onComplete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5A45FF] hover:bg-[#5A45FF]/90 text-white text-xs font-semibold transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Complete</span>
          </button>
        )}

        {onAdjustParent && (
          <button
            type="button"
            onClick={onAdjustParent}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#161619] hover:bg-[#252529] border border-[#474556]/40 text-[#E3E1EC] text-xs font-medium transition-colors"
          >
            <FolderTree className="w-3.5 h-3.5 text-[#C5C0FF]" />
            <span>Adjust</span>
          </button>
        )}

        <button
          type="button"
          onClick={onDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#93000A]/30 hover:bg-[#93000A]/50 border border-[#93000A]/50 text-[#FFB4AB] text-xs font-semibold transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete</span>
        </button>
      </div>
    </div>
  );
}
