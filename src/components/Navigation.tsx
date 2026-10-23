"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CheckCircle2, ListTodo, Flame, TrendingUp, Settings } from "lucide-react";
import { useTaskStore } from "@/store/useTaskStore";
import { useListStore } from "@/store/useListStore";
import { useHabitStore } from "@/store/useHabitStore";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { name: "Tasks", href: "/tasks", icon: CheckCircle2 },
  { name: "Lists", href: "/lists", icon: ListTodo },
  { name: "Habits", href: "/habits", icon: Flame },
  { name: "Analytics", href: "/analytics", icon: TrendingUp },
];

interface NavigationProps {
  onOpenSettings: () => void;
}

export function Sidebar({ onOpenSettings }: NavigationProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleTabClick = (href: string) => {
    if (pathname === href) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      useTaskStore.getState().setSearchQuery("");
      useTaskStore.getState().exitSelectionMode();
      useTaskStore.getState().setBreadcrumb(null);
      useListStore.getState().setSearchQuery("");
      useListStore.getState().exitSelectionMode();
      useHabitStore.getState().setSearchQuery("");
      useHabitStore.getState().exitSelectionMode();
    } else {
      router.push(href);
    }
  };

  return (
    <aside className="hidden lg:flex flex-col w-60 h-screen sticky top-0 bg-[#0C0C0F] border-r border-[#1C1C20] p-4 select-none">
      {/* KAIRO Logo */}
      <div className="flex items-center gap-3 px-3 py-4 mb-4">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#5A45FF] to-[#C5C0FF] flex items-center justify-center shadow-lg shadow-[#5A45FF]/20">
          <span className="font-black text-black text-sm tracking-tighter">K</span>
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-white text-lg tracking-wider">KAIRO</span>
          <span className="text-[10px] text-[#918EA2] uppercase tracking-widest font-semibold">
            Productivity
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <button
              key={item.name}
              type="button"
              onClick={() => handleTabClick(item.href)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-[#C5C0FF]/15 text-[#C5C0FF] shadow-sm shadow-[#C5C0FF]/5"
                  : "text-[#918EA2] hover:text-[#E3E1EC] hover:bg-[#161619]"
              }`}
            >
              <Icon
                className={`w-5 h-5 transition-transform duration-200 ${
                  isActive ? "text-[#C5C0FF] scale-105" : "text-[#918EA2]"
                }`}
              />
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* Settings at bottom */}
      <div className="pt-4 border-t border-[#1C1C20]">
        <button
          type="button"
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-[#918EA2] hover:text-[#E3E1EC] hover:bg-[#161619] transition-colors"
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleTabClick = (href: string) => {
    if (pathname === href) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      useTaskStore.getState().setSearchQuery("");
      useTaskStore.getState().exitSelectionMode();
      useTaskStore.getState().setBreadcrumb(null);
      useListStore.getState().setSearchQuery("");
      useListStore.getState().exitSelectionMode();
      useHabitStore.getState().setSearchQuery("");
      useHabitStore.getState().exitSelectionMode();
    } else {
      router.push(href);
    }
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-[68px] bg-[#0C0C0F]/95 backdrop-blur-lg border-t border-[#1C1C20] flex items-center justify-around px-2 pb-safe">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <button
            key={item.name}
            type="button"
            onClick={() => handleTabClick(item.href)}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-xl transition-all duration-200 ${
              isActive ? "text-[#C5C0FF]" : "text-[#918EA2] hover:text-[#E3E1EC]"
            }`}
          >
            <div
              className={`p-1 rounded-full transition-colors ${
                isActive ? "bg-[#C5C0FF]/15" : "bg-transparent"
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <span
              className={`text-[11px] font-medium tracking-tight mt-0.5 ${
                isActive ? "font-semibold text-[#C5C0FF]" : "text-[#918EA2]"
              }`}
            >
              {item.name}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
