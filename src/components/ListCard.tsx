"use client";

import React from "react";
import { MoreVertical, Edit2, Trash2, Info, GripVertical, Check, FolderTree } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { TaskList } from "@/types";
import { renderListIcon } from "./ListIconPicker";

interface ListCardProps {
  list: TaskList;
  totalItems: number;
  completedItems: number;
  onClick: () => void;
  onEdit: () => void;
  onAdjustParent?: () => void;
  onDelete: () => void;
  onShowDetails: () => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

export function ListCard({
  list,
  totalItems,
  completedItems,
  onClick,
  onEdit,
  onAdjustParent,
  onDelete,
  onShowDetails,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
  dragHandleProps,
}: ListCardProps) {
  const percent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div
      onClick={onClick}
      className={`relative flex flex-col justify-between p-4 rounded-2xl bg-[#161619] border transition-all duration-200 cursor-pointer ${
        isSelected
          ? "border-[#C5C0FF] bg-[#1C1C20]"
          : "border-[#474556]/20 hover:border-[#474556]/50 hover:bg-[#1A1A1E]"
      }`}
    >
      {/* Top row: Icon, Name, and Menu */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Selection Checkbox or Drag Handle */}
          {isSelectionMode ? (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect?.();
              }}
              className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors shrink-0 ${
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
              className="cursor-grab active:cursor-grabbing text-[#918EA2] hover:text-white p-0.5 opacity-60 hover:opacity-100 transition-opacity shrink-0"
              title="Drag to reorder"
            >
              <GripVertical className="w-4 h-4" />
            </button>
          )}

          {/* Icon badge */}
          <div className="w-9 h-9 rounded-xl bg-[#252529] border border-[#474556]/30 flex items-center justify-center text-[#C5C0FF] shrink-0">
            {renderListIcon(list.iconName, "w-4 h-4")}
          </div>

          <div className="truncate">
            <h3 className="text-sm font-bold text-white truncate">{list.name}</h3>
            <span className="text-[11px] text-[#918EA2]">
              {totalItems === 0
                ? "No items yet"
                : `${completedItems}/${totalItems} completed`}
            </span>
          </div>
        </div>

        {/* 3-dots Menu */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded-lg text-[#918EA2] hover:text-white hover:bg-[#252529] transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={4}
              onClick={(e) => e.stopPropagation()}
              className="z-50 min-w-[150px] bg-[#1C1C20] border border-[#474556]/40 rounded-xl p-1 shadow-2xl"
            >
              <DropdownMenu.Item
                onClick={onShowDetails}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#E3E1EC] hover:bg-[#252529] rounded-lg cursor-pointer outline-none"
              >
                <Info className="w-3.5 h-3.5 text-[#918EA2]" />
                <span>Details</span>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onClick={onEdit}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#E3E1EC] hover:bg-[#252529] rounded-lg cursor-pointer outline-none"
              >
                <Edit2 className="w-3.5 h-3.5 text-[#918EA2]" />
                <span>Edit List</span>
              </DropdownMenu.Item>
              {onAdjustParent && (
                <DropdownMenu.Item
                  onClick={onAdjustParent}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#E3E1EC] hover:bg-[#252529] rounded-lg cursor-pointer outline-none"
                >
                  <FolderTree className="w-3.5 h-3.5 text-[#C5C0FF]" />
                  <span>Adjust Parent</span>
                </DropdownMenu.Item>
              )}
              <DropdownMenu.Separator className="h-px bg-[#252529] my-1" />
              <DropdownMenu.Item
                onClick={onDelete}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#FFB4AB] hover:bg-[#93000A]/30 rounded-lg cursor-pointer outline-none font-medium"
              >
                <Trash2 className="w-3.5 h-3.5 text-[#FFB4AB]" />
                <span>Delete List</span>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {/* Progress Bar & percentage */}
      <div className="mt-4 pt-2 border-t border-[#1C1C20]/80">
        <div className="flex items-center justify-between text-[11px] text-[#918EA2] mb-1.5">
          <span>Progress</span>
          <span className="font-semibold text-white">{percent}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-[#111114] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#5A45FF] to-[#68DBA9] transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
