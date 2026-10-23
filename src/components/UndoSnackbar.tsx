"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Undo2 } from "lucide-react";
import { useTaskStore } from "@/store/useTaskStore";

export function UndoSnackbar() {
  const { undoAction, executeUndo, setUndoAction } = useTaskStore();

  useEffect(() => {
    if (!undoAction) return;
    const timer = setTimeout(() => {
      setUndoAction(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [undoAction, setUndoAction]);

  return (
    <AnimatePresence>
      {undoAction && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-4 px-4 py-2.5 bg-[#1C1C20] border border-[#474556]/60 rounded-2xl shadow-2xl min-w-[280px] max-w-sm"
        >
          <span className="text-sm text-[#E3E1EC] font-medium">{undoAction.message}</span>
          <button
            type="button"
            onClick={executeUndo}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#5A45FF] hover:bg-[#5A45FF]/90 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
