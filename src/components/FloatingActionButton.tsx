"use client";

import React from "react";
import { Plus } from "lucide-react";

interface FABProps {
  onClick: () => void;
  label?: string;
  hidden?: boolean;
}

export function FloatingActionButton({ onClick, label = "Add", hidden = false }: FABProps) {
  if (hidden) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="fixed bottom-24 lg:bottom-8 right-6 z-30 w-14 h-14 rounded-full bg-gradient-to-tr from-[#5A45FF] to-[#C5C0FF] hover:scale-105 active:scale-95 shadow-xl shadow-[#5A45FF]/30 flex items-center justify-center text-black font-bold transition-all duration-200"
    >
      <Plus className="w-7 h-7 stroke-[2.5]" />
    </button>
  );
}
