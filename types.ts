import type { Blob as GenAIBlob } from '@google/genai';

// Re-export GenAIBlob as Blob for convenience within this app's types
export type Blob = GenAIBlob;

// --- Core Data Model Interfaces ---

// Member Type
export type Member = {
  id: string;
  name: string;
  title: string;
  role_tags: string[]; // e.g., 'Opener', 'Closer', 'ProduceLead'
  strengths: string[]; // e.g., 'Ordering', 'Customer Service', 'Stocking'
  fixed_commitments_minutes: number; // e.g., 30 minutes for breaks, check-in
  default_tasks: string[]; // IDs of tasks always assigned to this member (e.g., specific upkeep)
};

// Task Related Types
export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'one-time';
export type TaskType = 'upkeep' | 'standard' | 'project'; // Upkeep doesn't count towards workload

export type Task = {
  id: string;
  code: string; // e.g., 'T1', 'W1', 'INV' - unique case-insensitive identifier
  name: string;
  description: string;
  skill_required: string[]; // e.g., ['Dry Table/Display', 'Lifting']
  priority_weight: number; // 1-100, lower is higher priority
  earliest_start: string; // HH:mm, e.g., '07:00'
  due_by: string; // HH:mm or 'EOD'
  estimated_duration: number; // in minutes
  recurrence_type: RecurrenceType;
  // recurrence_detail?: string; // e.g., 'Monday', 'Last Sunday' for weekly/monthly - Removed as per error analysis
  task_type: TaskType;
  allow_multi_assign: boolean; // Can multiple members be assigned to this task?
  areaId?: string; // Optional foreign key to Area
};

// Phase 2 Additions
export type Area = {
  id: string;
  name: string;
  group_name?: string; // e.g., "Dry Tables", "Walls"
  position: number; // For UI ordering
};

export type OrderSet = {
  id: string;
  name: string;
  scope: 'global' | 'weekday' | 'scenario';
  weekday?: string; // 'Mon', 'Tue', etc. if scope is 'weekday'
  overstock?: boolean; // If scope is 'scenario'
  truck_late?: boolean; // If scope is 'scenario'
  created_at: string;
};

export type OrderSetItem = {
  // Fix: Changed id to be a mandatory string, aligning with normalization and mock database expectations
  id: string; 
  order_set_id: string;
  task_id: string;
  position: number; // 0-indexed order within the set
};

export type TaskAlias = { // Not implemented in current scope, but part of conceptual schema
  task_id: string;
  alias: string; // e.g., "Bananas" for "T4: Banana/Citrus Table"
};


// Schedule Related Types
export type ScheduleShift = {
  id: string;
  memberId: string; // ID of the member
  start: string; // HH:mm 24h
  end: string; // HH:mm 24h
  shift_class?: string; // e.g., 'Opener', 'Closer'
};

export type WeeklyScheduleDay = {
  id: string;
  date: string; // YYYY-MM-DD
  shifts: ScheduleShift[];
  flags?: {
    overstock?: boolean;
    truck_late?: boolean;
    large_load?: boolean;
    source?: string; // e.g., 'pdf_upload', 'manual'
    timestamp?: string;
    checksum?: string; // For PDF deduplication
    createdManually?: boolean;
  };
};

// Parsed Schedule from PDF (intermediate type)
export type ParsedScheduleShift = {
  id: string;
  memberId: string;
  memberName?: string; // Optional for display during review
  role?: string; // Optional for display during review
  day?: string; // 'Mon', 'Tue', etc.
  start: string; // 'HH:MM' 24h
  end: string; // 'HH:MM' 24h
  shift_class?: string;
  rawText?: string; // Original text for debugging/confidence
  confidence?: number; // How confident the parser is (0-1)
};

export type ParsedScheduleData = {
  date: string; // YYYY-MM-DD, the start date of the week for this schedule
  shifts: ParsedScheduleShift[];
  flags?: {
    source?: string;
    timestamp?: string;
    checksum?: string;
  };
};


// Assignment Related Types
export type AssignmentStatus = 'assigned' | 'over-capacity' | 'unassigned' | 'conflict';

