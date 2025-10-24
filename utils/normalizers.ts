// utils/normalizers.ts
import {
  Member,
  Task,
  ExplicitRule,
  WeeklyScheduleDay,
  Assignment,
  ManagerSettings,
  Template,
  Area,
  OrderSet,
  OrderSetItem,
} from '../types';
import { uuid } from './helpers';

// These normalizers are simple identity functions for the mock,
// but in a real app, they might validate data, add missing UUIDs,
// or ensure schema compliance.

export const normalizeMembers = (members: Member[]): Member[] => {
  return members.map(m => ({
    ...m,
    id: m.id || uuid(),
    role_tags: m.role_tags || [],
    strengths: m.strengths || [],
    fixed_commitments_minutes: m.fixed_commitments_minutes || 0,
    default_tasks: m.default_tasks || [],
  }));
};

export const normalizeTasks = (tasks: Task[]): Task[] => {
  return tasks.map(t => ({
    ...t,
    id: t.id || uuid(),
    skill_required: t.skill_required || [],
    priority_weight: t.priority_weight || 50,
    earliest_start: t.earliest_start || '07:00',
    due_by: t.due_by || '17:00',
    estimated_duration: t.estimated_duration || 30,
    recurrence_type: t.recurrence_type || 'daily',
    task_type: t.task_type || 'standard',
    allow_multi_assign: t.allow_multi_assign === undefined ? true : t.allow_multi_assign,
  }));
};

export const normalizeRules = (rules: ExplicitRule[]): ExplicitRule[] => {
  return rules.map(r => ({
    ...r,
    id: r.id || uuid(),
    primary_selector: {
      ...r.primary_selector,
      id: r.primary_selector.id || uuid(),
      mode: r.primary_selector.mode || 'tag',
      value: r.primary_selector.value || '',
    },
    fallback_selectors: r.fallback_selectors?.map(fs => ({
      ...fs,
      id: fs.id || uuid(),
      mode: fs.mode || 'tag',
      value: fs.value || '',
    })) || [],
    exclude_day: r.exclude_day || [],
    reason_template: r.reason_template || 'Assigned automatically by rule.',
  }));
};

export const normalizeWeeklySchedule = (schedule: WeeklyScheduleDay[]): WeeklyScheduleDay[] => {
  return schedule.map(s => ({
    ...s,
    id: s.id || uuid(),
    shifts: s.shifts?.map(shift => ({
      ...shift,
      id: shift.id || uuid(),
    })) || [],
    flags: s.flags || {},
  }));
};

export const normalizeAssignments = (assignments: Assignment[]): Assignment[] => {
  return assignments.map(a => ({
    ...a,
    id: a.id || uuid(),
    status: a.status || 'assigned',
    locked: a.locked || false,
  }));
};

export const normalizeTemplates = (templates: Template[]): Template[] => {
  return templates.map(t => ({
    ...t,
    id: t.id || uuid(),
  }));
};

export const normalizeManagerSettings = (settings: ManagerSettings[]): ManagerSettings[] => {
  if (settings.length === 0) {
    // Provide a default setting if none exist
    return [{
      id: uuid(),
      floorSlaTime: 240, // default 4 hours
      tieBreakSeed: 12345,
      overCapacityThreshold: 30, // default 30 minutes
      assignmentStartTime: '07:00',
    }];
  }
  return settings.map(s => ({
    ...s,
    id: s.id || uuid(),
  }));
};

export const normalizeAreas = (areas: Area[]): Area[] => {
  return areas.map(a => ({
    ...a,
    id: a.id || uuid(),
  }));
};

export const normalizeOrderSets = (orderSets: OrderSet[]): OrderSet[] => {
  return orderSets.map(os => ({
    ...os,
    id: os.id || uuid(),
  }));
};

export const normalizeOrderSetItems = (orderSetItems: OrderSetItem[]): OrderSetItem[] => {
  return orderSetItems.map(osi => ({
    ...osi,
    id: osi.id || uuid(),
  }));
};
