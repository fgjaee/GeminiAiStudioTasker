// services/plannerService.ts
import { PlannerConflict, PlannedShift, WeeklyScheduleDay, Member, Task, Area, StaffingTarget, Availability, ShiftTemplate, ManagerSettings, ScheduleShift, ShiftClass } from "../types";
import { uuid } from "../utils/helpers";
import dayjs from "dayjs";
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

export interface plannerEngineMockInput {
    members: Member[];
    tasks: Task[];
    areas: Area[];
    staffingTargets: StaffingTarget[];
    availability: Availability[];
    shiftTemplates: ShiftTemplate[];
    plannedShifts: PlannedShift[];
    settings: ManagerSettings;
    targetDates: string[];
    currentWeeklySchedule: WeeklyScheduleDay[];
}

export interface plannerEngineMockOutput {
    generatedPlannedShifts: PlannedShift[];
    conflicts: PlannerConflict[];
    suggestions: string;
}

export const autoFillSchedule = async (input: plannerEngineMockInput): Promise<plannerEngineMockOutput> => {
    const { members, staffingTargets, targetDates } = input;
    const generatedPlannedShifts: PlannedShift[] = JSON.parse(JSON.stringify(input.plannedShifts));
    
    const workloadTracker: { [memberId: string]: { daily: { [date: string]: number }, weekly: number } } = {};
    members.forEach(m => {
        workloadTracker[m.id] = { daily: {}, weekly: 0 };
    });
    generatedPlannedShifts.forEach(shift => {
        if (!workloadTracker[shift.member_id]) return;
        const duration = dayjs(shift.end, 'HH:mm').diff(dayjs(shift.start, 'HH:mm'), 'minute');
        workloadTracker[shift.member_id].daily[shift.date] = (workloadTracker[shift.member_id].daily[shift.date] || 0) + duration;
        workloadTracker[shift.member_id].weekly += duration;
    });

    const areaMap = new Map(input.areas.map(a => [a.id, a]));

    for (const date of targetDates) {
        const dayOfWeek = dayjs(date).format('ddd');
        const targetsForDay = staffingTargets.filter(t => t.day === dayOfWeek).sort((a, b) => a.start.localeCompare(b.start));

        for (const target of targetsForDay) {
            const targetStart = dayjs(target.start, 'HH:mm');
            const targetEnd = dayjs(target.end, 'HH:mm');
            const targetDuration = targetEnd.diff(targetStart, 'minute');

            const existingCoverage = generatedPlannedShifts.filter(s => {
                if (s.date !== date || (s.area_id && s.area_id !== target.area_id)) return false;
                const shiftStart = dayjs(s.start, 'HH:mm');
                const shiftEnd = dayjs(s.end, 'HH:mm');
                return shiftStart.isBefore(targetEnd) && shiftEnd.isAfter(targetStart);
            }).length;

            const neededCount = target.required_count - existingCoverage;
            if (neededCount <= 0) continue;

            const eligibleMembers = members.filter(member => {
                const assignedShiftsToday = generatedPlannedShifts.filter(s => s.date === date && s.member_id === member.id);
                if (assignedShiftsToday.some(s => dayjs(s.start, 'HH:mm').isBefore(targetEnd) && dayjs(s.end, 'HH:mm').isAfter(targetStart))) return false;

                const memberAvail = member.availability?.find(a => a.day === dayOfWeek);
                if (!memberAvail || targetStart.isBefore(dayjs(memberAvail.start, 'HH:mm')) || targetEnd.isAfter(dayjs(memberAvail.end, 'HH:mm'))) return false;

                const currentDaily = workloadTracker[member.id].daily[date] || 0;
                const currentWeekly = workloadTracker[member.id].weekly;
                if (member.max_daily_minutes && (currentDaily + targetDuration > member.max_daily_minutes)) return false;
                if (member.max_weekly_minutes && (currentWeekly + targetDuration > member.max_weekly_minutes)) return false;

                return true;
            });

            const scoredMembers = eligibleMembers.map(member => {
                let score = 100;
                const area = areaMap.get(target.area_id);
                
                if (area && member.strengths.includes(area.name)) score += 50;

                let shiftClass: ShiftClass | undefined;
                if (targetStart.hour() < 9) shiftClass = 'Opening';
                else if (targetStart.hour() >= 14) shiftClass = 'Closing';
                else shiftClass = 'Mid-Shift';
                if (dayOfWeek === 'Sat' || dayOfWeek === 'Sun') shiftClass = 'Weekend';

                if (shiftClass && member.shift_class_preference?.includes(shiftClass)) score += 30;
                score -= (workloadTracker[member.id].weekly / 60);

                return { member, score };
            }).sort((a, b) => b.score - a.score);

            const membersToAssign = scoredMembers.slice(0, neededCount).map(sm => sm.member);

            for (const member of membersToAssign) {
                generatedPlannedShifts.push({
                    id: uuid(), member_id: member.id, day: dayOfWeek as PlannedShift['day'], date: date,
                    start: target.start, end: target.end, area_id: target.area_id, source: 'autofill', status: 'draft',
                    reason: `Auto-filled for ${areaMap.get(target.area_id)?.name || 'target'}.`,
                });
                workloadTracker[member.id].daily[date] = (workloadTracker[member.id].daily[date] || 0) + targetDuration;
                workloadTracker[member.id].weekly += targetDuration;
            }
        }
    }

    const conflicts = calculatePlannerConflicts(generatedPlannedShifts, input.staffingTargets, input.members, input.targetDates);

    return {
        generatedPlannedShifts, conflicts,
        suggestions: "Generated a schedule based on targets and preferences."
    };
};

