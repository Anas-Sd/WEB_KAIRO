"use client";

import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Accordion from "@radix-ui/react-accordion";
import {
  X,
  User,
  RefreshCw,
  Trash2,
  LogOut,
  Eye,
  EyeOff,
  Copy,
  Check,
  ChevronDown,
  AlertTriangle,
  KeyRound,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useListStore } from "@/store/useListStore";
import { useHabitStore } from "@/store/useHabitStore";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const router = useRouter();
  const { user, logout, updateUserSession } = useAuthStore();
  const { tasks, fetchTasks } = useTaskStore();
  const { fetchLists, fetchItems } = useListStore();
  const { fetchHabits, fetchLogs } = useHabitStore();

  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  // Rotate Code state
  const [isRotating, setIsRotating] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [rotateError, setRotateError] = useState<string | null>(null);
  const [rotateLoading, setRotateLoading] = useState(false);

  // Sync state
  const [syncLoading, setSyncLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("Just now");

  // Confirmations
  const [confirmClearCompleted, setConfirmClearCompleted] = useState(false);
  const [confirmWipeAll, setConfirmWipeAll] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const handleCopyCode = () => {
    if (!user?.code) return;
    navigator.clipboard.writeText(user.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSyncNow = async () => {
    if (!user?.code) return;
    setSyncLoading(true);
    try {
      await Promise.all([
        fetchTasks(user.code),
        fetchLists(user.code),
        fetchItems(user.code),
        fetchHabits(user.code),
        fetchLogs(user.code),
      ]);
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    } finally {
      setSyncLoading(false);
    }
  };

  const handleRotateCode = async () => {
    const cleanNew = newCode.trim().toUpperCase();
    if (!user?.code) return;
    if (!cleanNew) {
      setRotateError("New code cannot be empty");
      return;
    }
    if (cleanNew === user.code) {
      setRotateError("New code must be different from current code");
      return;
    }

    setRotateLoading(true);
    setRotateError(null);

    try {
      // 1. Check if new code is already taken
      const { data: existing } = await supabase
        .from("access_codes")
        .select("code")
        .eq("code", cleanNew)
        .maybeSingle();

      if (existing) {
        setRotateError("This access code is already taken. Please choose another.");
        setRotateLoading(false);
        return;
      }

      // 2. Insert new access_codes row
      const { error: insErr } = await supabase.from("access_codes").insert({
        code: cleanNew,
        name: user.name,
      });

      if (insErr) {
        // Fallback: try update
        await supabase.from("access_codes").update({ code: cleanNew }).eq("code", user.code);
      }

      // 3. Migrate user_code in all tables
      await Promise.all([
        supabase.from("tasks").update({ user_code: cleanNew }).eq("user_code", user.code),
        supabase.from("task_lists").update({ user_code: cleanNew }).eq("user_code", user.code),
        supabase.from("list_items").update({ user_code: cleanNew }).eq("user_code", user.code),
        supabase.from("habits").update({ user_code: cleanNew }).eq("user_code", user.code),
        supabase.from("habit_logs").update({ user_code: cleanNew }).eq("user_code", user.code),
      ]);

      // 4. Delete old access_codes row
      await supabase.from("access_codes").delete().eq("code", user.code);

      // 5. Update local session
      updateUserSession({ code: cleanNew, name: user.name });
      setIsRotating(false);
      setNewCode("");
    } catch (err: unknown) {
      setRotateError(err instanceof Error ? err.message : "Failed to rotate code");
    } finally {
      setRotateLoading(false);
    }
  };

  const handleDeleteCompletedTasks = async () => {
    if (!user?.code) return;
    setActionLoading(true);
    try {
      const completedTasks = tasks.filter((t) => t.isCompleted);
      for (const t of completedTasks) {
        await supabase.from("tasks").delete().eq("id", t.id);
      }
      await fetchTasks(user.code);
      setConfirmClearCompleted(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAllData = async () => {
    if (!user?.code) return;
    setActionLoading(true);
    try {
      await Promise.all([
        supabase.from("tasks").delete().eq("user_code", user.code),
        supabase.from("list_items").delete().eq("user_code", user.code),
        supabase.from("task_lists").delete().eq("user_code", user.code),
        supabase.from("habit_logs").delete().eq("user_code", user.code),
        supabase.from("habits").delete().eq("user_code", user.code),
      ]);
      await handleSyncNow();
      setConfirmWipeAll(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    onOpenChange(false);
    router.replace("/login");
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#0C0C0F] border border-[#1C1C20] rounded-2xl p-6 shadow-2xl focus:outline-none">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#1C1C20]">
            <Dialog.Title className="text-lg font-bold text-white">Settings</Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="p-1.5 rounded-lg text-[#918EA2] hover:text-white hover:bg-[#161619]"
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Accordion Sections - all collapsed by default */}
          <Accordion.Root type="multiple" className="space-y-3 mt-4">
            {/* Section A: Account & Workspace */}
            <Accordion.Item
              value="account"
              className="border border-[#1C1C20] bg-[#111114] rounded-xl overflow-hidden"
            >
              <Accordion.Header>
                <Accordion.Trigger className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-semibold text-[#E3E1EC] hover:bg-[#161619] transition-colors group">
                  <div className="flex items-center gap-2.5">
                    <User className="w-4 h-4 text-[#C5C0FF]" />
                    <span>Account & Workspace</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-[#918EA2] transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="px-4 pb-4 pt-1 space-y-3 text-sm text-[#C8C4D9]">
                <div>
                  <label className="text-xs text-[#918EA2] block mb-1">User Name</label>
                  <div className="p-2.5 rounded-xl bg-[#161619] border border-[#1C1C20] text-white font-medium">
                    {user?.name || "KAIRO User"}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-[#918EA2] block mb-1">Access Code</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center justify-between p-2.5 rounded-xl bg-[#161619] border border-[#1C1C20] font-mono text-sm tracking-wider">
                      <span>{showCode ? user?.code : "••••••••"}</span>
                      <button
                        type="button"
                        onClick={() => setShowCode(!showCode)}
                        className="text-[#918EA2] hover:text-white"
                      >
                        {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="p-2.5 rounded-xl bg-[#161619] border border-[#1C1C20] text-[#918EA2] hover:text-white hover:border-[#C5C0FF]"
                      title="Copy code"
                    >
                      {copied ? <Check className="w-4 h-4 text-[#68DBA9]" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {!isRotating ? (
                  <button
                    type="button"
                    onClick={() => setIsRotating(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-[#474556]/60 text-xs font-medium text-[#C5C0FF] hover:bg-[#C5C0FF]/10 transition-colors"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Rotate Access Code</span>
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-[#161619] border border-[#474556]/40 space-y-2">
                    <span className="text-xs font-semibold text-white">Enter New Access Code</span>
                    <input
                      type="text"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                      placeholder="e.g. MYNEWCODE123"
                      className="w-full bg-[#111114] border border-[#474556] rounded-lg px-3 py-1.5 text-sm text-white font-mono uppercase focus:outline-none focus:border-[#C5C0FF]"
                    />
                    {rotateError && <p className="text-xs text-[#FFB4AB]">{rotateError}</p>}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsRotating(false);
                          setRotateError(null);
                          setNewCode("");
                        }}
                        className="px-3 py-1 text-xs text-[#918EA2] hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={rotateLoading || !newCode.trim()}
                        onClick={handleRotateCode}
                        className="px-3 py-1 text-xs font-medium bg-[#5A45FF] text-white rounded-lg hover:bg-[#5A45FF]/90 disabled:opacity-50"
                      >
                        {rotateLoading ? "Updating..." : "Save Code"}
                      </button>
                    </div>
                  </div>
                )}
              </Accordion.Content>
            </Accordion.Item>

            {/* Section B: Sync & Connectivity */}
            <Accordion.Item
              value="sync"
              className="border border-[#1C1C20] bg-[#111114] rounded-xl overflow-hidden"
            >
              <Accordion.Header>
                <Accordion.Trigger className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-semibold text-[#E3E1EC] hover:bg-[#161619] transition-colors group">
                  <div className="flex items-center gap-2.5">
                    <RefreshCw className="w-4 h-4 text-[#68DBA9]" />
                    <span>Sync & Connectivity</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-[#918EA2] transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="px-4 pb-4 pt-1 space-y-3 text-sm text-[#C8C4D9]">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#918EA2]">Backend Status</span>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#68DBA9]/10 border border-[#68DBA9]/30 text-[#68DBA9]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#68DBA9]" />
                    <span>Connected to Supabase</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#918EA2]">Last Full Sync</span>
                  <span className="text-xs text-[#E3E1EC]">{lastSyncTime}</span>
                </div>

                <button
                  type="button"
                  disabled={syncLoading}
                  onClick={handleSyncNow}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#161619] border border-[#1C1C20] text-xs font-medium text-white hover:border-[#68DBA9] transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncLoading ? "animate-spin" : ""}`} />
                  <span>{syncLoading ? "Syncing..." : "Sync Now"}</span>
                </button>
              </Accordion.Content>
            </Accordion.Item>

            {/* Section C: Data Management */}
            <Accordion.Item
              value="data"
              className="border border-[#1C1C20] bg-[#111114] rounded-xl overflow-hidden"
            >
              <Accordion.Header>
                <Accordion.Trigger className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-semibold text-[#E3E1EC] hover:bg-[#161619] transition-colors group">
                  <div className="flex items-center gap-2.5">
                    <Trash2 className="w-4 h-4 text-[#FFB77D]" />
                    <span>Data Management</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-[#918EA2] transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="px-4 pb-4 pt-1 space-y-3 text-sm text-[#C8C4D9]">
                {/* Delete completed tasks */}
                {!confirmClearCompleted ? (
                  <button
                    type="button"
                    onClick={() => setConfirmClearCompleted(true)}
                    className="w-full text-left py-2 px-3 rounded-xl bg-[#161619] hover:bg-[#1C1C20] text-xs text-[#E3E1EC] flex items-center justify-between transition-colors"
                  >
                    <span>Delete All Completed Tasks</span>
                    <Trash2 className="w-4 h-4 text-[#918EA2]" />
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-[#93000A]/20 border border-[#93000A]/50 space-y-2">
                    <span className="text-xs text-[#FFB4AB] block">
                      Delete all completed tasks permanently?
                    </span>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmClearCompleted(false)}
                        className="px-2.5 py-1 text-xs text-[#918EA2]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={handleDeleteCompletedTasks}
                        className="px-3 py-1 text-xs bg-[#EF4444] text-white rounded-lg font-medium"
                      >
                        Confirm Delete
                      </button>
                    </div>
                  </div>
                )}

                {/* Wipe all data */}
                {!confirmWipeAll ? (
                  <button
                    type="button"
                    onClick={() => setConfirmWipeAll(true)}
                    className="w-full text-left py-2 px-3 rounded-xl bg-[#93000A]/10 border border-[#93000A]/20 hover:bg-[#93000A]/25 text-xs text-[#FFB4AB] flex items-center justify-between transition-colors"
                  >
                    <span>Delete All Data (Wipe Everything)</span>
                    <AlertTriangle className="w-4 h-4 text-[#FFB4AB]" />
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-[#93000A]/30 border border-[#93000A] space-y-2">
                    <span className="text-xs text-white font-semibold block">
                      DANGER: Wipe all tasks, lists, and habits?
                    </span>
                    <p className="text-[11px] text-[#FFB4AB]">This action cannot be undone.</p>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setConfirmWipeAll(false)}
                        className="px-2.5 py-1 text-xs text-[#918EA2]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={handleDeleteAllData}
                        className="px-3 py-1 text-xs bg-[#EF4444] text-white rounded-lg font-bold"
                      >
                        Wipe Everything
                      </button>
                    </div>
                  </div>
                )}
              </Accordion.Content>
            </Accordion.Item>

            {/* Section D: Session */}
            <Accordion.Item
              value="session"
              className="border border-[#1C1C20] bg-[#111114] rounded-xl overflow-hidden"
            >
              <Accordion.Header>
                <Accordion.Trigger className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-semibold text-[#E3E1EC] hover:bg-[#161619] transition-colors group">
                  <div className="flex items-center gap-2.5">
                    <LogOut className="w-4 h-4 text-[#EF4444]" />
                    <span>Session</span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-[#918EA2] transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="px-4 pb-4 pt-1 space-y-3 text-sm text-[#C8C4D9]">
                {!confirmLogout ? (
                  <button
                    type="button"
                    onClick={() => setConfirmLogout(true)}
                    className="w-full py-2 px-3 rounded-xl bg-[#161619] hover:bg-[#93000A]/20 text-xs font-medium text-[#FFB4AB] flex items-center justify-center gap-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-[#161619] border border-[#1C1C20] space-y-2">
                    <span className="text-xs text-white block">Log out of your workspace?</span>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmLogout(false)}
                        className="px-2.5 py-1 text-xs text-[#918EA2]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="px-3 py-1 text-xs bg-[#5A45FF] text-white rounded-lg font-medium"
                      >
                        Log Out
                      </button>
                    </div>
                  </div>
                )}
              </Accordion.Content>
            </Accordion.Item>
          </Accordion.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