export type Assignment = {
  id: string;
  taskId: string;
  memberId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm (assigned start time)
  endTime: string; // HH:mm (assigned end time)
  duration: number; // minutes
  reason: string; // e.g., "Assigned by explicit rule 'DOB Order'"
  locked: boolean; // If true, this assignment persists across re-generations
  status: AssignmentStatus; // Current status of the assignment
};

// Primary selector for Explicit Rules
export type PrimarySelector = {
  id: string; // Unique ID for the selector itself
  mode: 'member' | 'tag'; // 'member' or 'tag'
  value: string; // Member ID or Tag name (e.g., 'opener')
};

// Explicit Rule Type
export type ExplicitRule = {
  id: string;
  taskId: string;
  primary_selector: PrimarySelector; // The primary member/tag this rule applies to
  fallback_selectors?: PrimarySelector[]; // Other members/tags to consider if primary is unavailable
  exclude_day?: string[]; // Array of weekdays to exclude (e.g., ['Sunday', 'Wednesday'])
  max_per_member_per_day?: number | null; // Max times this task can be assigned to one member per day
  prefer_shift_class?: string; // e.g., 'Opener', 'Closer' - prefers members on this shift class
  earliest_start?: string; // HH:mm, overrides task default
  due_by?: string; // HH:mm or 'EOD', overrides task default
  reason_template: string; // Template for the assignment reason
};

// Daily Workload Summary (for assignment engine output)
export type DailyWorkload = {
  date: string; // YYYY-MM-DD
  memberId: string;
  capacity: number; // Total available minutes for work (shift_minutes - fixed_commitments)
  totalDuration: number; // Total assigned task duration (excluding upkeep)
  upkeepDuration: number; // Total upkeep task duration
  assignedTasks: Assignment[];
  unassignedTaskIds: string[]; // IDs of tasks that could not be assigned to this member on this day
};

// --- Application Settings & Templates ---

export type ManagerSettings = {
  id: string;
  floorSlaTime: number; // Total expected time for all tasks on the floor for a day
  tieBreakSeed: number; // Seed for random tie-breaking in assignments
  overCapacityThreshold: number; // Minutes over capacity before warning
  assignmentStartTime: string; // Default HH:mm for tasks without explicit start times
};

export type Template = {
  id: string;
  name: string;
  content: string; // Handlebars template string
};

// --- Supabase Mock Specific Types ---

export type SupabaseTableName =
  | 'members'
  | 'tasks'
  | 'explicit_rules'
  | 'weekly_schedule'
  | 'assignments'
  | 'templates'
  | 'manager_settings'
  | 'areas' // New table
  | 'order_sets' // New table
  | 'order_set_items'; // New table

export type SupabaseTableData = {
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
};

export type SelectResponse<T> = {
  data: T[] | null;
  error: Error | null;
};

export type UpsertResponse<T> = {
  data: T[] | null;
  error: Error | null;
};

export type InvokeResponse<T> = {
  data: T | null;
  error: Error | null;
};

export type UploadResponse = {
  data: { path: string } | null;
  error: Error | null;
};


// Old data types for importer
export type OldMember = { // Assuming a simple member structure
  id: string;
  name: string;
  role?: string;
  skills?: string[]; // Old systems might use different naming
  // ... other old fields
};

export type OldTask = {
  id: string;
  name: string;
  skillRequired: string | string[]; // Can be a string or array in old system
  deadline: string; // e.g., "EOD", "09:00"
  estimatedDuration: number;
  isExclusive: boolean; // boolean
  taskType: string; // "Scheduled", "Upkeep"
  recurrenceType: string; // "Daily", "Weekly", "Monthly"
  recurrenceDetail?: string; // "Wednesday", "Last Sunday"
  order: number; // Used for priority_weight
};

export type OldExplicitRule = {
  taskName: string; // Name of the task
  taskId: string; // ID of the task
  primaryMemberId?: string; // ID of primary member
  skillRequired?: string; // Skill tag for primary selector if no member
  typeLabel?: string; // Descriptive label for the rule
  excludeDay?: string; // Single day string
  fallbacks?: string[]; // Array of fallback member IDs
  // ... other old fields
};

export type OldBackupData = {
  members: OldMember[];
  dailyTasks: OldTask[];
  schedule: Record<string, any[]>; // Not explicitly mapped, just to capture structure
  allSkills: string[];
  preferredAssignments: Record<string, any>;
  explicitRules: OldExplicitRule[];
  timestamp: string;
};