export const calculatePlannerConflicts = (
    plannedShifts: PlannedShift[],
    staffingTargets: StaffingTarget[],
    members: Member[],
    dates: string[]
): PlannerConflict[] => {
    const conflicts: PlannerConflict[] = [];
    const memberMap = new Map(members.map(m => [m.id, m]));

    for (const date of dates) {
        const dayOfWeek = dayjs(date).format('ddd');
        const targetsForDay = staffingTargets.filter(t => t.day === dayOfWeek);
        const shiftsForDay = plannedShifts.filter(ps => ps.date === date);

        for (const target of targetsForDay) {
            const targetStart = dayjs(target.start, 'HH:mm');
            const targetEnd = dayjs(target.end, 'HH:mm');
            const actualCoverage = shiftsForDay.filter(s => {
                if (s.area_id && s.area_id !== target.area_id) return false;
                return dayjs(s.start, 'HH:mm').isBefore(targetEnd) && dayjs(s.end, 'HH:mm').isAfter(targetStart);
            }).length;

            if (actualCoverage < target.required_count) {
                conflicts.push({
                    id: uuid(), type: 'under-coverage', day: dayOfWeek as PlannerConflict['day'], date, area_id: target.area_id,
                    timeslot: `${target.start}-${target.end}`, details: `Needed ${target.required_count}, have ${actualCoverage}.`, severity: 'medium',
                });
            } else if (actualCoverage > target.required_count) {
                conflicts.push({
                    id: uuid(), type: 'over-coverage', day: dayOfWeek as PlannerConflict['day'], date, area_id: target.area_id,
                    timeslot: `${target.start}-${target.end}`, details: `Needed ${target.required_count}, have ${actualCoverage}.`, severity: 'low',
                });
            }
        }
    }

    const workloadTracker: { [memberId: string]: { daily: { [date: string]: number }, weekly: number } } = {};
    members.forEach(m => { workloadTracker[m.id] = { daily: {}, weekly: 0 }; });

    for (const shift of plannedShifts) {
        const member = memberMap.get(shift.member_id);
        if (!member) continue;
        const memberAvail = member.availability?.find(a => a.day === shift.day);
        if (!memberAvail) {
            conflicts.push({
                id: uuid(), type: 'availability-violation', day: shift.day, date: shift.date, member_id: member.id,
                details: `${member.name} has no availability for ${shift.day}.`, severity: 'high',
            });
        } else if (dayjs(shift.start, 'HH:mm').isBefore(dayjs(memberAvail.start, 'HH:mm')) || dayjs(shift.end, 'HH:mm').isAfter(dayjs(memberAvail.end, 'HH:mm'))) {
            conflicts.push({
                id: uuid(), type: 'availability-violation', day: shift.day, date: shift.date, member_id: member.id,
                details: `Shift (${shift.start}-${shift.end}) is outside avail. (${memberAvail.start}-${memberAvail.end}).`, severity: 'high',
            });
        }
        
        const duration = dayjs(shift.end, 'HH:mm').diff(dayjs(shift.start, 'HH:mm'), 'minute');
        if (workloadTracker[member.id]) {
            workloadTracker[member.id].daily[shift.date] = (workloadTracker[member.id].daily[shift.date] || 0) + duration;
            workloadTracker[member.id].weekly += duration;
        }
    }

    for (const member of members) {
        if (member.max_weekly_minutes && workloadTracker[member.id]?.weekly > member.max_weekly_minutes) {
             conflicts.push({ id: uuid(), type: 'overtime-risk', day: 'All', member_id: member.id, details: `${member.name} weekly mins: ${workloadTracker[member.id].weekly}/${member.max_weekly_minutes}.`, severity: 'medium' });
        }
        for (const date of dates) {
             if (member.max_daily_minutes && (workloadTracker[member.id]?.daily[date] || 0) > member.max_daily_minutes) {
                 conflicts.push({ id: uuid(), type: 'overtime-risk', day: dayjs(date).format('ddd') as PlannerConflict['day'], date, member_id: member.id, details: `${member.name} daily mins on ${date}: ${workloadTracker[member.id].daily[date]}/${member.max_daily_minutes}.`, severity: 'medium' });
             }
        }
    }
    return conflicts;
};

export const publishPlannedShiftsMock = (
    plannedShifts: PlannedShift[],
    currentWeeklySchedule: WeeklyScheduleDay[],
    datesToPublish: string[]
): WeeklyScheduleDay[] => {
    const publishedScheduleMap = new Map<string, WeeklyScheduleDay>();
    currentWeeklySchedule.forEach(day => publishedScheduleMap.set(day.date, JSON.parse(JSON.stringify(day))));

    for (const date of datesToPublish) {
        const shiftsForDate = plannedShifts.filter(ps => ps.date === date && ps.status === 'draft');
        if (shiftsForDate.length > 0) {
            const newScheduleShifts: ScheduleShift[] = shiftsForDate.map(ps => ({ id: uuid(), memberId: ps.member_id, start: ps.start, end: ps.end, shift_class: undefined }));
            const day = publishedScheduleMap.get(date);
            if (day) {
                day.shifts = newScheduleShifts;
                day.flags = { ...day.flags, source: 'planner', timestamp: new Date().toISOString() };
            } else {
                publishedScheduleMap.set(date, { id: uuid(), date, shifts: newScheduleShifts, flags: { source: 'planner', timestamp: new Date().toISOString() } });
            }
        }
    }
    return Array.from(publishedScheduleMap.values());
};