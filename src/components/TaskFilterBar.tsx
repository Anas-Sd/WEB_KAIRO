"use client";

import React, { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  SlidersHorizontal,
  ArrowUpDown,
  Download,
  X,
  Bell,
  Check,
  ChevronDown,
} from "lucide-react";
import { Priority } from "@/types";
import { SortOption } from "@/store/useTaskStore";
import { formatRemainingTime } from "@/lib/dateUtils";

interface FilterCriteria {
  status?: ("ACTIVE" | "COMPLETED")[];
  priority?: Priority[];
  dueDatePreset?: "ALL" | "TODAY" | "TOMORROW" | "RANGE";
  startDate?: string;
  endDate?: string;
}

interface TaskFilterBarProps {
  filter: FilterCriteria;
  sort: SortOption;
  onFilterChange: (filter: FilterCriteria) => void;
  onSortChange: (sort: SortOption) => void;
  onResetFilters: () => void;
  onOpenExport: () => void;
  nextAlarm?: {
    taskTitle: string;
    triggerMillis: number;
  } | null;
}

export function TaskFilterBar({
  filter,
  sort,
  onFilterChange,
  onSortChange,
  onResetFilters,
  onOpenExport,
  nextAlarm,
}: TaskFilterBarProps) {
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  const hasActiveFilters =
    (filter.status && filter.status.length > 0) ||
    (filter.priority && filter.priority.length > 0) ||
    (filter.dueDatePreset && filter.dueDatePreset !== "ALL") ||
    !!filter.startDate ||
    !!filter.endDate;

  const toggleStatus = (s: "ACTIVE" | "COMPLETED") => {
    const curr = new Set(filter.status || []);
    if (curr.has(s)) curr.delete(s);
    else curr.add(s);
    onFilterChange({ ...filter, status: Array.from(curr) });
  };

  const togglePriority = (p: Priority) => {
    const curr = new Set(filter.priority || []);
    if (curr.has(p)) curr.delete(p);
    else curr.add(p);
    onFilterChange({ ...filter, priority: Array.from(curr) });
  };

  const setDueDatePreset = (preset: "ALL" | "TODAY" | "TOMORROW" | "RANGE") => {
    onFilterChange({ ...filter, dueDatePreset: preset });
  };

  const sortLabels: Record<SortOption, string> = {
    DUE_DATE_ASC: "Due Date: Earliest First",
    DUE_DATE_DESC: "Due Date: Latest First",
    PRIORITY_DESC: "Priority: Highest First",
    PRIORITY_ASC: "Priority: Lowest First",
    ALPHA_ASC: "Alphabetical: A-Z",
    ALPHA_DESC: "Alphabetical: Z-A",
  };

  const nextAlarmCountdown = nextAlarm
    ? formatRemainingTime(nextAlarm.triggerMillis)
    : null;

  return (
    <div className="space-y-2 mb-4">
      {/* Controls row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Filter Dropdown */}
          <DropdownMenu.Root open={filterMenuOpen} onOpenChange={setFilterMenuOpen}>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                  hasActiveFilters
                    ? "bg-[#C5C0FF]/15 border-[#C5C0FF] text-[#C5C0FF]"
                    : "bg-[#161619] border-[#1C1C20] text-[#918EA2] hover:text-white hover:border-[#474556]"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filter</span>
                {hasActiveFilters && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C5C0FF]" />
                )}
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="start"
                sideOffset={6}
                className="z-50 w-72 bg-[#1C1C20] border border-[#474556]/40 rounded-2xl p-4 shadow-2xl space-y-3.5 animate-in fade-in-80"
              >
                {/* Status Chips */}
                <div>
                  <span className="text-[11px] font-semibold text-[#918EA2] uppercase tracking-wider block mb-1.5">
                    Status
                  </span>
                  <div className="flex items-center gap-2">
                    {(["ACTIVE", "COMPLETED"] as const).map((st) => {
                      const isSel = filter.status?.includes(st);
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => toggleStatus(st)}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                            isSel
                              ? "bg-[#5A45FF] border-[#5A45FF] text-white"
                              : "bg-[#111114] border-[#1C1C20] text-[#918EA2] hover:text-white"
                          }`}
                        >
                          {st === "ACTIVE" ? "Active" : "Completed"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Priority Chips */}
                <div>
                  <span className="text-[11px] font-semibold text-[#918EA2] uppercase tracking-wider block mb-1.5">
                    Priority
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(["LOW", "MEDIUM", "HIGH", "URGENT"] as const).map((pr) => {
                      const isSel = filter.priority?.includes(pr);
                      return (
                        <button
                          key={pr}
                          type="button"
                          onClick={() => togglePriority(pr)}
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
                            isSel
                              ? "bg-[#C5C0FF]/25 border-[#C5C0FF] text-[#C5C0FF]"
                              : "bg-[#111114] border-[#1C1C20] text-[#918EA2] hover:text-white"
                          }`}
                        >
                          {pr}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Due Date Presets */}
                <div>
                  <span className="text-[11px] font-semibold text-[#918EA2] uppercase tracking-wider block mb-1.5">
                    Due Date
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(["ALL", "TODAY", "TOMORROW", "RANGE"] as const).map((p) => {
                      const isSel = filter.dueDatePreset === p || (!filter.dueDatePreset && p === "ALL");
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setDueDatePreset(p)}
                          className={`py-1 px-2 rounded-lg text-xs font-medium border text-center transition-colors ${
                            isSel
                              ? "bg-[#5A45FF] border-[#5A45FF] text-white"
                              : "bg-[#111114] border-[#1C1C20] text-[#918EA2] hover:text-white"
                          }`}
                        >
                          {p === "ALL" ? "Any Date" : p === "TODAY" ? "Today" : p === "TOMORROW" ? "Tomorrow" : "Custom Range"}
                        </button>
                      );
                    })}
                  </div>

                  {filter.dueDatePreset === "RANGE" && (
                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[#252529]">
                      <input
                        type="date"
                        value={filter.startDate || ""}
                        onChange={(e) => onFilterChange({ ...filter, startDate: e.target.value })}
                        className="bg-[#111114] border border-[#252529] rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none"
                      />
                      <input
                        type="date"
                        value={filter.endDate || ""}
                        onChange={(e) => onFilterChange({ ...filter, endDate: e.target.value })}
                        className="bg-[#111114] border border-[#252529] rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Reset button inside menu */}
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={onResetFilters}
                    className="w-full py-1.5 text-xs text-[#FFB4AB] hover:bg-[#93000A]/20 rounded-xl transition-colors font-medium"
                  >
                    Reset all filters
                  </button>
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          {/* Sort Dropdown */}
          <DropdownMenu.Root open={sortMenuOpen} onOpenChange={setSortMenuOpen}>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#161619] border border-[#1C1C20] text-[#918EA2] hover:text-white hover:border-[#474556] transition-colors"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>Sort</span>
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="start"
                sideOffset={6}
                className="z-50 w-56 bg-[#1C1C20] border border-[#474556]/40 rounded-xl p-1 shadow-2xl animate-in fade-in-80"
              >
                <div className="px-2 py-1 text-[11px] font-semibold text-[#918EA2] uppercase tracking-wider">
                  Sort Tasks By
                </div>
                {(Object.keys(sortLabels) as SortOption[]).map((opt) => {
                  const isSel = sort === opt;
                  return (
                    <DropdownMenu.Item
                      key={opt}
                      onClick={() => onSortChange(opt)}
                      className={`flex items-center justify-between px-3 py-1.5 text-xs rounded-lg cursor-pointer outline-none transition-colors ${
                        isSel
                          ? "bg-[#C5C0FF]/15 text-[#C5C0FF] font-medium"
                          : "text-[#E3E1EC] hover:bg-[#252529]"
                      }`}
                    >
                      <span>{sortLabels[opt]}</span>
                      {isSel && <Check className="w-3.5 h-3.5 text-[#C5C0FF]" />}
                    </DropdownMenu.Item>
                  );
                })}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          {/* Export Button */}
          <button
            type="button"
            onClick={onOpenExport}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#161619] border border-[#1C1C20] text-[#918EA2] hover:text-white hover:border-[#474556] transition-colors"
            title="Export tasks"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          {/* Reset Filters Chip */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-[#FFB4AB]/10 text-[#FFB4AB] border border-[#FFB4AB]/25 hover:bg-[#FFB4AB]/20 transition-colors"
            >
              <span>Clear filters</span>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Next Alarm Indicator Banner */}
      {nextAlarm && nextAlarmCountdown && (
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#161619] border border-[#FFB77D]/25">
          <div className="flex items-center gap-2.5 truncate">
            <Bell className="w-4 h-4 text-[#FFB77D] shrink-0 animate-bounce" />
            <div className="flex items-center gap-1.5 text-xs truncate">
              <span className="text-[#FFB77D] font-bold">Next Alarm:</span>
              <span className="text-white font-medium truncate">{nextAlarm.taskTitle}</span>
            </div>
          </div>
          <span className="text-xs text-[#FFB77D] font-mono shrink-0 ml-2">
            in {nextAlarmCountdown}
          </span>
        </div>
      )}
    </div>
  );
}
