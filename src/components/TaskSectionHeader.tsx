"use client";

import React from "react";
import { ChevronDown, Moon, AlertTriangle, Calendar, CalendarDays, Clock, CheckCircle2, Check } from "lucide-react";
import { TaskSection } from "@/types";

interface TaskSectionHeaderProps {
  section: TaskSection;
  title: string;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  isSelectionMode?: boolean;
  isAllSelected?: boolean;
  onToggleSelectAll?: () => void;
}

export function TaskSectionHeader({
  section,
  title,
  count,
  isExpanded,
  onToggle,
  isSelectionMode = false,
  isAllSelected = false,
  onToggleSelectAll,
}: TaskSectionHeaderProps) {
  const getSectionConfig = () => {
    switch (section) {
      case "SNOOZED":
        return {
          icon: Moon,
          color: "text-[#FFB77D]",
          badgeBg: "bg-[#FFB77D]/15 text-[#FFB77D] border-[#FFB77D]/30",
          countLabel: `${count} snoozed`,
        };
      case "OVERDUE":
        return {
          icon: AlertTriangle,
          color: "text-[#EF4444]",
          badgeBg: "bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30",
          countLabel: `${count} overdue`,
        };
      case "TODAY":
        return {
          icon: Calendar,
          color: "text-[#C5C0FF]",
          badgeBg: "bg-[#C5C0FF]/15 text-[#C5C0FF] border-[#C5C0FF]/30",
          countLabel: `${count} tasks`,
        };
      case "TOMORROW":
        return {
          icon: CalendarDays,
          color: "text-[#FFB77D]",
          badgeBg: "bg-[#FFB77D]/15 text-[#FFB77D] border-[#FFB77D]/30",
          countLabel: `${count} scheduled`,
        };
      case "UPCOMING":
        return {
          icon: Clock,
          color: "text-[#68DBA9]",
          badgeBg: "bg-[#68DBA9]/15 text-[#68DBA9] border-[#68DBA9]/30",
          countLabel: `${count} scheduled`,
        };
      case "COMPLETED":
        return {
          icon: CheckCircle2,
          color: "text-[#918EA2]",
          badgeBg: "bg-[#918EA2]/15 text-[#918EA2] border-[#918EA2]/30",
          countLabel: `${count} completed`,
        };
    }
  };

  const config = getSectionConfig();
  const Icon = config.icon;

  return (
    <div
      onClick={onToggle}
      className="flex items-center justify-between py-2 px-1 cursor-pointer select-none group"
    >
      <div className="flex items-center gap-2.5">
        {/* Selection mode checkbox */}
        {isSelectionMode && onToggleSelectAll && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelectAll();
            }}
            className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
              isAllSelected
                ? "bg-[#5A45FF] border-[#5A45FF] text-white"
                : "border-[#918EA2] bg-transparent"
            }`}
          >
            {isAllSelected && <Check className="w-3.5 h-3.5" />}
          </div>
        )}

        <Icon className={`w-4 h-4 ${config.color}`} />
        <span className="text-xs font-bold uppercase tracking-wider text-white">
          {title}
        </span>

        {/* Count Pill */}
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${config.badgeBg}`}
        >
          {config.countLabel}
        </span>
      </div>

      <ChevronDown
        className={`w-4 h-4 text-[#918EA2] transition-transform duration-200 group-hover:text-white ${
          isExpanded ? "rotate-180" : ""
        }`}
      />
    </div>
  );
}
