import {
  Member,
  Task,
  ExplicitRule,
  WeeklyScheduleDay,
  Assignment,
  Template,
  ManagerSettings,
  Area,
  OrderSet,
  OrderSetItem,
  RecurrenceType,
  TaskType,
} from '../types';
import { uuid } from './helpers';

// --- Normalizer Functions ---
// These functions ensure data has a stable ID, generating one if missing.

export const normalizeMembers = (members: Member[]): Member[] =>
  members.map(m => (m.id ? m : { ...m, id: uuid() }));

export const normalizeTasks = (tasks: Task[]): Task[] =>
  tasks.map(t => ({
    ...t,
    id: t.id || uuid(),
    code: t.code || (t.name ? t.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 8) : uuid().substring(0, 8).toUpperCase()),
    skill_required: Array.isArray(t.skill_required) ? t.skill_required : (t.skill_required ? [t.skill_required] : []),
    description: t.description || '',
    priority_weight: t.priority_weight || 0,
    earliest_start: t.earliest_start || '00:00',
    due_by: t.due_by || 'EOD',
    estimated_duration: t.estimated_duration || 0,
    recurrence_type: t.recurrence_type || 'daily', // Default
    task_type: t.task_type || 'standard', // Default
    allow_multi_assign: t.allow_multi_assign ?? true, // Default to true if not specified
  }));


export const normalizeRules = (rules: ExplicitRule[]): ExplicitRule[] =>
  rules.map(r => ({
    ...r,
    id: r.id || uuid(),
    primary_selector: r.primary_selector?.id
      ? r.primary_selector
      : { ...r.primary_selector, id: uuid() },
    fallback_selectors: (r.fallback_selectors || []).map(f =>
      f.id ? f : { ...f, id: uuid() }
    ),
    exclude_day: r.exclude_day || [],
    reason_template: r.reason_template || 'Assigned automatically.',
  }));

export const normalizeWeeklySchedule = (schedule: WeeklyScheduleDay[]): WeeklyScheduleDay[] =>
  schedule.map(sd => ({
    ...sd,
    id: sd.id || uuid(),
    shifts: (sd.shifts || []).map(s => ({ ...s, id: s.id || uuid() })),
    flags: sd.flags || {},
  }));

export const normalizeAssignments = (assignments: Assignment[]): Assignment[] =>
  assignments.map(a => ({
    ...a,
    id: a.id || uuid(),
    locked: a.locked ?? false,
    status: a.status || 'assigned',
    reason: a.reason || 'Automatically assigned.',
  }));

export const normalizeTemplates = (templates: Template[]): Template[] =>
  templates.map(t => ({
    ...t,
    id: t.id || uuid(),
    content: t.content || '',
  }));

export const normalizeManagerSettings = (settings: ManagerSettings[]): ManagerSettings[] => {
  if (settings.length === 0) {
    // Return a default settings object if none exist
    return [{
      id: uuid(), // Ensure a unique ID for the default settings
      floorSlaTime: 480,
      tieBreakSeed: 42,
      overCapacityThreshold: 60,
      assignmentStartTime: '07:00',
    }];
  }
  return settings.map(s => ({
    ...s,
    id: s.id || uuid(),
    floorSlaTime: s.floorSlaTime || 480,
    tieBreakSeed: s.tieBreakSeed || 42,
    overCapacityThreshold: s.overCapacityThreshold || 60,
    assignmentStartTime: s.assignmentStartTime || '07:00',
  }));
};

export const normalizeAreas = (areas: Area[]): Area[] =>
  areas.map(a => ({
    ...a,
    id: a.id || uuid(),
    position: a.position || 0,
  }));

export const normalizeOrderSets = (orderSets: OrderSet[]): OrderSet[] =>
  orderSets.map(os => ({
    ...os,
    id: os.id || uuid(),
    created_at: os.created_at || new Date().toISOString(),
    scope: os.scope || 'global',
  }));

export const normalizeOrderSetItems = (orderSetItems: OrderSetItem[]): OrderSetItem[] =>
  orderSetItems.map(osi => ({
    ...osi,
    // Fix: Add id and generate if missing for compatibility with generic upsert
    // This now directly assigns a string ID, aligning with the OrderSetItem type being id: string.
    id: osi.id || uuid(), 
    position: osi.position || 0,
  }));