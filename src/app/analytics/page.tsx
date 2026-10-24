"use client";

import React, { useState } from "react";
import { TrendingUp, BarChart3, PieChart, Sparkles, Search, X, MoreVertical, RefreshCw } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { AppShell } from "@/components/AppShell";
import { AppHeader } from "@/components/AppHeader";

export default function AnalyticsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <AppShell>
      {({ onOpenSettings }) => (
        <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto px-4 sm:px-6">
          <AppHeader onOpenSettings={onOpenSettings} />

          {/* Persistent Search and Controls Row */}
          <div className="flex items-center gap-2 mt-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#918EA2] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search analytics & insights..."
                className="w-full bg-[#111114] border border-[#1C1C20] hover:border-[#474556]/50 focus:border-[#C5C0FF] rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-[#E3E1EC] placeholder-[#918EA2] transition-colors focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#918EA2] hover:text-white p-0.5 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* 3-dots Menu Button */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className="p-2 rounded-xl bg-[#111114] border border-[#1C1C20] text-[#918EA2] hover:text-white hover:border-[#474556] transition-colors shrink-0"
                  title="More options"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={6}
                  className="z-50 min-w-[170px] bg-[#1C1C20] border border-[#474556]/40 rounded-xl p-1 shadow-2xl animate-in fade-in-80"
                >
                  <DropdownMenu.Item
                    onClick={() => {}}
                    className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg cursor-pointer outline-none transition-colors text-[#E3E1EC] hover:bg-[#252529] hover:text-[#68DBA9]"
                  >
                    <RefreshCw className="w-4 h-4 text-[#68DBA9]" />
                    <span>Refresh Data</span>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center text-center py-20 px-4">
            <div className="w-16 h-16 rounded-3xl bg-[#161619] border border-[#1C1C20] flex items-center justify-center text-[#C5C0FF] mb-5 shadow-xl shadow-[#5A45FF]/10">
              <TrendingUp className="w-8 h-8" />
            </div>

            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Analytics & Insights
            </h1>

            <p className="text-sm text-[#918EA2] max-w-md mt-2">
              Weekly productivity scores, completion rates, and focus trends.
            </p>

            {searchQuery && (
              <div className="mt-6 px-4 py-2 rounded-xl bg-[#161619] border border-[#1C1C20] text-xs text-[#C5C0FF]">
                Searching analytics for &apos;{searchQuery}&apos;...
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mt-10 max-w-xs w-full opacity-60">
              <div className="p-3.5 rounded-2xl bg-[#161619] border border-[#1C1C20] flex flex-col items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#68DBA9]" />
                <span className="text-xs text-[#918EA2]">Velocity Tracker</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#161619] border border-[#1C1C20] flex flex-col items-center gap-2">
                <PieChart className="w-5 h-5 text-[#FFB77D]" />
                <span className="text-xs text-[#918EA2]">Category Breakdown</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
