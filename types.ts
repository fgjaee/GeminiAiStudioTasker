// types.ts
export type ID = string;

// --- Phase 1: Core Data Models ---
export type Member = {
  id: ID;
  name: string;
  title?: string;
  role_tags: string[];
  strengths: string[];
  fixed_commitments_minutes: number; // e.g., for administrative tasks, meetings
  default_tasks: ID[]; // IDs of tasks always assigned to this member
  // Phase B Additions: Planner
  max_daily_minutes?: number; // Max minutes per day this member can be scheduled
  max_weekly_minutes?: number; // Max minutes per week this member can be scheduled
  shift_class_preference?: ShiftClass[]; // Preferred shift classes
  availability?: { id: ID; day: string; start: string; end: string }[]; // Specific availability windows
};

export type TaskType = 'standard' | 'upkeep' | 'project';
export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'one-time';

export type Task = {
  id: ID;
  code: string; // Phase 2: Short code, unique, case-insensitive
  name: string;
  description?: string;
  areaId?: ID; // Phase 2: Optional grouping by area
  skill_required: string[]; // e.g., ['Ordering', 'Lifting']
  estimated_duration: number; // in minutes
  task_type: TaskType;
  priority_weight: number; // 1-100, lower is higher priority
  allow_multi_assign: boolean; // Can multiple members be assigned to this task?
  earliest_start: string; // HH:mm
  due_by: string; // HH:mm or 'EOD'
  recurrence_type: RecurrenceType;
  recurrence_detail?: string; // e.g., 'Monday', 'Last Sunday' - for weekly/monthly tasks
  is_must_run?: boolean; // Phase 3: If true, assignment engine must assign this
  min_coverage?: number; // Phase 3: Minimum number of members required
};

export type PrimarySelector = {
  id: ID;
  mode: 'member' | 'tag'; // 'member' for specific member ID, 'tag' for role_tag/skill
  value: string; // Member ID or tag string
};

export type ExplicitRule = {
  id: ID;
  taskId: ID;
  primary_selector: PrimarySelector;
  fallback_selectors?: PrimarySelector[]; // Ordered list of fallbacks
  exclude_day?: string[]; // e.g., ['Saturday', 'Sunday']
  max_per_member_per_day?: number | null; // Max times a specific member can be assigned this task per day
  prefer_shift_class?: ShiftClass; // e.g., 'Opening', 'Closing' - to prefer members on certain shifts
  earliest_start?: string; // Overrides task default
  due_by?: string; // Overrides task default
  reason_template?: string; // Handlebars template for explanation
};

export type ScheduleShift = {
  id: ID;
  memberId: ID;
  start: string; // HH:mm
  end: string; // HH:mm
  shift_class?: ShiftClass; // e.g., 'Opening', 'Mid-Shift', 'Closing'
};

export type WeeklyScheduleDay = {
  id: ID;
  date: string; // YYYY-MM-DD
  shifts: ScheduleShift[];
  flags?: {
    source?: string; // 'pdf_upload', 'manual_entry', 'planner'
    timestamp?: string;
    checksum?: string; // For PDF uploads
    createdManually?: boolean;
  };
};

export type AssignmentStatus = 'assigned' | 'unassigned' | 'over-capacity' | 'conflict';

export type Assignment = {
  id: ID;
  taskId: ID;
  memberId: ID;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm (assigned start)
  endTime: string; // HH:mm (assigned end)
  duration: number; // in minutes
  reason: string; // Explanation of why assigned
  locked: boolean; // If true, generator won't change it
  status: AssignmentStatus; // Current status (e.g., assigned, over-capacity)
};

export type DailyWorkload = {
  date: string;
  memberId: ID;
  capacity: number; // Total available work minutes for the member (shift - fixed_commitments)
  totalDuration: number; // Sum of assigned task durations (excluding upkeep)
  upkeepDuration: number; // Sum of upkeep task durations
  assignedTasks: Assignment[];
  unassignedTaskIds: ID[]; // List of tasks assigned to this member that couldn't fit
};

export type Template = {
  id: ID;
  name: string;
  content: string; // Handlebars template for reports
};

export type ManagerSettings = {
  id: ID;
  floorSlaTime: number; // Total minutes available for all tasks (e.g., 480 mins for 8 hours)
  tieBreakSeed: number; // For deterministic assignment results
  overCapacityThreshold: number; // Minutes over capacity before warning
  assignmentStartTime: string; // HH:mm, default start time for assignments if not specified by task/rule
  // Phase 2: Planner specific settings
  plannerSeed?: number; // Seed for deterministic planner auto-fill
  defaultPlanningPeriod?: number; // Default number of days for planner view
  defaultSlotDuration?: number; // Default slot duration in minutes for timeline
};

export type Area = {
  id: ID;
  name: string;
  group_name?: string; // e.g., 'Dry Tables', 'Walls'
  position: number; // For UI ordering
};

export type OrderSetScope = 'global' | 'weekday' | 'scenario';
export type OrderSet = {
  id: ID;
  name: string;
  scope: OrderSetScope;
  weekday?: string; // e.g., 'Monday' if scope is 'weekday'
  overstock?: boolean; // True if scope is 'scenario' and applies when overstock
  truck_late?: boolean; // True if scope is 'scenario' and applies when truck is late
  created_at: string;
};

