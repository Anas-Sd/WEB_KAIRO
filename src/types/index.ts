export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type TaskSection = 'SNOOZED' | 'OVERDUE' | 'TODAY' | 'TOMORROW' | 'UPCOMING' | 'COMPLETED';

export type RepeatType =
  | 'NONE'
  | 'DAYS'
  | 'DATES'
  | 'BOTH'
  | 'MONTHLY_DATES'
  | 'BOTH_MONTHLY'
  | null;

export interface Task {
  id: string;                    // UUID
  title: string;                 // Required, non-blank
  notes: string | null;
  priority: Priority;
  dueDate: string;               // "Today", "Tomorrow", "Oct 23", etc.
  dueDateMillis: number | null;  // Epoch ms
  dueTime: string | null;        // "HH:mm" 24h
  location: string | null;       // Display-only on web
  attachmentName: string | null;
  attachmentUri: string | null;
  isCompleted: boolean;
  section: 'OVERDUE' | 'TODAY' | 'UPCOMING' | 'COMPLETED';
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
  alarmToneUri: string | null;   // Stored for phone to use
  alarmToneTitle: string | null;
  repeatType: RepeatType;        // NONE/DAYS/DATES/BOTH/MONTHLY_DATES/BOTH_MONTHLY
  repeatDays: string | null;     // "MON,WED,FRI"
  repeatDates: string | null;    // "Oct 5, Oct 12"
  parentId: string | null;       // Subtask hierarchy
  position: number;
  latitude: number | null;       // Display-only on web
  longitude: number | null;
  locationRadius: number;        // Default: 500
  snoozeUntilMillis: number | null;
  userCode?: string | null;
}

export interface TaskDto {
  id: string;
  user_code?: string | null;
  title: string;
  notes?: string | null;
  priority?: string;
  due_date?: string;
  due_date_millis?: number | null;
  due_time?: string | null;
  location?: string | null;
  attachment_name?: string | null;
  attachment_uri?: string | null;
  is_completed?: boolean;
  section?: string;
  created_at?: number;
  updated_at?: number;
  completed_at?: number | null;
  alarm_tone_uri?: string | null;
  alarm_tone_title?: string | null;
  repeat_type?: string | null;
  repeat_days?: string | null;
  repeat_dates?: string | null;
  parent_id?: string | null;
  position?: number;
  latitude?: number | null;
  longitude?: number | null;
  radius_meters?: number | null;
  snooze_until_millis?: number | null;
}

export interface TaskList {
  id: string;
  userCode: string;
  name: string;
  iconName: string;     // "list", "shopping", "emoji:🛒"
  position: number;
  createdAt: number;
  updatedAt: number;
}

export interface TaskListDto {
  id: string;
  user_code: string;
  name: string;
  icon_name: string;
  position: number;
  created_at: number;
  updated_at: number;
}

export interface ListItem {
  id: string;
  userCode: string;
  listId: string;          // FK to TaskList
  parentId: string | null; // Nested hierarchy
  title: string;
  iconName: string;
  notes: string | null;
  targetDate: string | null;
  targetDateMillis: number | null;
  isCompleted: boolean;
  position: number;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface ListItemDto {
  id: string;
  user_code: string;
  list_id: string;
  parent_id?: string | null;
  title: string;
  icon_name?: string;
  notes?: string | null;
  target_date?: string | null;
  target_date_millis?: number | null;
  is_completed?: boolean;
  position?: number;
  completed_at?: number | null;
  created_at?: number;
  updated_at?: number;
}

export type HabitType = 'YES_NO' | 'TARGET';
export type HabitRepeatType = 'EVERYDAY' | 'SPECIFIC_DAYS' | 'WEEKLY_X';
export type NotePrompt = 'BOTH' | 'DONE_ONLY' | 'MISSED_ONLY' | 'NONE';

export interface Habit {
  id: string;
  userCode: string;
  title: string;
  type: HabitType;
  targetValue: number;      // Goal count (for TARGET)
  targetUnit: string;       // "glasses", "pages", "km"
  repeatType: HabitRepeatType;
  repeatDays: number[];     // 1=Mon..7=Sun
  weeklyTargetCount: number; // For WEEKLY_X
  reminderEnabled: boolean;
  reminderTime: string | null;
  reminderToneUri: string | null;
  reminderToneTitle: string | null;
  position: number;
  notePrompt: NotePrompt;
  startDate: string;        // "YYYY-MM-DD"
  createdAt: number;
  updatedAt: number;
}

export interface HabitDto {
  id: string;
  user_code: string;
  title: string;
  type: string;
  target_value: number;
  target_unit: string;
  repeat_type: string;
  repeat_days: string;      // e.g. "1,2,3,4,5,6,7"
  weekly_target_count: number;
  reminder_enabled: boolean;
  reminder_time: string | null;
  reminder_tone_uri: string | null;
  reminder_tone_title: string | null;
  position: number;
  note_prompt: string;
  start_date: string;
  created_at: number;
  updated_at: number;
}

export interface HabitLog {
  id: string;
  habitId: string;
  userCode: string;
  date: string;             // "YYYY-MM-DD"
  state: 'DONE' | 'MISSED';
  value: number | null;     // For TARGET habits
  note: string | null;
  createdAt: number;
}

export interface HabitLogDto {
  id: string;
  habit_id: string;
  user_code: string;
  date: string;
  state: string;
  value: number | null;
  note: string | null;
  created_at: number;
}

export interface AccessCode {
  code: string;
  name: string;
  created_at?: string;
}

export interface UserSession {
  code: string;
  name: string;
}

export interface ToneOption {
  title: string;
  uri: string | null;
}
