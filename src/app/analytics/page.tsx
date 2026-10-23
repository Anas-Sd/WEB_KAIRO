"use client";

import React, { useState } from "react";
import { TrendingUp, BarChart3, PieChart, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AppHeader } from "@/components/AppHeader";

export default function AnalyticsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <AppShell>
      {({ onOpenSettings }) => (
        <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto px-4 sm:px-6">
          <AppHeader
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search analytics..."
            onOpenSettings={onOpenSettings}
          />

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
