"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useListStore } from "@/store/useListStore";
import { useHabitStore } from "@/store/useHabitStore";
import { Sidebar, BottomNav } from "@/components/Navigation";
import { SettingsDialog } from "@/components/SettingsDialog";
import { UndoSnackbar } from "@/components/UndoSnackbar";

interface AppShellProps {
  children: (props: { onOpenSettings: () => void }) => React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const { user, isInitialized, initSession } = useAuthStore();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { fetchTasks, subscribeRealtime: subTasks } = useTaskStore();
  const { fetchLists, fetchItems, subscribeRealtime: subLists } = useListStore();
  const { fetchHabits, fetchLogs, subscribeRealtime: subHabits, autoMarkMissedPastDays } =
    useHabitStore();

  useEffect(() => {
    initSession();
  }, [initSession]);

  useEffect(() => {
    if (isInitialized && !user?.code) {
      router.replace("/login");
    }
  }, [isInitialized, user, router]);

  // Initial data fetch and realtime sync setup
  useEffect(() => {
    if (!user?.code) return;

    fetchTasks(user.code);
    fetchLists(user.code);
    fetchItems(user.code);
    fetchHabits(user.code);
    fetchLogs(user.code).then(() => {
      autoMarkMissedPastDays(user.code);
    });

    const unsubTasks = subTasks(user.code);
    const unsubLists = subLists(user.code);
    const unsubHabits = subHabits(user.code);

    // Continuous real-time synchronization with mobile & other tabs
    const syncAll = () => {
      if (user?.code) {
        fetchTasks(user.code);
        fetchLists(user.code);
        fetchItems(user.code);
        fetchHabits(user.code);
        fetchLogs(user.code);
      }
    };

    const handleFocus = () => syncAll();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncAll();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Fast 2.5-second background polling while document is active
    const syncInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        syncAll();
      }
    }, 2500);

    return () => {
      unsubTasks();
      unsubLists();
      unsubHabits();
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(syncInterval);
    };
  }, [
    user?.code,
    fetchTasks,
    fetchLists,
    fetchItems,
    fetchHabits,
    fetchLogs,
    autoMarkMissedPastDays,
    subTasks,
    subLists,
    subHabits,
  ]);

  if (!isInitialized || !user?.code) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#09090B]">
        <div className="w-8 h-8 rounded-full border-2 border-[#5A45FF] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B] flex flex-col lg:flex-row text-[#E3E1EC]">
      {/* Desktop Sidebar */}
      <Sidebar onOpenSettings={() => setSettingsOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-8">
        {children({ onOpenSettings: () => setSettingsOpen(true) })}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Shared Modals & Snackbars */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <UndoSnackbar />
    </div>
  );
}
