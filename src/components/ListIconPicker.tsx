"use client";

import React from "react";
import {
  List,
  CheckSquare,
  ShoppingCart,
  Briefcase,
  GraduationCap,
  Dumbbell,
  Plane,
  Lightbulb,
  Home,
  Target,
  Package,
  Code,
  Heart,
} from "lucide-react";

export const MATERIAL_ICONS: { key: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "list", label: "General", icon: List },
  { key: "checklist", label: "Checklist", icon: CheckSquare },
  { key: "shopping", label: "Shopping", icon: ShoppingCart },
  { key: "work", label: "Work", icon: Briefcase },
  { key: "study", label: "Study", icon: GraduationCap },
  { key: "fitness", label: "Fitness", icon: Dumbbell },
  { key: "travel", label: "Travel", icon: Plane },
  { key: "ideas", label: "Ideas", icon: Lightbulb },
  { key: "home", label: "Home", icon: Home },
  { key: "goals", label: "Goals", icon: Target },
  { key: "packing", label: "Packing", icon: Package },
  { key: "code", label: "Code", icon: Code },
  { key: "wishlist", label: "Wishlist", icon: Heart },
];

export const EMOJIS = [
  "📝", "🛒", "🎯", "🚀", "💡", "💼", "📚", "🏋️",
  "✈️", "🏠", "⭐", "📦", "💻", "❤️", "🔥", "✅",
  "🎉", "🎨", "🍔", "💰"
];

export function renderListIcon(iconName: string, className = "w-5 h-5") {
  if (!iconName) return <List className={className} />;

  if (iconName.startsWith("emoji:")) {
    const char = iconName.replace("emoji:", "");
    return <span className="text-base select-none leading-none">{char}</span>;
  }

  // Check if string is direct emoji character
  if (/\p{Emoji}/u.test(iconName) && iconName.length <= 4) {
    return <span className="text-base select-none leading-none">{iconName}</span>;
  }

  const match = MATERIAL_ICONS.find((m) => m.key === iconName);
  if (match) {
    const IconComponent = match.icon;
    return <IconComponent className={className} />;
  }

  return <List className={className} />;
}

interface ListIconPickerProps {
  selectedIcon: string;
  onSelectIcon: (iconName: string) => void;
}

export function ListIconPicker({ selectedIcon, onSelectIcon }: ListIconPickerProps) {
  return (
    <div className="space-y-3">
      {/* Material Icons */}
      <div>
        <span className="text-xs font-semibold text-[#918EA2] block mb-2">Icons</span>
        <div className="grid grid-cols-7 gap-2">
          {MATERIAL_ICONS.map((item) => {
            const Icon = item.icon;
            const isSelected = selectedIcon === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelectIcon(item.key)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${
                  isSelected
                    ? "bg-[#5A45FF] border-[#5A45FF] text-white shadow-md shadow-[#5A45FF]/30"
                    : "bg-[#161619] border-[#1C1C20] text-[#918EA2] hover:text-white hover:border-[#474556]"
                }`}
                title={item.label}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Emojis */}
      <div>
        <span className="text-xs font-semibold text-[#918EA2] block mb-2">Emojis</span>
        <div className="grid grid-cols-10 gap-1.5">
          {EMOJIS.map((emoji) => {
            const emojiVal = `emoji:${emoji}`;
            const isSelected = selectedIcon === emojiVal || selectedIcon === emoji;
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => onSelectIcon(emojiVal)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm border transition-all ${
                  isSelected
                    ? "bg-[#5A45FF]/30 border-[#5A45FF] scale-110"
                    : "bg-[#161619] border-[#1C1C20] hover:bg-[#1C1C20]"
                }`}
              >
                {emoji}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
