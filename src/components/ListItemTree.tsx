"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  ChevronRight,
  ChevronDown,
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

interface ListItemRowProps {
  item: ListItem;
  childItems: ListItem[];
  depth?: number;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onToggleCompletion: (itemId: string) => void;
  onShowDetails: (item: ListItem) => void;
  onEditItem: (item: ListItem) => void;
  onAddSubtasks: (parentItem: ListItem) => void;
  onAdjustParent: (item: ListItem) => void;
  onDeleteItem: (item: ListItem) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
}

export function ListItemRow({
  item,
  childItems,
  depth = 0,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
  onToggleCompletion,
  onShowDetails,
  onEditItem,
  onAddSubtasks,
  onAdjustParent,
  onDeleteItem,
  dragHandleProps,
}: ListItemRowProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  const hasChildren = childItems.length > 0;

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

  return (
    <div className="flex flex-col select-none">
      <div
        style={{ paddingLeft: `${Math.min(depth * 18, 54)}px` }}
        className={`group relative flex items-center justify-between p-2.5 rounded-xl transition-all duration-150 ${
          isSelected
            ? "bg-[#1C1C20] border border-[#C5C0FF]"
            : "bg-[#161619] hover:bg-[#1A1A1E] border border-[#1C1C20]"
        }`}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {/* Drag or Select */}
          {isSelectionMode ? (
            <div
              onClick={onToggleSelect}
              className={`w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 cursor-pointer ${
                isSelected
                  ? "bg-[#5A45FF] border-[#5A45FF] text-white"
                  : "border-[#918EA2] bg-transparent"
              }`}
            >
              {isSelected && <Check className="w-3 h-3" />}
            </div>
          ) : (
            <button
              type="button"
              {...dragHandleProps}
              className="cursor-grab active:cursor-grabbing text-[#918EA2] hover:text-white p-0.5 opacity-40 hover:opacity-100 transition-opacity shrink-0"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Expand/Collapse chevron if parent */}
          {hasChildren ? (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded text-[#918EA2] hover:text-white shrink-0"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          ) : (
            <div className="w-3.5" />
          )}

          {/* Squircle Checkbox */}
          <motion.button
            type="button"
            onClick={handleCheckboxClick}
            animate={isAnimating ? { scale: [1, 1.35, 0.88, 1] } : { scale: 1 }}
            transition={{ duration: 0.28, ease: "easeInOut" }}
            className={`w-5 h-5 rounded-[8px] flex items-center justify-center border transition-all shrink-0 ${
              item.isCompleted
                ? "bg-[#5A45FF] border-[#5A45FF] shadow-sm shadow-[#5A45FF]/30"
                : "bg-transparent border-white/45 hover:border-white/80"
            }`}
          >
            {item.isCompleted && <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />}
          </motion.button>

          {/* Title and notes */}
          <div className="flex items-center gap-2 truncate">
            <span
              className={`text-sm truncate transition-colors ${
                item.isCompleted
                  ? "line-through text-[#918EA2]/60"
                  : "text-[#E3E1EC] font-medium"
              }`}
            >
              {item.title}
            </span>

            {item.targetDate && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] bg-[#111114] text-[#918EA2] border border-[#1C1C20] shrink-0">
                <Calendar className="w-2.5 h-2.5" />
                <span>{item.targetDate}</span>
              </span>
            )}
          </div>
        </div>

        {/* 3-dots Menu */}
        <div className="shrink-0 ml-2">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className="p-1 rounded-lg text-[#918EA2] hover:text-white hover:bg-[#252529] transition-colors"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={4}
                className="z-50 min-w-[160px] bg-[#1C1C20] border border-[#474556]/40 rounded-xl p-1 shadow-2xl"
              >
                <DropdownMenu.Item
                  onClick={() => onShowDetails(item)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#E3E1EC] hover:bg-[#252529] rounded-lg cursor-pointer outline-none"
                >
                  <Info className="w-3.5 h-3.5 text-[#918EA2]" />
                  <span>Details</span>
                </DropdownMenu.Item>

                <DropdownMenu.Item
                  onClick={() => onEditItem(item)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#E3E1EC] hover:bg-[#252529] rounded-lg cursor-pointer outline-none"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#918EA2]" />
                  <span>Edit</span>
                </DropdownMenu.Item>

                <DropdownMenu.Item
                  onClick={() => onAddSubtasks(item)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#E3E1EC] hover:bg-[#252529] rounded-lg cursor-pointer outline-none"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-[#918EA2]" />
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

      {/* Render children recursively if expanded */}
      {hasChildren && isExpanded && (
        <div className="space-y-1.5 mt-1.5">
          {childItems.map((child) => (
            <ListItemRow
              key={child.id}
              item={child}
              childItems={[]}
              depth={depth + 1}
              isSelectionMode={isSelectionMode}
              isSelected={isSelected}
              onToggleSelect={onToggleSelect}
              onToggleCompletion={onToggleCompletion}
              onShowDetails={onShowDetails}
              onEditItem={onEditItem}
              onAddSubtasks={onAddSubtasks}
              onAdjustParent={onAdjustParent}
              onDeleteItem={onDeleteItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}