export type OrderSetItem = {
  id: ID; // Must have an ID for mock db operations and React keys
  order_set_id: ID;
  task_id: ID;
  position: number;
};

// --- PDF Parser Mock Specific Types ---
export type ParsedScheduleShift = {
  id: ID;
  memberName: string;
  memberId?: ID; // Resolved member ID
  day: 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';
  start: string; // 'HH:MM' 24h
  end: string; // 'HH:MM' 24h
  role?: string; // Role text from PDF
  shift_class?: ShiftClass; // Inferred from shift times or PDF content
  confidence?: number; // How confident the parser is
  rawText?: string; // Raw text line from PDF
};

export type ParsedScheduleData = {
  date: string; // YYYY-MM-DD, the start date of the week parsed
  shifts: ParsedScheduleShift[];
  flags?: {
    source: string;
    timestamp: string;
    checksum: string;
  };
  diagnostics?: {
    rowsParsed: number;
    shiftsCreated: number;
    membersResolved: number;
    membersCreated: number;
    rowsDiscarded: number;
    reason?: string;
  };
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
  | 'areas' // Phase 2: Planner
  | 'order_sets' // Phase 2: Order Sets
  | 'order_set_items' // Phase 2: Order Sets
  | 'staffing_targets' // Phase B: Planner
  | 'availability' // Phase B: Planner
  | 'shift_templates' // Phase B: Planner
  | 'planned_shifts'; // Phase B: Planner


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
  staffing_targets: StaffingTarget[];
  availability: Availability[];
  shift_templates: ShiftTemplate[];
  planned_shifts: PlannedShift[];
};

// --- Old Backup Data Structure (for importer) ---
export type OldMember = {
  id: ID;
  name: string;
  role?: string;
  skills?: string[];
};

export type OldTask = {
  id: ID;
  name: string;
  skillRequired: string | string[]; // Can be string or string[]
  deadline: string;
  estimatedDuration: number;
  isExclusive: boolean; // Invert to allow_multi_assign
  taskType: string;
  recurrenceType: string;
  recurrenceDetail?: string;
  order: number;
};

export type OldExplicitRule = {
  taskId?: ID; // Sometimes missing, need to link by name
  taskName: string;
  primaryMemberId?: ID;
  skillRequired?: string; // For tag-based primary
  typeLabel?: string; // Can be used for reason_template
  excludeDay?: string; // Single string, needs to be array
  fallbacks?: ID[]; // Array of member IDs
};

export type OldBackupData = {
  members: OldMember[];
  dailyTasks: OldTask[];
  schedule: Record<string, any>; // Not used directly, but part of structure
  allSkills: string[]; // Not used directly
  preferredAssignments: Record<string, any>; // Not used directly
  explicitRules: OldExplicitRule[];
  timestamp: string;
};

// --- Toast and Modal types ---
export type ToastData = {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
};

// --- Phase B: Planner Types ---
export type ShiftClass = 'Opening' | 'Mid-Shift' | 'Closing' | 'Overnight' | 'Weekend' | 'General';

export type StaffingTarget = {
  id: ID;
  day: string; // 'Mon', 'Tue', etc.
  area_id: ID;
  start: string; // HH:mm, 30-min slot start
  end: string; // HH:mm, 30-min slot end
  required_count: number; // Number of members required
};

export type Availability = {
  id: ID;
  member_id: ID;
  day: string; // 'Mon', 'Tue', etc.
  start: string; // HH:mm
  end: string; // HH:mm
};

export type ShiftTemplate = {
  id: ID;
  name: string;
  start: string; // HH:mm
  end: string; // HH:mm
  role_tags?: string[]; // Preferred role tags for this template
  shift_class?: ShiftClass; // Associated shift class
};

export type PlannedShiftStatus = 'draft' | 'published' | 'conflict';
export type PlannedShiftSource = 'planner' | 'template' | 'manual' | 'autofill';

export type PlannedShift = {
  id: ID;
  member_id: ID;
  day: string; // 'Mon', 'Tue', etc.
  date: string; // YYYY-MM-DD for specific instance
  start: string; // HH:mm
  end: string; // HH:mm
  area_id?: ID; // Planned area of work
  source: PlannedShiftSource;
  status: PlannedShiftStatus;
  reason?: string; // Explanation for auto-generated shifts
  confidence?: number; // For AI-generated parts
};

export type PlannerConflict = {
  id: ID;
  type: 'under-coverage' | 'over-coverage' | 'availability-violation' | 'overtime-risk' | 'break-violation';
  day: string; // Mon, Tue, etc.
  date?: string; // YYYY-MM-DD
  area_id?: ID;
  timeslot?: string; // HH:mm
  member_id?: ID;
  details: string;
  severity: 'low' | 'medium' | 'high';
  suggestedFix?: string[]; // e.g., ['Add shift for m1 at 08:00', 'Reduce shift for m2']
};

export type PlanningAssistantResponse = {
  suggestions: string; // Natural language suggestions
  // More structured suggestions could go here
};