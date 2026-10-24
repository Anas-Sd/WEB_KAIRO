"use client";

import React, { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  Download,
  MoreVertical,
  X,
} from "lucide-react";
import { Priority } from "@/types";
import { SortOption } from "@/store/useTaskStore";
import {
  FilterTasksDialog,
  SortTasksDialog,
  TaskFilterCriteria,
} from "@/components/TaskDialogs";

interface TaskFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  filter: TaskFilterCriteria;
  sort: SortOption;
  onFilterChange: (filter: TaskFilterCriteria) => void;
  onSortChange: (sort: SortOption) => void;
  onResetFilters: () => void;
  onOpenExport: () => void;
  moreMenuItems?: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    destructive?: boolean;
  }[];
}

export function TaskFilterBar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search by task name, note...",
  filter,
  sort,
  onFilterChange,
  onSortChange,
  onResetFilters,
  onOpenExport,
  moreMenuItems = [],
}: TaskFilterBarProps) {
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [sortModalOpen, setSortModalOpen] = useState(false);

  const hasActiveFilters =
    (filter.status && filter.status.length > 0) ||
    (filter.priority && filter.priority.length > 0) ||
    (filter.dueDatePreset && filter.dueDatePreset !== "ALL") ||
    !!filter.startDate ||
    !!filter.endDate;

  const sortShortLabels: Record<SortOption, string> = {
    DUE_DATE_ASC: "Earliest First",
    DUE_DATE_DESC: "Latest First",
    PRIORITY_DESC: "Highest Priority",
    PRIORITY_ASC: "Lowest Priority",
    ALPHA_ASC: "A-Z",
    ALPHA_DESC: "Z-A",
  };

  return (
    <div className="w-full space-y-2 mb-4">
      {/* Search and Action Row - matching screenshot */}
      <div className="flex items-center gap-2">
        {/* Search input (flex-1) */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#918EA2] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-[#111114] border border-[#1C1C20] hover:border-[#474556]/50 focus:border-[#C5C0FF] rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-[#E3E1EC] placeholder-[#918EA2] transition-colors focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#918EA2] hover:text-white p-0.5 rounded-full"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters Button (Modal Trigger) */}
        <button
          type="button"
          onClick={() => setFilterModalOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all shrink-0 ${
            hasActiveFilters
              ? "bg-[#C5C0FF]/15 border-[#C5C0FF] text-[#C5C0FF]"
              : "bg-[#111114] border-[#1C1C20] text-[#C8C4D9] hover:text-white hover:border-[#474556]"
          }`}
          title="Filter tasks"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Filters</span>
          {hasActiveFilters && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#C5C0FF]" />
          )}
          <ChevronDown className="w-3 h-3 text-[#918EA2]" />
        </button>

        {/* Sort Button (Modal Trigger) */}
        <button
          type="button"
          onClick={() => setSortModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#111114] border border-[#1C1C20] text-[#C8C4D9] hover:text-white hover:border-[#474556] transition-all shrink-0"
          title="Sort tasks"
        >
          <span>Sort: {sortShortLabels[sort] || "Custom"}</span>
          <ChevronDown className="w-3 h-3 text-[#918EA2]" />
        </button>

        {/* Export Button */}
        <button
          type="button"
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#111114] border border-[#1C1C20] text-[#68DBA9] hover:bg-[#68DBA9]/10 hover:border-[#68DBA9]/40 transition-all shrink-0"
          title="Export tasks"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Export</span>
        </button>

        {/* 3-dots Menu Button */}
        {moreMenuItems.length > 0 && (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="p-2 rounded-xl bg-[#111114] border border-[#1C1C20] text-[#918EA2] hover:text-white hover:border-[#474556] transition-all shrink-0"
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
                {moreMenuItems.map((item, idx) => (
                  <DropdownMenu.Item
                    key={idx}
                    onClick={item.onClick}
                    className={`flex items-center gap-2 px-3 py-2 text-xs rounded-lg cursor-pointer outline-none transition-colors ${
                      item.destructive
                        ? "text-[#FFB4AB] hover:bg-[#93000A]/30"
                        : "text-[#E3E1EC] hover:bg-[#252529] hover:text-[#C5C0FF]"
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        )}
      </div>

      {/* Active Filter Badges */}
      {hasActiveFilters && (
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          {filter.status?.map((st) => (
            <span
              key={st}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#5A45FF]/15 text-[#C5C0FF] border border-[#5A45FF]/30"
            >
              <span>Status: {st === "ACTIVE" ? "Active" : "Completed"}</span>
            </span>
          ))}

          {filter.priority?.map((pr) => (
            <span
              key={pr}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#C5C0FF]/15 text-[#C5C0FF] border border-[#C5C0FF]/30"
            >
              <span>Priority: {pr}</span>
            </span>
          ))}

          {filter.dueDatePreset && filter.dueDatePreset !== "ALL" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FFB77D]/15 text-[#FFB77D] border border-[#FFB77D]/30">
              <span>
                Due:{" "}
                {filter.dueDatePreset === "TODAY"
                  ? "Today"
                  : filter.dueDatePreset === "TOMORROW"
                  ? "Tomorrow"
                  : `${filter.startDate || ""} - ${filter.endDate || ""}`}
              </span>
            </span>
          )}

          <button
            type="button"
            onClick={onResetFilters}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#FFB4AB]/10 text-[#FFB4AB] border border-[#FFB4AB]/25 hover:bg-[#FFB4AB]/20 transition-colors"
          >
            <span>Clear filters</span>
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Filter Modal Dialog */}
      <FilterTasksDialog
        open={filterModalOpen}
        onOpenChange={setFilterModalOpen}
        filter={filter}
        onApplyFilter={onFilterChange}
        onResetFilters={onResetFilters}
      />

      {/* Sort Modal Dialog */}
      <SortTasksDialog
        open={sortModalOpen}
        onOpenChange={setSortModalOpen}
        sort={sort}
        onApplySort={onSortChange}
      />
    </div>
  );
}
