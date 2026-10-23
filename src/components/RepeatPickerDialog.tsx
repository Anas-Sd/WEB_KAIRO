"use client";

import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import { format, parseISO } from "date-fns";
import { X, Calendar as CalendarIcon, Plus, Check } from "lucide-react";
import { RepeatType } from "@/types";

interface RepeatPickerResult {
  repeatType: RepeatType;
  repeatDays: string | null;
  repeatDates: string | null;
}

interface RepeatPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRepeatType?: RepeatType;
  initialRepeatDays?: string | null;
  initialRepeatDates?: string | null;
  onSave: (result: RepeatPickerResult) => void;
}

const WEEKDAYS = [
  { label: "M", code: "MON" },
  { label: "T", code: "TUE" },
  { label: "W", code: "WED" },
  { label: "T", code: "THU" },
  { label: "F", code: "FRI" },
  { label: "S", code: "SAT" },
  { label: "S", code: "SUN" },
];

export function RepeatPickerDialog({
  open,
  onOpenChange,
  initialRepeatType = null,
  initialRepeatDays = null,
  initialRepeatDates = null,
  onSave,
}: RepeatPickerDialogProps) {
  // Days state
  const [selectedDays, setSelectedDays] = useState<Set<string>>(() => {
    if (initialRepeatDays) {
      return new Set(initialRepeatDays.split(",").map((s) => s.trim().toUpperCase()));
    }
    return new Set();
  });

  // Dates state
  const [selectedDates, setSelectedDates] = useState<string[]>(() => {
    if (initialRepeatDates) {
      return initialRepeatDates.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [];
  });

  const [repeatEveryMonth, setRepeatEveryMonth] = useState<boolean>(() => {
    return (
      initialRepeatType === "MONTHLY_DATES" ||
      initialRepeatType === "BOTH_MONTHLY"
    );
  });

  const [dateInputVal, setDateInputVal] = useState("");

  const toggleDay = (dayCode: string) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayCode)) next.delete(dayCode);
      else next.add(dayCode);
      return next;
    });
  };

  const handleAddDate = () => {
    if (!dateInputVal) return;
    try {
      const parsed = parseISO(dateInputVal);
      const formatted = format(parsed, "MMM d");
      if (!selectedDates.includes(formatted)) {
        setSelectedDates((prev) => [...prev, formatted]);
      }
      setDateInputVal("");
    } catch {
      // ignore
    }
  };

  const handleRemoveDate = (index: number) => {
    setSelectedDates((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const hasDays = selectedDays.size > 0;
    const hasDates = selectedDates.length > 0;

    let computedType: RepeatType = null;
    let daysStr: string | null = null;
    let datesStr: string | null = null;

    if (hasDays && hasDates) {
      computedType = repeatEveryMonth ? "BOTH_MONTHLY" : "BOTH";
      daysStr = Array.from(selectedDays).join(",");
      datesStr = selectedDates.join(", ");
    } else if (hasDays) {
      computedType = "DAYS";
      daysStr = Array.from(selectedDays).join(",");
    } else if (hasDates) {
      computedType = repeatEveryMonth ? "MONTHLY_DATES" : "DATES";
      datesStr = selectedDates.join(", ");
    } else {
      computedType = null;
    }

    onSave({
      repeatType: computedType,
      repeatDays: daysStr,
      repeatDates: datesStr,
    });
    onOpenChange(false);
  };

  const handleClear = () => {
    setSelectedDays(new Set());
    setSelectedDates([]);
    setRepeatEveryMonth(false);
    onSave({ repeatType: null, repeatDays: null, repeatDates: null });
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-[#0C0C0F] border border-[#1C1C20] rounded-2xl p-6 shadow-2xl focus:outline-none">
          <div className="flex items-center justify-between pb-4 border-b border-[#1C1C20]">
            <Dialog.Title className="text-base font-bold text-white">
              Repeat Schedule
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="p-1.5 rounded-lg text-[#918EA2] hover:text-white hover:bg-[#161619]"
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <Tabs.Root defaultValue="days" className="mt-4">
            <Tabs.List className="flex border-b border-[#1C1C20] mb-4">
              <Tabs.Trigger
                value="days"
                className="flex-1 py-2 text-sm font-medium text-[#918EA2] data-[state=active]:text-[#C5C0FF] data-[state=active]:border-b-2 data-[state=active]:border-[#C5C0FF] transition-colors"
              >
                Days of Week
              </Tabs.Trigger>
              <Tabs.Trigger
                value="dates"
                className="flex-1 py-2 text-sm font-medium text-[#918EA2] data-[state=active]:text-[#C5C0FF] data-[state=active]:border-b-2 data-[state=active]:border-[#C5C0FF] transition-colors"
              >
                Specific Dates
              </Tabs.Trigger>
            </Tabs.List>

            {/* Days Tab */}
            <Tabs.Content value="days" className="space-y-4 focus:outline-none">
              <p className="text-xs text-[#918EA2]">
                Select which days of the week this task should repeat:
              </p>
              <div className="flex items-center justify-between gap-1 py-2">
                {WEEKDAYS.map((day, idx) => {
                  const isSelected = selectedDays.has(day.code);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleDay(day.code)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-150 ${
                        isSelected
                          ? "bg-[#5A45FF] text-white shadow-md shadow-[#5A45FF]/30 scale-105"
                          : "bg-[#161619] border border-[#1C1C20] text-[#918EA2] hover:text-[#E3E1EC] hover:border-[#474556]"
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </Tabs.Content>

            {/* Dates Tab */}
            <Tabs.Content value="dates" className="space-y-4 focus:outline-none">
              <p className="text-xs text-[#918EA2]">
                Add specific dates for this task to repeat:
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateInputVal}
                  onChange={(e) => setDateInputVal(e.target.value)}
                  className="flex-1 bg-[#161619] border border-[#1C1C20] rounded-xl px-3 py-2 text-sm text-[#E3E1EC] focus:outline-none focus:border-[#C5C0FF]"
                />
                <button
                  type="button"
                  disabled={!dateInputVal}
                  onClick={handleAddDate}
                  className="px-3.5 py-2 rounded-xl bg-[#5A45FF] hover:bg-[#5A45FF]/90 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </div>

              {/* Removable chips */}
              <div className="flex flex-wrap gap-2 min-h-[48px] p-2 bg-[#111114] border border-[#1C1C20] rounded-xl">
                {selectedDates.length === 0 ? (
                  <span className="text-xs text-[#918EA2] italic m-auto">No dates added yet</span>
                ) : (
                  selectedDates.map((dateStr, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1C1C20] border border-[#474556]/50 rounded-full text-xs text-[#E3E1EC]"
                    >
                      <span>{dateStr}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDate(idx)}
                        className="text-[#918EA2] hover:text-[#FFB4AB]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Monthly toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={repeatEveryMonth}
                  onChange={(e) => setRepeatEveryMonth(e.target.checked)}
                  className="w-4 h-4 rounded text-[#5A45FF] bg-[#161619] border-[#474556] focus:ring-0 focus:outline-none"
                />
                <span className="text-xs text-[#E3E1EC]">Repeat every month on these dates</span>
              </label>
            </Tabs.Content>
          </Tabs.Root>

          {/* Dialog Action Buttons */}
          <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-[#1C1C20]">
            <button
              type="button"
              onClick={handleClear}
              className="px-3.5 py-2 text-xs font-medium text-[#FFB4AB] hover:bg-[#93000A]/20 rounded-xl transition-colors"
            >
              Does not repeat
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-3.5 py-2 text-xs font-medium text-[#918EA2] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 text-xs font-semibold bg-[#5A45FF] hover:bg-[#5A45FF]/90 text-white rounded-xl transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
