"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  ChevronRight,
  MoreVertical,
  Calendar,
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
import { ParentListItemCard } from "./ParentListItemCard";

export interface ListItemRowProps {
  item: ListItem;
  subtaskStats?: { total: number; completed: number };
  breadcrumbPath?: string[] | null;
  onNavigateToLocation?: () => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  parentTitle?: string | null;
  onToggleSelect?: () => void;
  onToggleCompletion: (itemId: string) => void;
  onDrillDown?: (item: ListItem) => void;
  onShowDetails: (item: ListItem) => void;
  onEditItem: (item: ListItem) => void;
  onAddSubtasks: (parentItem: ListItem) => void;
  onAdjustParent: (item: ListItem) => void;
  onDeleteItem: (item: ListItem) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

export function ListItemRow({
  item,
  subtaskStats,
  breadcrumbPath,
  onNavigateToLocation,
  isSelectionMode = false,
  isSelected = false,
  parentTitle,
  onToggleSelect,
  onToggleCompletion,
  onDrillDown,
  onShowDetails,
  onEditItem,
  onAddSubtasks,
  onAdjustParent,
  onDeleteItem,
  dragHandleProps,
}: ListItemRowProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [localCompleted, setLocalCompleted] = useState(item.isCompleted);

  React.useEffect(() => {
    setLocalCompleted(item.isCompleted);
  }, [item.isCompleted]);

  const hasSubtasks = !!(subtaskStats && subtaskStats.total > 0);

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSelectionMode && onToggleSelect) {
      onToggleSelect();
      return;
    }
    const next = !localCompleted;
    setLocalCompleted(next);
    setIsAnimating(true);
    setTimeout(() => {
      onToggleCompletion(item.id);
      setIsAnimating(false);
    }, 300);
  };

  const handleTitleClick = () => {
    if (isSelectionMode && onToggleSelect) {
      onToggleSelect();
      return;
    }
    if (hasSubtasks && onDrillDown) {
      onDrillDown(item);
    } else {
      onShowDetails(item);
    }
  };

  if (hasSubtasks) {
    return (
      <ParentListItemCard
        item={item}
        totalSubtasks={subtaskStats?.total || 0}
        completedSubtasks={subtaskStats?.completed || 0}
        breadcrumbPath={breadcrumbPath}
        onNavigateToLocation={onNavigateToLocation}
        isSelectionMode={isSelectionMode}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
        onToggleCompletion={onToggleCompletion}
        onDrillDown={() => onDrillDown?.(item)}
        onShowDetails={onShowDetails}
        onEditItem={onEditItem}
        onAddSubtasks={onAddSubtasks}
        onAdjustParent={onAdjustParent}
        onDeleteItem={onDeleteItem}
        dragHandleProps={dragHandleProps}
      />
    );
  }

  return (
    <div
      className={`group relative flex items-center justify-between p-3 rounded-2xl transition-all duration-150 select-none ${
        isSelected
          ? "bg-[#1C1C20] border border-[#C5C0FF]"
          : "bg-[#161619] hover:bg-[#1A1A1E] border border-[#1C1C20] hover:border-[#474556]/50"
      }`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
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
            animate={isAnimating ? { scale: [1, 1.35, 0.9, 1] } : { scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`w-5 h-5 rounded-[8px] flex items-center justify-center border transition-all shrink-0 cursor-pointer ${
              localCompleted
                ? "bg-[#5A45FF] border-[#5A45FF] shadow-sm shadow-[#5A45FF]/30"
                : "bg-transparent border-white/45 hover:border-white/80"
            }`}
            title={localCompleted ? "Mark incomplete" : "Mark complete"}
          >
            {localCompleted && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
              >
                <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />
              </motion.div>
            )}
          </motion.button>
        )}

        {/* Title, Notes, Badges */}
        <div onClick={handleTitleClick} className="flex-1 min-w-0 cursor-pointer">
          <div className="flex items-center gap-2">
            <span
              className={`text-sm truncate transition-all duration-200 font-medium ${
                localCompleted
                  ? "line-through text-[#918EA2]/60"
                  : "text-[#E3E1EC] hover:text-white"
              }`}
            >
              {item.title}
            </span>

            {/* Parent badge if in search view */}
            {parentTitle && !breadcrumbPath && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#111114] text-[#918EA2] border border-[#1C1C20] shrink-0">
                ↳ {parentTitle}
              </span>
            )}
          </div>

          {/* Breadcrumb path below title */}
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

          {/* Subtitle row: Notes snippet & Target date */}
          {(item.notes || item.targetDate) && (
            <div className="flex items-center gap-2.5 mt-0.5 text-[11px] text-[#918EA2] truncate">
              {item.notes && (
                <span className="truncate max-w-[240px] text-[#918EA2]/80">
                  {item.notes}
                </span>
              )}
              {item.targetDate && (
                <span className="inline-flex items-center gap-1 text-[#C5C0FF] shrink-0">
                  <Calendar className="w-3 h-3" />
                  {item.targetDate}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right controls: Subtask drill-down indicator & 3-dots Menu */}
      <div className="flex items-center gap-1.5 ml-2 shrink-0">
        {/* If has subtasks, show clickable drill-down button */}
        {hasSubtasks && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDrillDown?.(item);
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#252529]/60 hover:bg-[#252529] border border-[#474556]/40 text-[#C5C0FF] text-xs font-semibold transition-colors cursor-pointer"
            title={`View ${subtaskStats?.total} subtasks`}
          >
            <span>
              {subtaskStats?.completed}/{subtaskStats?.total}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-[#C5C0FF]" />
          </button>
        )}

        {/* 3-dots Menu */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
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
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#E3E1EC] hover:bg-[#252529] rounded-lg cursor-pointer outline-none"
              >
                <Info className="w-3.5 h-3.5 text-[#C5C0FF]" />
                <span>Details</span>
              </DropdownMenu.Item>

              <DropdownMenu.Item
                onClick={() => onEditItem(item)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#E3E1EC] hover:bg-[#252529] rounded-lg cursor-pointer outline-none"
              >
                <Edit2 className="w-3.5 h-3.5 text-[#68DBA9]" />
                <span>Edit</span>
              </DropdownMenu.Item>

              <DropdownMenu.Item
                onClick={() => onAddSubtasks(item)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#E3E1EC] hover:bg-[#252529] rounded-lg cursor-pointer outline-none"
              >
                <PlusCircle className="w-3.5 h-3.5 text-[#FFB77D]" />
                <span>Add Subtasks</span>
              </DropdownMenu.Item>

              <DropdownMenu.Item
                onClick={() => onAdjustParent(item)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#E3E1EC] hover:bg-[#252529] rounded-lg cursor-pointer outline-none"
              >
                <FolderTree className="w-3.5 h-3.5 text-[#918EA2]" />
                <span>Adjust Parent</span>
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="h-px bg-[#252529] my-1" />

              <DropdownMenu.Item
                onClick={() => onDeleteItem(item)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#FFB4AB] hover:bg-[#93000A]/30 rounded-lg cursor-pointer outline-none font-medium"
              >
                <Trash2 className="w-3.5 h-3.5 text-[#FFB4AB]" />
                <span>Delete</span>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </div>
  );
}
