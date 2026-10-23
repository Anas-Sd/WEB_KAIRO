"use client";

import React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Music, Check, ChevronDown } from "lucide-react";
import { ToneOption } from "@/types";

interface TonePickerProps {
  selectedToneTitle: string | null;
  tones: ToneOption[];
  onSelectTone: (tone: ToneOption) => void;
}

export function TonePicker({ selectedToneTitle, tones, onSelectTone }: TonePickerProps) {
  const currentTitle = selectedToneTitle || "Default Alarm Tone";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#161619] border border-[#474556]/40 hover:border-[#C5C0FF]/60 rounded-xl text-sm text-[#E3E1EC] transition-colors group"
        >
          <div className="flex items-center gap-2.5 truncate">
            <Music className="w-4 h-4 text-[#C5C0FF] shrink-0" />
            <span className="truncate">{currentTitle}</span>
          </div>
          <ChevronDown className="w-4 h-4 text-[#918EA2] group-hover:text-white shrink-0 ml-2" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 w-[280px] max-h-60 overflow-y-auto bg-[#1C1C20] border border-[#474556]/40 rounded-xl p-1 shadow-2xl"
        >
          <div className="px-2 py-1.5 text-[11px] font-semibold text-[#918EA2] uppercase tracking-wider">
            Available Alarm Tones
          </div>
          {tones.map((tone, idx) => {
            const isSelected = tone.title === currentTitle;
            return (
              <DropdownMenu.Item
                key={idx}
                onClick={() => onSelectTone(tone)}
                className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg cursor-pointer outline-none transition-colors ${
                  isSelected
                    ? "bg-[#C5C0FF]/15 text-[#C5C0FF] font-medium"
                    : "text-[#E3E1EC] hover:bg-[#252529]"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Music className="w-3.5 h-3.5 text-[#918EA2] shrink-0" />
                  <span className="truncate">{tone.title}</span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-[#C5C0FF] shrink-0 ml-2" />}
              </DropdownMenu.Item>
            );
          })}
          <div className="px-2 py-1.5 mt-1 border-t border-[#1C1C20] text-[10px] text-[#918EA2]">
            Note: Alarm audio plays on your Android device upon sync.
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
