"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  MoreVertical,
  Info,
  Edit2,
  PlusCircle,
  FolderTree,
  Trash2,
  GripVertical,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ListItem } from "@/types";
import { renderListIcon } from "./ListIconPicker";

export interface ParentListItemCardProps {
  item: ListItem;
  totalSubtasks: number;
  completedSubtasks: number;
  breadcrumbPath?: string[] | null;
  onNavigateToLocation?: () => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onToggleCompletion: (itemId: string) => void;
  onDrillDown: (item: ListItem) => void;
  onShowDetails: (item: ListItem) => void;
  onEditItem: (item: ListItem) => void;
  onAddSubtasks: (item: ListItem) => void;
  onAdjustParent: (item: ListItem) => void;
  onDeleteItem: (item: ListItem) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

export function ParentListItemCard({
  item,
  totalSubtasks,
  completedSubtasks,
  breadcrumbPath,
  onNavigateToLocation,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
  onToggleCompletion,
  onDrillDown,
  onShowDetails,
  onEditItem,
  onAddSubtasks,
  onAdjustParent,
  onDeleteItem,
  dragHandleProps,
}: ParentListItemCardProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const percentage =
    totalSubtasks > 0 ? Math.round((completedSubtasks * 100) / totalSubtasks) : 0;

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSelectionMode && onToggleSelect) {
      onToggleSelect();
      return;
    }
    setIsAnimating(true);
    setTimeout(() => {
      onToggleCompletion(item.id);
      setIsAnimating(false);
    }, 280);
  };

  const handleCardClick = () => {
    if (isSelectionMode && onToggleSelect) {
      onToggleSelect();
      return;
    }
    onDrillDown(item);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative p-3.5 rounded-2xl transition-all duration-150 select-none cursor-pointer ${
        isSelected
          ? "bg-[#1C1C20] border border-[#C5C0FF] shadow-lg shadow-[#C5C0FF]/5"
          : "bg-[#161619] hover:bg-[#1A1A1E] border border-[#1C1C20] hover:border-[#474556]/50 shadow-sm"
      }`}
    >
      {/* Top Header Row: Drag Handle, Checkbox, Icon Box, Title & Counts, 3-dots Menu */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {/* Drag Handle or Selection Checkbox */}
          {isSelectionMode ? (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect?.();
              }}
              className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors shrink-0 cursor-pointer ${
                isSelected
                  ? "bg-[#5A45FF] border-[#5A45FF] text-white"
                  : "border-[#918EA2] bg-transparent"
              }`}
            >
              {isSelected && <Check className="w-3.5 h-3.5" />}
            </div>
          ) : (
            <button
              type="button"
              {...dragHandleProps}
              onClick={(e) => e.stopPropagation()}
              style={{ touchAction: "none" }}
              className="cursor-grab active:cursor-grabbing text-[#918EA2] hover:text-white p-0.5 opacity-50 hover:opacity-100 transition-opacity shrink-0"
              title="Drag to reorder"
            >
              <GripVertical className="w-4 h-4" />
            </button>
          )}

          {/* Squircle Checkbox */}
          {!isSelectionMode && (
            <motion.button
              type="button"
              onClick={handleCheckboxClick}
              animate={isAnimating ? { scale: [1, 1.35, 0.88, 1] } : { scale: 1 }}
              transition={{ duration: 0.28, ease: "easeInOut" }}
              className={`w-5 h-5 rounded-[8px] flex items-center justify-center border transition-all shrink-0 cursor-pointer ${
                item.isCompleted
                  ? "bg-[#5A45FF] border-[#5A45FF] shadow-sm shadow-[#5A45FF]/30"
                  : "bg-transparent border-white/45 hover:border-white/80"
              }`}
              title={item.isCompleted ? "Mark incomplete" : "Mark complete"}
            >
              {item.isCompleted && <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />}
            </motion.button>
          )}

          {/* 40x40 Icon in Squircle */}
          <div className="w-10 h-10 rounded-xl bg-[#5A45FF]/15 border border-[#5A45FF]/30 flex items-center justify-center text-[#C5C0FF] text-xl shrink-0 shadow-inner">
            {renderListIcon(item.iconName || "list", "w-5 h-5")}
          </div>

          {/* Title & Subtasks completed count */}
          <div className="flex-1 min-w-0">
            <h3
              className={`text-sm font-bold tracking-wide truncate transition-colors ${
                item.isCompleted
                  ? "line-through text-[#918EA2]/60"
                  : "text-[#E3E1EC] group-hover:text-white"
              }`}
            >
              {item.title}
            </h3>
            <p className="text-xs text-[#918EA2] mt-0.5 font-normal">
              {completedSubtasks}/{totalSubtasks} completed
            </p>
            {breadcrumbPath && breadcrumbPath.length > 0 && (
              <div
                onClick={(e) => {
                  if (onNavigateToLocation) {
                    e.stopPropagation();
                    onNavigateToLocation();
                  }
                }}
                className="flex items-center gap-1.5 mt-1 text-[11px] font-medium text-[#C5C0FF] bg-[#C5C0FF]/10 border border-[#C5C0FF]/20 px-2 py-0.5 rounded-md w-fit hover:bg-[#C5C0FF]/20 transition-colors"
                title={breadcrumbPath.join("  ›  ")}
              >
                <FolderTree className="w-3 h-3 text-[#C5C0FF] shrink-0" />
                <span className="truncate max-w-[260px]">
                  {breadcrumbPath.join("  ›  ")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 3-dots Menu Button */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="p-1.5 rounded-lg text-[#918EA2] hover:text-white hover:bg-[#252529] transition-colors cursor-pointer"
                title="More options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={4}
                className="z-50 min-w-[160px] bg-[#1C1C20] border border-[#474556]/40 rounded-xl p-1 shadow-2xl text-xs"
              >
                <DropdownMenu.Item
                  onClick={() => onShowDetails(item)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#E3E1EC] hover:bg-[#252529] rounded-lg cursor-pointer outline-none transition-colors"
                >
                  <Info className="w-3.5 h-3.5 text-[#C5C0FF]" />
                  <span>Details</span>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onClick={() => onAddSubtasks(item)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#E3E1EC] hover:bg-[#252529] hover:text-[#68DBA9] rounded-lg cursor-pointer outline-none transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-[#68DBA9]" />
                  <span>Add Subtask</span>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onClick={() => onAdjustParent(item)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#E3E1EC] hover:bg-[#252529] hover:text-[#FFB77D] rounded-lg cursor-pointer outline-none transition-colors"
                >
                  <FolderTree className="w-3.5 h-3.5 text-[#FFB77D]" />
                  <span>Adjust Parent</span>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onClick={() => onEditItem(item)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#E3E1EC] hover:bg-[#252529] hover:text-[#C5C0FF] rounded-lg cursor-pointer outline-none transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#C5C0FF]" />
                  <span>Edit Item</span>
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="h-px bg-[#252529] my-1" />
                <DropdownMenu.Item
                  onClick={() => onDeleteItem(item)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#FFB4AB] hover:bg-[#93000A]/30 rounded-lg cursor-pointer outline-none transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-[#FFB4AB]" />
                  <span>Delete</span>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>

      {/* Bottom Progress Row & Bar (Matching Pic 1) */}
      <div className="mt-3.5 pt-2.5 border-t border-[#1C1C20]/60">
        <div className="flex items-center justify-between text-[11px] text-[#918EA2] mb-1.5 font-medium">
          <span>Progress</span>
          <span className={percentage === 100 ? "text-[#68DBA9] font-bold" : "text-[#E3E1EC] font-semibold"}>
            {percentage}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-[#111114] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              percentage === 100 ? "bg-[#68DBA9]" : "bg-[#5A45FF]"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
