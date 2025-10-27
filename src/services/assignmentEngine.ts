
// services/assignmentEngine.ts
import {
  Assignment, DailyWorkload, Member, Task, ExplicitRule, WeeklyScheduleDay,
  ManagerSettings, OrderSetItem, Skill, MemberSkill,
} from '../types';
import { timeToMinutes, minutesToTime, uuid } from './utils';
import dayjs from 'dayjs';

interface AssignmentEngineInput {
  members: Member[];
  tasks: Task[];
  explicitRules: ExplicitRule[];
  weeklySchedule: WeeklyScheduleDay[];
  settings: ManagerSettings;
  targetDate: string;
  orderSetItems: OrderSetItem[];
  skills: Skill[];
  memberSkills: MemberSkill[];
}

interface AssignmentEngineOutput {
  generatedAssignments: Assignment[];
  dailyWorkloads: DailyWorkload[];
  unassignedTasks: (Task & { unassignedReason: string })[];
  overCapacityMembers: { memberId: string; name: string; date: string; overCapacity: number }[];
}

const getMemberCapacity = (member: Member, scheduleDay?: WeeklyScheduleDay): number => {
  if (!scheduleDay) return 0;
  const totalShiftMinutes = scheduleDay.shifts
    .filter(s => s.memberId === member.id)
    .reduce((total, shift) => total + (timeToMinutes(shift.end) - timeToMinutes(shift.start)), 0);
  return Math.max(0, totalShiftMinutes - member.fixed_commitments_minutes);
};

const getTaskScore = (task: Task, setPos: number | undefined): number => {
    const isDueTime = task.due_by && task.due_by !== 'EOD' && task.due_by !== 'Continuous';
    const tCodeMatch = task.code?.match(/[Tt](\d+)/);
    const tNum = tCodeMatch ? parseInt(tCodeMatch[1], 10) : 100; // Penalize non-T tasks
    
    let score = (task.priority_weight || 0);
    score += setPos !== undefined ? (100 - setPos) : 0;
    score += task.is_must_run ? 30 : 0;
    score += isDueTime ? 15 : 0;
    score += Math.max(0, 10 - tNum); // Bonus for low T-numbers
    return score;
};

const getDueRank = (due_by: string) => {
    if (!due_by || due_by === 'Continuous') return 2;
    if (due_by === 'EOD') return 1;
    return 0; // Has a specific time
};

export const generateAssignments = (input: AssignmentEngineInput): AssignmentEngineOutput => {
  const { members, tasks, explicitRules, weeklySchedule, settings, targetDate, orderSetItems, skills, memberSkills } = input;
  const scheduleDay = weeklySchedule.find(d => d.date === targetDate);
  const dayOfWeek = dayjs(targetDate).format('dddd') as any;

  if (!scheduleDay || scheduleDay.shifts.length === 0) {
    const reason = "no_staff_today";
    return {
      generatedAssignments: [], dailyWorkloads: [],
      unassignedTasks: tasks.map(t => ({...t, unassignedReason: reason})),
      overCapacityMembers: [],
    };
  }
  
  const memberMap = new Map(members.map(m => [m.id, m]));
  const memberSkillsMap = new Map<string, Set<string>>();
  memberSkills.forEach(ms => {
      if(!memberSkillsMap.has(ms.member_id)) memberSkillsMap.set(ms.member_id, new Set());
      memberSkillsMap.get(ms.member_id)!.add(ms.skill_id);
  });

  const workloads = new Map<string, DailyWorkload>(members.map(m => [m.id, {
    date: targetDate, memberId: m.id, capacity: getMemberCapacity(m, scheduleDay),
    totalDuration: 0, upkeepDuration: 0, assignedTasks: [], unassignedTaskIds: [],
  }]));

  const scheduledMemberIds = new Set(scheduleDay.shifts.map(s => s.memberId));
  const activeMembers = members.filter(m => scheduledMemberIds.has(m.id));

  const activeSetMap = new Map(orderSetItems.map(item => [item.task_id, item.position]));
  const sortedTasks = tasks
    .sort((a, b) => {
        if (a.is_must_run !== b.is_must_run) return a.is_must_run ? -1 : 1;
        const dueRankA = getDueRank(a.due_by);
        const dueRankB = getDueRank(b.due_by);
        if (dueRankA !== dueRankB) return dueRankA - dueRankB;
        if (dueRankA === 0) return timeToMinutes(a.due_by) - timeToMinutes(b.due_by);
        return getTaskScore(b, activeSetMap.get(b.id)) - getTaskScore(a, activeSetMap.get(a.id));
    });

  const assignments: Assignment[] = [];
  const unassignedWarnings = new Map<string, Set<string>>();

  for (const task of sortedTasks) {
    let assignedCount = 0;
    const minCoverage = task.min_coverage || 1;
    const reasonSet = unassignedWarnings.get(task.id) || new Set<string>();
    unassignedWarnings.set(task.id, reasonSet);
    
    // Check recurrence
    if (task.recurrence_type === 'weekly' && task.recurrence_detail !== dayOfWeek) continue;

    const findEligibleMembers = () => activeMembers
        .filter(m => {
            const memberSkillIds = memberSkillsMap.get(m.id) || new Set();
            if ((task.skill_ids || []).some(sid => !memberSkillIds.has(sid))) {
                reasonSet.add('no_skill');
                return false;
            }
            const workload = workloads.get(m.id)!;
            if (workload.totalDuration + task.estimated_duration > workload.capacity) {
                reasonSet.add('no_capacity');
                return false;
            }
            // Check if already assigned this task if not multi-assign
            if (!task.allow_multi_assign && assignments.some(a => a.taskId === task.id && a.memberId === m.id)) {
                return false;
            }
            return true;
        })
        .sort((a, b) => workloads.get(a.id)!.totalDuration - workloads.get(b.id)!.totalDuration);

    let eligibleMembers = findEligibleMembers();
    
    while (assignedCount < minCoverage && eligibleMembers.length > 0) {
        const member = eligibleMembers.shift();
        if (!member) break;

        const newAssignment: Assignment = {
            id: uuid(), taskId: task.id, memberId: member.id, date: targetDate,
            startTime: task.earliest_start,
            endTime: minutesToTime(timeToMinutes(task.earliest_start) + task.estimated_duration),
            duration: task.estimated_duration, reason: 'Skill and priority matched',
            locked: false, status: 'assigned',
        };
        assignments.push(newAssignment);
        const workload = workloads.get(member.id)!;
        workload.assignedTasks.push(newAssignment);
        if (task.task_type === 'upkeep') workload.upkeepDuration += task.estimated_duration;
        else workload.totalDuration += task.estimated_duration;
        assignedCount++;
    }

    if (assignedCount > 0) unassignedWarnings.delete(task.id);
  }

  const unassignedTasks = Array.from(unassignedWarnings.entries())
    .map(([taskId, reasons]) => ({
      ...tasks.find(t => t.id === taskId)!,
      unassignedReason: Array.from(reasons).join(', ')
    }));
  
  return {
    generatedAssignments: assignments,
    dailyWorkloads: Array.from(workloads.values()),
    unassignedTasks,
    overCapacityMembers: [],
  };
};
