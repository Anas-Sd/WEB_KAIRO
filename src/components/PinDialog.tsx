"use client";

import React, { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Lock, Unlock, KeyRound, X, AlertCircle } from "lucide-react";

export type PinDialogMode = "SET_PIN" | "UNLOCK_TEMPORARY" | "REMOVE_PIN";

interface PinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: PinDialogMode;
  listName: string;
  onConfirm: (pin: string) => boolean | Promise<boolean>;
  onSuccess?: () => void;
}

export function PinDialog({
  open,
  onOpenChange,
  mode,
  listName,
  onConfirm,
  onSuccess,
}: PinDialogProps) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setPin("");
      setConfirmPin("");
      setError(null);
      setLoading(false);
    }
  }, [open, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (pin.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }

    if (mode === "SET_PIN") {
      if (pin !== confirmPin) {
        setError("PINs do not match. Please re-enter.");
        return;
      }
    }

    setLoading(true);
    try {
      const isValid = await onConfirm(pin);
      if (isValid) {
        onOpenChange(false);
        onSuccess?.();
      } else {
        setError(mode === "SET_PIN" ? "Failed to set PIN" : "Incorrect PIN. Please try again.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error verifying PIN");
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case "SET_PIN":
        return `Lock "${listName}"`;
      case "UNLOCK_TEMPORARY":
        return `Unlock "${listName}"`;
      case "REMOVE_PIN":
        return `Remove Lock from "${listName}"`;
    }
  };

  const getDescription = () => {
    switch (mode) {
      case "SET_PIN":
        return "Set a secure 4-digit PIN to lock this list. Subtasks will be protected from viewing or editing.";
      case "UNLOCK_TEMPORARY":
        return "Enter your PIN to view and manage this list for this session.";
      case "REMOVE_PIN":
        return "Enter your PIN to permanently unlock this list and remove lock protection.";
    }
  };

  const getActionButtonText = () => {
    if (loading) return "Verifying...";
    switch (mode) {
      case "SET_PIN":
        return "Lock List";
      case "UNLOCK_TEMPORARY":
        return "Unlock";
      case "REMOVE_PIN":
        return "Remove Lock";
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-[#0C0C0F] border border-[#1C1C20] rounded-2xl p-6 shadow-2xl focus:outline-none">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#1C1C20]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#5A45FF]/15 border border-[#5A45FF]/30 flex items-center justify-center text-[#C5C0FF]">
                {mode === "SET_PIN" ? (
                  <Lock className="w-4 h-4" />
                ) : mode === "REMOVE_PIN" ? (
                  <Unlock className="w-4 h-4 text-[#FFB4AB]" />
                ) : (
                  <KeyRound className="w-4 h-4 text-[#68DBA9]" />
                )}
              </div>
              <div>
                <Dialog.Title className="text-base font-bold text-white leading-tight">
                  {getTitle()}
                </Dialog.Title>
                <p className="text-[11px] text-[#918EA2] mt-0.5 max-w-[220px] truncate">
                  {listName}
                </p>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="p-1 rounded-lg text-[#918EA2] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          <p className="text-xs text-[#918EA2] mt-3 mb-4 leading-relaxed">
            {getDescription()}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#918EA2] block mb-1.5 uppercase tracking-wider">
                {mode === "SET_PIN" ? "Enter 4-Digit PIN" : "Enter PIN"}
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="••••"
                autoFocus
                className="w-full bg-[#161619] border border-[#1C1C20] focus:border-[#5A45FF] rounded-xl px-4 py-2.5 text-center text-xl tracking-[0.5em] text-white placeholder:text-[#474556] outline-none transition-colors font-mono"
              />
            </div>

            {mode === "SET_PIN" && (
              <div>
                <label className="text-xs font-semibold text-[#918EA2] block mb-1.5 uppercase tracking-wider">
                  Confirm PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••"
                  className="w-full bg-[#161619] border border-[#1C1C20] focus:border-[#5A45FF] rounded-xl px-4 py-2.5 text-center text-xl tracking-[0.5em] text-white placeholder:text-[#474556] outline-none transition-colors font-mono"
                />
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#FFB4AB]/10 border border-[#FFB4AB]/30 text-[#FFB4AB] text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#918EA2] hover:text-white hover:bg-[#161619] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || pin.length < 4 || (mode === "SET_PIN" && confirmPin.length < 4)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#5A45FF] hover:bg-[#4833E6] disabled:opacity-50 text-white transition-all shadow-lg shadow-[#5A45FF]/20"
              >
                {getActionButtonText()}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
