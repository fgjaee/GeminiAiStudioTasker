// types.ts
export type ID = string;

// --- Supabase Meta Types ---
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
  shift_patterns: ShiftPattern[];
  skills: Skill[];
  member_skills: MemberSkill[];
  member_aliases: MemberAlias[];
};

export type SupabaseTableName = keyof SupabaseTableData;


// --- New Supabase-aligned Models ---
export type Skill = {
  id: ID;
  name: string;
};

export type MemberSkill = {
  member_id: ID;
  skill_id: ID;
};

export type MemberAlias = {
  id: ID;
  member_id: ID;
  alias: string;
};

// --- Core Data Models ---
export type Member = {
  id: ID;
  name: string;
  title?: string;
  role_tags: string[];
  skill_ids?: ID[]; // Replaces 'strengths' with relation to Skills table
  fixed_commitments_minutes: number;
  default_tasks: ID[];
  max_daily_minutes?: number;
  max_weekly_minutes?: number;
  shift_class_preference?: ShiftClass[];
  availability?: { id: ID; day: string; start: string; end:string }[];
};

export type TaskType = 'standard' | 'upkeep' | 'project';
export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'one-time';

export type Task = {
  id: ID;
  code: string;
  name: string;
  description?: string;
  areaId?: ID;
  skill_ids?: ID[]; // Replaces 'skill_required' with relation to Skills table
  estimated_duration: number;
  task_type: TaskType;
  priority_weight: number;
  allow_multi_assign: boolean;
  earliest_start: string;
  due_by: string; // HH:mm or 'EOD' or 'Continuous'
  recurrence_type: RecurrenceType;
  recurrence_detail?: string;
  is_must_run?: boolean;
  min_coverage?: number;
};

export type PrimarySelector = {
  id: string;
  mode: 'member' | 'skill' | 'role_tag';
  value: string; // Member ID, Skill ID, or role_tag string
};

export type ExplicitRule = {
  id: string;
  task_id: string;
  primary_selector: PrimarySelector;
  fallback_selectors: PrimarySelector[]; // stable ids
  exclude_day?: ('Sun'|'Mon'|'Tue'|'Wed'|'Thu'|'Fri'|'Sat')[];
  prefer_shift_class?: 'Open'|'Mid'|'Close'|'Overnight';
  earliest_start?: string; // HH:MM
  due_by?: string; // HH:MM or 'EOD' or 'Continuous'
  max_per_member_per_day?: number;
  reason_template?: string;
};

export type ScheduleShift = {
  id: ID;
  memberId: ID;
  start: string; // HH:mm
  end: string; // HH:mm
  shift_class?: ShiftClass;
  source?: 'import' | 'manual';
};

export type WeeklyScheduleDay = {
  id: ID;
  date: string; // YYYY-MM-DD
  shifts: ScheduleShift[];
  flags?: Record<string, any>; // For metadata like source
};

export type AssignmentStatus = 'assigned' | 'unassigned' | 'over-capacity' | 'conflict';

export type Assignment = {
  id: ID;
  taskId: ID;
  memberId: ID;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  duration: number; // in minutes
  reason: string;
  locked: boolean;
  status: AssignmentStatus;
};

export type DailyWorkload = {
  date: string;
  memberId: ID;
  capacity: number;
  totalDuration: number;
  upkeepDuration: number;
  assignedTasks: Assignment[];
  unassignedTaskIds: ID[];
};

export type Template = {
  id: ID;
  name: string;
  content: string;
};

export type ManagerSettings = {
  id: ID;
  floorSlaTime: number;
  tieBreakSeed: number;
  overCapacityThreshold: number;
  assignmentStartTime: string;
  plannerSeed?: number;
  defaultPlanningPeriod?: number;
  defaultSlotDuration?: number;
};

export type Area = {
  id: ID;
  name: string;
  group_name?: string;
  position: number;
};

export type OrderSetScope = 'global' | 'weekday' | 'scenario';
export type OrderSet = {
  id: ID;
  name: string;
  scope: OrderSetScope;
  weekday?: string;
  overstock?: boolean;
  truck_late?: boolean;
  created_at: string;
};

export type OrderSetItem = {
  id: ID;
  order_set_id: ID;
  task_id: ID;
  position: number;
};

// --- Importer Types ---
export type ParsedScheduleData = {
  date: string; // YYYY-MM-DD of week start
  shifts: ParsedScheduleShift[];
  flags?: Record<string, any>;
  diagnostics?: {
    rowsParsed?: number;
    shiftsCreated?: number;
    membersResolved?: number;
    membersCreated?: number;
    rowsDiscarded?: number;
    reason?: string;
    parser?: string;
    mode?: string;
    warnings?: string[];
    pagesProcessed?: number;
    columnsDetected?: number;
    textItemCount?: number;
  };
};

export type ParsedScheduleShift = {
  id: string;
  memberName: string;
  member_id?: ID; // Resolved member ID
  day: 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';
  start: string; // 'HH:MM' 24h
  end: string; // 'HH:MM' 24h
  role?: string;
  confidence?: number;
  rawText?: string;
  // FIX: Add optional shift_class property
  shift_class?: ShiftClass;
};

// --- Legacy Types for Importer ---
export type OldTask = {
  id: string;
  name: string;
  skillRequired: string | string[];
  order: number;
  deadline: string;
  estimatedDuration: number;
  recurrenceType?: string;
  taskType?: string;
  isExclusive?: boolean;
};

export type OldExplicitRule = {
  taskName: string;
  taskId?: string; // It's optional in the code
  primaryMemberId?: string;
  skillRequired?: string;
  fallbacks?: string[];
  excludeDay?: string;
  typeLabel?: string;
};

export type OldMember = {
  id: string;
  name: string;
  role?: string;
  skills?: string[];
}

export type OldBackupData = {
  dailyTasks: OldTask[];
  explicitRules: OldExplicitRule[];
  members: OldMember[];
};


// --- Planner Types ---
export type ShiftClass = 'Opening' | 'Mid-Shift' | 'Closing' | 'Overnight' | 'Weekend' | 'General';

export type StaffingTarget = {
  id: ID;
  day: string; // 'Mon', 'Tue', etc.
  area_id: ID;
  start: string;
  end: string;
  required_count: number;
};

export type Availability = {
  id: ID;
  member_id: ID;
  day: string;
  start: string;
  end: string;
};

export type ShiftTemplate = {
  id: ID;
  name: string;
  start: string;
  end: string;
  role_tags?: string[];
  shift_class?: ShiftClass;
};

export type PlannedShiftStatus = 'draft' | 'published' | 'conflict';
export type PlannedShiftSource = 'planner' | 'template' | 'manual' | 'autofill';

export type PlannedShift = {
  id: ID;
  member_id: ID;
  day: 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';
  date: string;
  start: string;
  end: string;
  area_id?: ID;
  source: PlannedShiftSource;
  status: PlannedShiftStatus;
  reason?: string;
  confidence?: number;
};

export type PlannerConflict = {
  id: ID;
  type: 'under-coverage' | 'over-coverage' | 'availability-violation' | 'overtime-risk' | 'break-violation';
  day: string;
  date?: string;
  area_id?: ID;
  timeslot?: string;
  member_id?: ID;
  details: string;
  severity: 'low' | 'medium' | 'high';
  suggestedFix?: string[];
};

export type ShiftPattern = {
  id: ID;
  member_id: ID;
  name: string;
  shifts: {
    day: ParsedScheduleShift['day'];
    start: string;
    end: string;
    area_id?: ID;
  }[];
};