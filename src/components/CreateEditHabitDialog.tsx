"use client";

import React, { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { format } from "date-fns";
import { X, Flame, Target, CheckCircle2, Clock, Calendar } from "lucide-react";
import { Habit, HabitType, HabitRepeatType, NotePrompt, ToneOption } from "@/types";
import { TonePicker } from "./TonePicker";

interface CreateEditHabitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habitToEdit?: Habit | null;
  recentTones: ToneOption[];
  onSave: (habitData: Partial<Habit>) => Promise<void>;
}

const WEEKDAYS = [
  { label: "M", val: 1 },
  { label: "T", val: 2 },
  { label: "W", val: 3 },
  { label: "T", val: 4 },
  { label: "F", val: 5 },
  { label: "S", val: 6 },
  { label: "S", val: 7 },
];

export function CreateEditHabitDialog({
  open,
  onOpenChange,
  habitToEdit,
  recentTones,
  onSave,
}: CreateEditHabitDialogProps) {
  const isEditing = !!habitToEdit;

  const [title, setTitle] = useState("");
  const [type, setType] = useState<HabitType>("YES_NO");
  const [targetValue, setTargetValue] = useState(1);
  const [targetUnit, setTargetUnit] = useState("");
  const [repeatType, setRepeatType] = useState<HabitRepeatType>("EVERYDAY");
  const [repeatDays, setRepeatDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [weeklyTargetCount, setWeeklyTargetCount] = useState(3);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("09:00");
  const [selectedTone, setSelectedTone] = useState<ToneOption>({
    title: "Default Alarm Tone",
    uri: null,
  });
  const [notePrompt, setNotePrompt] = useState<NotePrompt>("BOTH");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (habitToEdit) {
        setTitle(habitToEdit.title);
        setType(habitToEdit.type);
        setTargetValue(habitToEdit.targetValue);
        setTargetUnit(habitToEdit.targetUnit);
        setRepeatType(habitToEdit.repeatType);
        setRepeatDays(habitToEdit.repeatDays);
        setWeeklyTargetCount(habitToEdit.weeklyTargetCount);
        setReminderEnabled(habitToEdit.reminderEnabled);
        setReminderTime(habitToEdit.reminderTime || "09:00");
        setSelectedTone({
          title: habitToEdit.reminderToneTitle || "Default Alarm Tone",
          uri: habitToEdit.reminderToneUri,
        });
        setNotePrompt(habitToEdit.notePrompt);
        setStartDate(habitToEdit.startDate);
      } else {
        setTitle("");
        setType("YES_NO");
        setTargetValue(1);
        setTargetUnit("");
        setRepeatType("EVERYDAY");
        setRepeatDays([1, 2, 3, 4, 5, 6, 7]);
        setWeeklyTargetCount(3);
        setReminderEnabled(false);
        setReminderTime("09:00");
        setSelectedTone(recentTones[0] || { title: "Default Alarm Tone", uri: null });
        setNotePrompt("BOTH");
        setStartDate(format(new Date(), "yyyy-MM-dd"));
      }
    }
  }, [open, habitToEdit, recentTones]);

  const toggleDay = (dayVal: number) => {
    setRepeatDays((prev) => {
      if (prev.includes(dayVal)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((d) => d !== dayVal);
      } else {
        return [...prev, dayVal].sort((a, b) => a - b);
      }
    });
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        type,
        targetValue: type === "TARGET" ? Math.max(1, targetValue) : 1,
        targetUnit: type === "TARGET" ? targetUnit.trim() : "",
        repeatType,
        repeatDays: repeatType === "SPECIFIC_DAYS" ? repeatDays : [1, 2, 3, 4, 5, 6, 7],
        weeklyTargetCount: repeatType === "WEEKLY_X" ? weeklyTargetCount : 3,
        reminderEnabled,
        reminderTime: reminderEnabled ? reminderTime : null,
        reminderToneTitle: selectedTone.title,
        reminderToneUri: selectedTone.uri,
        notePrompt,
        startDate,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-in fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#0C0C0F] border border-[#1C1C20] rounded-2xl p-6 shadow-2xl focus:outline-none">
          <div className="flex items-center justify-between pb-4 border-b border-[#1C1C20]">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-[#FFB77D]" />
              <Dialog.Title className="text-base font-bold text-white">
                {isEditing ? "Edit Habit" : "Create New Habit"}
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="p-1.5 rounded-lg text-[#918EA2] hover:text-white hover:bg-[#161619]"
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-4 mt-4">
            {/* Title */}
            <div>
              <label className="text-xs font-semibold text-[#918EA2] block mb-1.5 uppercase tracking-wider">
                Habit Title <span className="text-[#FFB4AB]">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Read 20 pages, Morning Jog, Meditate..."
                className="w-full bg-[#161619] border border-[#474556]/40 focus:border-[#C5C0FF] rounded-xl px-3.5 py-2.5 text-sm text-[#E3E1EC] focus:outline-none"
                autoFocus
              />
            </div>

            {/* Type: Check-in vs Target */}
            <div>
              <label className="text-xs font-semibold text-[#918EA2] block mb-1.5 uppercase tracking-wider">
                Tracking Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType("YES_NO")}
                  className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-colors ${
                    type === "YES_NO"
                      ? "bg-[#5A45FF] border-[#5A45FF] text-white"
                      : "bg-[#161619] border-[#1C1C20] text-[#918EA2] hover:text-white"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Check-in (Done / Missed)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType("TARGET")}
                  className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-colors ${
                    type === "TARGET"
                      ? "bg-[#5A45FF] border-[#5A45FF] text-white"
                      : "bg-[#161619] border-[#1C1C20] text-[#918EA2] hover:text-white"
                  }`}
                >
                  <Target className="w-4 h-4" />
                  <span>Target Value Stepper</span>
                </button>
              </div>
            </div>

            {/* Target Value & Unit (If TARGET) */}
            {type === "TARGET" && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#161619] border border-[#1C1C20]">
                <div>
                  <label className="text-[11px] font-semibold text-[#918EA2] block mb-1">
                    Daily Goal Count
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={targetValue}
                    onChange={(e) => setTargetValue(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-[#111114] border border-[#252529] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#C5C0FF]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-[#918EA2] block mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={targetUnit}
                    onChange={(e) => setTargetUnit(e.target.value)}
                    placeholder="glasses, pages, km"
                    className="w-full bg-[#111114] border border-[#252529] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#C5C0FF]"
                  />
                </div>
              </div>
            )}

            {/* Repeat Type */}
            <div>
              <label className="text-xs font-semibold text-[#918EA2] block mb-1.5 uppercase tracking-wider">
                Schedule Frequency
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "EVERYDAY", label: "Everyday" },
                  { key: "SPECIFIC_DAYS", label: "Specific Days" },
                  { key: "WEEKLY_X", label: "Weekly Goal" },
                ].map((item) => {
                  const isSel = repeatType === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setRepeatType(item.key as HabitRepeatType)}
                      className={`py-2 px-2 rounded-xl text-xs font-semibold border text-center transition-colors ${
                        isSel
                          ? "bg-[#C5C0FF]/15 border-[#C5C0FF] text-[#C5C0FF]"
                          : "bg-[#161619] border-[#1C1C20] text-[#918EA2] hover:text-white"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Specific Days Picker */}
            {repeatType === "SPECIFIC_DAYS" && (
              <div>
                <label className="text-[11px] font-semibold text-[#918EA2] block mb-1.5">
                  Select Scheduled Days
                </label>
                <div className="flex items-center justify-between gap-1">
                  {WEEKDAYS.map((d) => {
                    const isSel = repeatDays.includes(d.val);
                    return (
                      <button
                        key={d.val}
                        type="button"
                        onClick={() => toggleDay(d.val)}
                        className={`w-9 h-9 rounded-full font-bold text-xs transition-all ${
                          isSel
                            ? "bg-[#5A45FF] text-white shadow-md shadow-[#5A45FF]/30"
                            : "bg-[#161619] border border-[#1C1C20] text-[#918EA2]"
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Weekly Target Count Stepper */}
            {repeatType === "WEEKLY_X" && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#161619] border border-[#1C1C20]">
                <span className="text-xs text-[#E3E1EC]">Target days per week:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="7"
                    value={weeklyTargetCount}
                    onChange={(e) =>
                      setWeeklyTargetCount(Math.min(7, Math.max(1, parseInt(e.target.value, 10) || 1)))
                    }
                    className="w-14 bg-[#111114] border border-[#252529] rounded-lg px-2 py-1 text-center font-bold text-sm text-white"
                  />
                  <span className="text-xs text-[#918EA2]">days / wk</span>
                </div>
              </div>
            )}

            {/* Reminder & Tone */}
            <div className="p-3.5 rounded-xl bg-[#161619] border border-[#1C1C20] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#C5C0FF]" />
                  <span className="text-xs font-semibold text-white">Daily Reminder</span>
                </div>
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={(e) => setReminderEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-[#5A45FF] bg-[#111114] border-[#474556]"
                />
              </div>

              {reminderEnabled && (
                <div className="space-y-3 pt-2 border-t border-[#252529]">
                  <div>
                    <label className="text-[11px] text-[#918EA2] block mb-1">Time</label>
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="w-full bg-[#111114] border border-[#252529] rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#918EA2] block mb-1">Reminder Tone</label>
                    <TonePicker
                      selectedToneTitle={selectedTone.title}
                      tones={recentTones}
                      onSelectTone={setSelectedTone}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Note Prompt Option */}
            <div>
              <label className="text-xs font-semibold text-[#918EA2] block mb-1.5 uppercase tracking-wider">
                Prompt for Notes on Action
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { key: "BOTH", label: "Always" },
                  { key: "DONE_ONLY", label: "Done Only" },
                  { key: "MISSED_ONLY", label: "Missed Only" },
                  { key: "NONE", label: "Never" },
                ].map((item) => {
                  const isSel = notePrompt === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setNotePrompt(item.key as NotePrompt)}
                      className={`py-1.5 text-[11px] font-medium rounded-lg border text-center transition-colors ${
                        isSel
                          ? "bg-[#5A45FF] border-[#5A45FF] text-white"
                          : "bg-[#161619] border-[#1C1C20] text-[#918EA2] hover:text-white"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Start Date */}
            <div>
              <label className="text-xs font-semibold text-[#918EA2] block mb-1.5 uppercase tracking-wider">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#161619] border border-[#474556]/40 focus:border-[#C5C0FF] rounded-xl px-3.5 py-2 text-sm text-[#E3E1EC] focus:outline-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#1C1C20]">
            <Dialog.Close asChild>
              <button
                type="button"
                className="px-4 py-2 text-sm text-[#918EA2] hover:text-white"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              disabled={saving || !title.trim()}
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-[#5A45FF] hover:bg-[#5A45FF]/90 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
            >
              {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Habit"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
