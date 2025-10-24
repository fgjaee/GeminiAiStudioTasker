// types.ts

export type AssignmentStatus = 'assigned' | 'over-capacity' | 'unassigned' | 'conflict';
export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'one-time';
export type TaskType = 'standard' | 'upkeep' | 'project';
export type SelectorMode = 'member' | 'tag';

export interface Member {
  id: string;
  name: string;
  title: string;
  role_tags: string[];
  strengths: string[];
  fixed_commitments_minutes: number;
  default_tasks: string[]; // IDs of tasks this member is usually assigned
}

export interface Area {
  id: string;
  name: string;
}

export interface Task {
  id: string;
  code: string;
  name: string;
  description: string;
  skill_required: string[];
  priority_weight: number; // 1-100, lower is higher priority
  earliest_start: string; // HH:mm
  due_by: string; // HH:mm or 'EOD'
  estimated_duration: number; // in minutes
  recurrence_type: RecurrenceType;
  task_type: TaskType;
  allow_multi_assign: boolean;
  areaId?: string; // Optional foreign key to Area
}

export interface PrimarySelector {
  id: string;
  mode: SelectorMode;
  value: string; // Member ID or Tag value
}

export interface ExplicitRule {
  id: string;
  taskId: string;
  primary_selector: PrimarySelector;
  fallback_selectors?: PrimarySelector[];
  exclude_day?: string[]; // e.g., ['Saturday', 'Sunday']
  max_per_member_per_day?: number | null; // Max times a member can be assigned this task per day by this rule
  prefer_shift_class?: string; // e.g., 'Opening', 'Closing'
  earliest_start?: string; // HH:mm, overrides task default
  due_by?: string; // HH:mm or 'EOD', overrides task default
  reason_template: string; // Handlebars template for assignment reason
}

export interface ScheduleShift {
  id: string;
  memberId: string;
  start: string; // HH:mm
  end: string;   // HH:mm
  shift_class?: string; // e.g., 'Opening', 'Closing', 'Mid-Shift'
}

export interface WeeklyScheduleDay {
  id: string;
  date: string; // YYYY-MM-DD
  shifts: ScheduleShift[];
  flags?: {
    source?: string; // e.g., 'pdf_upload', 'manual'
    timestamp?: string;
    checksum?: string;
    createdManually?: boolean;
    overstock?: boolean; // Future: for scenario-based ordering
    truck_late?: boolean; // Future: for scenario-based ordering
  };
}

export interface ParsedScheduleShift {
  id: string;
  memberId: string;
  memberName: string;
  role: string;
  day: string; // e.g., 'Mon', 'Tue'
  start: string;
  end: string;
  shift_class?: string;
  rawText: string;
  confidence: number;
}

export interface ParsedScheduleData {
  date: string; // YYYY-MM-DD, start of the parsed week
  shifts: ParsedScheduleShift[];
  flags?: {
    source?: string;
    timestamp?: string;
    checksum?: string;
  };
}

export interface Assignment {
  id: string;
  taskId: string;
  memberId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  duration: number; // in minutes
  reason: string;
  locked: boolean; // If true, assignment engine won't touch this
  status: AssignmentStatus;
}

export interface AssignedTaskSummary {
  taskName: string;
  duration: number;
  startTime: string;
  endTime: string;
  reason: string;
  status: AssignmentStatus;
}

export interface DailyWorkload {
  date: string; // YYYY-MM-DD
  memberId: string;
  capacity: number; // Available work minutes (total shift - fixed commitments)
  totalDuration: number; // Sum of assigned non-upkeep task durations
  upkeepDuration: number; // Sum of assigned upkeep task durations
  assignedTasks: Assignment[];
  unassignedTaskIds: string[]; // Tasks that this member _should_ do but couldn't fit
}

export interface ManagerSettings {
  id: string;
  floorSlaTime: number; // e.g., 180 minutes
  tieBreakSeed: number; // For deterministic assignment engine results
  overCapacityThreshold: number; // Minutes over capacity before flagging
  assignmentStartTime: string; // Default HH:mm for tasks without specific start times
}

export interface Template {
  id: string;
  name: string;
  content: string; // Handlebars template string
}

export interface OrderSet {
  id: string;
  name: string;
  scope: 'global' | 'weekday' | 'scenario'; // Global, specific weekday, or specific scenario (e.g., overstock)
  weekday?: string; // e.g., 'Monday' for weekday scope
  overstock?: boolean; // For scenario scope
  truck_late?: boolean; // For scenario scope
  priority: number; // Higher priority order sets override lower ones
}

export interface OrderSetItem {
  id: string;
  order_set_id: string;
  task_id: string;
  position: number; // Order within the set
}

// Data structure for old backup files (prior to SupabaseTableData)
export interface OldTask {
  id: string;
  name: string;
  skillRequired: string | string[]; // Could be single string or array
  order: number;
  deadline: string; // HH:mm or 'EOD'
  estimatedDuration: number;
  recurrenceType?: string; // 'Daily', 'Weekly', etc.
  taskType?: string; // 'Upkeep', 'Standard'
  isExclusive?: boolean; // If true, only one person can do it
}

export interface OldMember {
  id: string;
  name: string;
  role?: string;
  skills?: string[];
}

export interface OldExplicitRule {
  taskName: string; // Deprecated, replaced by taskId
  taskId?: string; // New field
  primaryMemberId?: string;
  skillRequired?: string; // If rule applies to members with this skill
  fallbacks?: string[]; // Member IDs
  excludeDay?: string; // e.g., 'Sunday'
  typeLabel?: string;
}

export interface OldBackupData {
  dailyTasks: OldTask[];
  members: OldMember[];
  explicitRules: OldExplicitRule[];
  // Other old fields might exist but are not used for transformation
}

// Current top-level data structure for Supabase tables
export interface SupabaseTableData {
  members: Member[];
  tasks: Task[];
  explicit_rules: ExplicitRule[];
  weekly_schedule: WeeklyScheduleDay[];
  assignments: Assignment[];
  templates: Template[];
  manager_settings: ManagerSettings[];
  areas: Area[];
  order_sets: OrderSet[];
  order_set_items: OrderSetItem[];
}

// For Live API Blob type
export interface Blob {
  data: string; // base64 encoded string
  mimeType: string;
}
