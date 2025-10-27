// utils/normalizers.ts
import { uuid } from './helpers';
import {
  Member, Task, ExplicitRule, WeeklyScheduleDay, Assignment, Template, ManagerSettings,
  Area, OrderSet, OrderSetItem, StaffingTarget, Availability, ShiftTemplate, PlannedShift, PrimarySelector,
  ShiftPattern
} from '../types';

// Generic normalizer to ensure items in an array have an ID.
const normalizeArray = <T extends { id: string }>(items: T[] | undefined): T[] => {
  if (!items) return [];
  return items.map(item => ({
    ...item,
    id: item.id || uuid(),
  }));
};

export const normalizeMembers = (items: Member[]): Member[] => normalizeArray(items).map(m => ({
    ...m,
    availability: (m.availability || []).map(a => ({...a, id: a.id || uuid()}))
}));

export const normalizeTasks = (items: Task[]): Task[] => normalizeArray(items);

const normalizeSelector = (selector: PrimarySelector): PrimarySelector => ({
    ...selector,
    id: selector.id || uuid(),
});

export const normalizeRules = (items: ExplicitRule[]): ExplicitRule[] => normalizeArray(items).map(r => ({
    ...r,
    // FIX: Use 'role_tag' to match the type definition instead of 'tag'.
    primary_selector: r.primary_selector ? normalizeSelector(r.primary_selector) : { id: uuid(), mode: 'role_tag', value: '' },
    fallback_selectors: (r.fallback_selectors || []).map(normalizeSelector),
}));

export const normalizeWeeklySchedule = (items: WeeklyScheduleDay[]): WeeklyScheduleDay[] => normalizeArray(items).map(d => ({
    ...d,
    shifts: (d.shifts || []).map(s => ({...s, id: s.id || uuid()}))
}));

export const normalizeAssignments = (items: Assignment[]): Assignment[] => normalizeArray(items);
export const normalizeTemplates = (items: Template[]): Template[] => normalizeArray(items);
export const normalizeManagerSettings = (items: ManagerSettings[]): ManagerSettings[] => normalizeArray(items);
export const normalizeAreas = (items: Area[]): Area[] => normalizeArray(items);
export const normalizeOrderSets = (items: OrderSet[]): OrderSet[] => normalizeArray(items);
export const normalizeOrderSetItems = (items: OrderSetItem[]): OrderSetItem[] => normalizeArray(items);
export const normalizeStaffingTargets = (items: StaffingTarget[]): StaffingTarget[] => normalizeArray(items);
export const normalizeAvailability = (items: Availability[]): Availability[] => normalizeArray(items);
export const normalizeShiftTemplates = (items: ShiftTemplate[]): ShiftTemplate[] => normalizeArray(items);
export const normalizePlannedShifts = (items: PlannedShift[]): PlannedShift[] => normalizeArray(items);
export const normalizeShiftPatterns = (items: ShiftPattern[]): ShiftPattern[] => normalizeArray(items);