import dayjs from 'dayjs';
import seedrandom from 'seedrandom';
import {
  Assignment,
  DailyWorkload,
  Member,
  Task,
  ExplicitRule,
  WeeklyScheduleDay,
  AssignmentStatus,
  ManagerSettings,
  ScheduleShift,
  OrderSet,
  OrderSetItem,
  RecurrenceType,
} from '../types';
// FIX: import `calculateDuration`, `timeToMinutes`, `minutesToTime`, and `uuid` from the correct path.
import { calculateDuration, timeToMinutes, minutesToTime, uuid } from '../utils/helpers';
import { WEEKDAY_NAMES, SHORT_WEEKDAY_NAMES } from '../constants'; // Import WEEKDAY_NAMES

// --- Input Interface for Assignment Engine ---
export interface AssignmentEngineInput {
  members: Member[];
  tasks: Task[];
  explicitRules: ExplicitRule[];
  weeklySchedule: WeeklyScheduleDay[];
  assignments: Assignment[]; // Existing locked assignments
  settings: ManagerSettings;
  targetDate: string; // YYYY-MM-DD for the day to generate assignments
  orderSets: OrderSet[]; // Phase 2: All defined order sets
  orderSetItems: OrderSetItem[]; // Phase 2: All defined order set items
}

// --- Output Interface for Assignment Engine ---
export interface AssignmentEngineOutput {
  generatedAssignments: Assignment[];
  dailyWorkloads: DailyWorkload[];
  unassignedTasks: (Task & { unassignedReason: string })[]; // Tasks that couldn't be assigned
  overCapacityMembers: { memberId: string; name: string; date: string; overCapacity: number }[];
}

/**
 * Helper to get display name for a task (code + name)
 */
export const getTaskDisplayName = (task: Task | undefined): string => {
  if (!task) return 'Unknown Task';
  if (task.code) {
    return `${task.code}: ${task.name}`;
  }
  return task.name;
};

/**
 * Calculates member capacity for a given day.
 */
const getMemberCapacityForDay = (
  member: Member,
  scheduleDay: WeeklyScheduleDay | undefined,
): { totalShiftMinutes: number; availableWorkMinutes: number } => {
  let totalShiftMinutes = 0;
  if (scheduleDay) {
    scheduleDay.shifts
      .filter(s => s.memberId === member.id)
      .forEach(shift => {
        totalShiftMinutes += calculateDuration(shift.start, shift.end);
      });
  }

  const availableWorkMinutes = totalShiftMinutes - (member.fixed_commitments_minutes || 0);
  return { totalShiftMinutes, availableWorkMinutes: Math.max(0, availableWorkMinutes) };
};

// --- Phase 3: Priority Scoring and Task Ordering ---

const priorityScore = (task: Task, activePos: number | null, startTime: string): number => {
    const dueByTime = task.due_by && task.due_by.includes(':') ? timeToMinutes(task.due_by) : Infinity;
    const startTimeMinutes = timeToMinutes(startTime);
    
    const isDueSoon = dueByTime !== Infinity && dueByTime <= startTimeMinutes + 180;

    const tCodeMatch = task.code?.match(/^T(\d+)/i);
    const tNumBonus = tCodeMatch ? Math.max(0, 10 - parseInt(tCodeMatch[1], 10)) : 0;
    
    const base = activePos !== null ? Math.max(0, 100 - activePos) : 0;
    
    return base + (task.priority_weight || 0) + (task.is_must_run ? 30 : 0) + (isDueSoon ? 15 : 0) + tNumBonus;
};

const buildOrderedTasks = (
    tasks: Task[], 
    explicitRules: ExplicitRule[],
    activeOrderSetItems: OrderSetItem[], 
    dayOfWeek: 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat',
    startTime: string
): Task[] => {
    const activeSetMap = new Map(activeOrderSetItems.map((item, index) => [item.task_id, item.position]));
    const ruleExclusionsByDay = new Map<string, Set<string>>();
    explicitRules.forEach(rule => {
        if (rule.exclude_day?.includes(dayOfWeek)) {
            if (!ruleExclusionsByDay.has(rule.task_id)) {
                ruleExclusionsByDay.set(rule.task_id, new Set());
            }
            ruleExclusionsByDay.get(rule.task_id)!.add(dayOfWeek);
        }
    });

    return tasks
        .filter(t => {
            // Filter by recurrence, day, and explicit rule exclusions
            const isExcluded = ruleExclusionsByDay.get(t.id)?.has(dayOfWeek);
            if (isExcluded) return false;

            switch (t.recurrence_type) {
                case 'daily': return true;
                case 'weekly': return t.recurrence_detail === dayOfWeek;
                default: return false; // Simplified for now
            }
        })
        .map(t => ({
            task: t,
            pos: activeSetMap.get(t.id) ?? null,
            score: priorityScore(t, activeSetMap.get(t.id) ?? null, startTime),
        }))
        .sort((a, b) => {
            const A = a.task, B = b.task;
            // 1. Must Run first
            if ((A.is_must_run ?? false) !== (B.is_must_run ?? false)) return (B.is_must_run ? 1 : 0) - (A.is_must_run ? 1 : 0);
            
            // 2. Due by time
            const rankA = A.due_by && A.due_by.includes(':') ? 0 : (A.due_by === 'EOD' ? 1 : 2);
            const rankB = B.due_by && B.due_by.includes(':') ? 0 : (B.due_by === 'EOD' ? 1 : 2);
            if (rankA !== rankB) return rankA - rankB;
            if (rankA === 0 && B.due_by && A.due_by) {
                const timeDiff = timeToMinutes(A.due_by) - timeToMinutes(B.due_by);
                if (timeDiff !== 0) return timeDiff;
            }

            // 3. Priority Score
            if (b.score !== a.score) return b.score - a.score;
            
            // 4. Tie-breakers
            const codeCompare = (A.code || '').localeCompare(B.code || '');
            if (codeCompare !== 0) return codeCompare;
            return (A.name || '').localeCompare(B.name || '');
        })
        .map(x => x.task);
};


/**
 * The core assignment engine.
 * Iterates through tasks and assigns them to members based on rules, skills, and availability.
 */
export const generateAssignmentsMock = (input: AssignmentEngineInput): AssignmentEngineOutput => {
  const {
    members,
    tasks,
    explicitRules,
    weeklySchedule,
    assignments: existingAssignments,
    settings,
    targetDate,
    orderSets,
    orderSetItems,
  } = input;

  console.log(`--- Assignment Engine Started for ${targetDate} ---`);

  const rng = seedrandom(`${settings.tieBreakSeed}-${targetDate}`);
  const currentDayOfWeekFull = dayjs(targetDate).format('dddd');
  // FIX: Use short day name for consistency with rules and recurrence data.
  const currentDayOfWeekShort = dayjs(targetDate).format('ddd') as 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';
  const scheduleDay = weeklySchedule.find(sd => sd.date === targetDate);

  // PASS 0: Validate schedule
  if (!scheduleDay || scheduleDay.shifts.length === 0) {
    console.warn(`[Pass 0] No scheduled members for ${targetDate}. Generator paused.`);
    const unassignedReason = "no_staff_today";
    return {
      generatedAssignments: [],
      dailyWorkloads: [],
      unassignedTasks: tasks.map(t => ({ ...t, unassignedReason })),
      overCapacityMembers: [],
    };
  }

  const memberMap = new Map<string, Member>(members.map(m => [m.id, m]));
  const taskMap = new Map<string, Task>(tasks.map(t => [t.id, t]));

  const dailyWorkloads = new Map<string, DailyWorkload>();
  members.forEach(member => {
    const { availableWorkMinutes } = getMemberCapacityForDay(member, scheduleDay);
    dailyWorkloads.set(member.id, {
      date: targetDate, memberId: member.id, capacity: availableWorkMinutes,
      totalDuration: 0, upkeepDuration: 0, assignedTasks: [], unassignedTaskIds: [],
    });
  });

  let allAssignments: Assignment[] = [];
  const unassignedTasksMap = new Map<string, { task: Task, reasons: Set<string> }>();

  // Process Locked Assignments
  const lockedAssignmentsForDay = existingAssignments.filter(a => a.locked && a.date === targetDate);
  lockedAssignmentsForDay.forEach(locked => {
    allAssignments.push(locked);
    const workload = dailyWorkloads.get(locked.memberId);
    if (workload) {
      const task = taskMap.get(locked.taskId);
      if (task?.task_type === 'upkeep') {
        workload.upkeepDuration += locked.duration;
      } else {
        workload.totalDuration += locked.duration;
      }
    }
  });
  const assignedTaskIds = new Set(allAssignments.map(a => a.taskId));

  // Determine active Order Set and build ordered task list
  const activeOrderSet = orderSets.find(os => os.scope === 'global' || (os.scope === 'weekday' && os.weekday === currentDayOfWeekFull));
  const activeOrderSetItems = activeOrderSet ? orderSetItems.filter(i => i.order_set_id === activeOrderSet.id) : [];
  
  const orderedTasks = buildOrderedTasks(tasks, explicitRules, activeOrderSetItems, currentDayOfWeekShort, settings.assignmentStartTime)
    .filter(t => !assignedTaskIds.has(t.id));

  // Main Assignment Loop (combines passes 1, 2, 3)
  for (const task of orderedTasks) {
    if (assignedTaskIds.has(task.id)) continue;

    let assigned = false;
    
    const taskDuration = task.estimated_duration || 0;
    // FIX: Rename taskId to task_id to match type definition
    const rule = explicitRules.find(r => r.task_id === task.id && !r.exclude_day?.includes(currentDayOfWeekShort));

    if (!unassignedTasksMap.has(task.id)) {
        unassignedTasksMap.set(task.id, { task, reasons: new Set() });
    }
    const unassignedReasons = unassignedTasksMap.get(task.id)!.reasons;

    // General assignment logic
    const eligibleMembers = members.filter(member => {
      const workload = dailyWorkloads.get(member.id);
      if (!workload || workload.capacity <= 0) return false;
      // FIX: Use skill_ids instead of skill_required and strengths
      const memberSkillSet = new Set(member.skill_ids || []);
      if ((task.skill_ids || []).some(skillId => !memberSkillSet.has(skillId))) {
          unassignedReasons.add('no_skill');
          return false;
      }
      if (task.task_type !== 'upkeep' && (workload.totalDuration + taskDuration > workload.capacity + settings.overCapacityThreshold)) {
          unassignedReasons.add('capacity_full');
          return false;
      }
      return true;
    });

    if (eligibleMembers.length === 0) {
      if(unassignedReasons.size === 0) unassignedReasons.add('no_skill_or_capacity');
      continue;
    }

    // Sort by lowest workload
    eligibleMembers.sort((a, b) => (dailyWorkloads.get(a.id)!.totalDuration) - (dailyWorkloads.get(b.id)!.totalDuration));
    
    const neededCoverage = task.min_coverage || (task.is_must_run ? 1 : 0);
    let assignedCoverage = 0;

    if (task.allow_multi_assign || neededCoverage > 1) {
        // Handle slicing and multi-assign
        // This is a simplified placeholder for the slicing logic
        for (const member of eligibleMembers) {
            if (assignedCoverage >= (neededCoverage || 1)) break;
            const workload = dailyWorkloads.get(member.id)!;
            if (task.task_type === 'upkeep' || (workload.totalDuration + taskDuration <= workload.capacity + settings.overCapacityThreshold)) {
                const assignment = { id: uuid(), taskId: task.id, memberId: member.id, date: targetDate, startTime: task.earliest_start, endTime: minutesToTime(timeToMinutes(task.earliest_start) + taskDuration), duration: taskDuration, reason: "Assigned by skill and workload balance (coverage).", locked: false, status: 'assigned' as AssignmentStatus };
                allAssignments.push(assignment);
                if (task.task_type === 'upkeep') {
                  workload.upkeepDuration += taskDuration;
                } else {
                  workload.totalDuration += taskDuration;
                }
                workload.assignedTasks.push(assignment);
                assignedCoverage++;
                assigned = true;
            }
        }
    } else {
        const assignedMember = eligibleMembers[0];
        const workload = dailyWorkloads.get(assignedMember.id)!;
        const assignment = { id: uuid(), taskId: task.id, memberId: assignedMember.id, date: targetDate, startTime: task.earliest_start, endTime: minutesToTime(timeToMinutes(task.earliest_start) + taskDuration), duration: taskDuration, reason: "Assigned by skill and workload balance.", locked: false, status: 'assigned' as AssignmentStatus };
        allAssignments.push(assignment);
        if (task.task_type === 'upkeep') {
          workload.upkeepDuration += taskDuration;
        } else {
          workload.totalDuration += taskDuration;
        }
        workload.assignedTasks.push(assignment);
        assigned = true;
    }
    
    if (assigned) {
        assignedTaskIds.add(task.id);
        unassignedTasksMap.delete(task.id); // Remove from unassigned if successful
    } else if (unassignedReasons.size === 0) {
        unassignedReasons.add('capacity_full');
    }
  }

  // Final Pass: Over-capacity Flagging
  const overCapacityMembersFinal: { memberId: string; name: string; date: string; overCapacity: number }[] = [];
  dailyWorkloads.forEach((workload, memberId) => {
    if (workload.totalDuration > workload.capacity) {
      overCapacityMembersFinal.push({
        memberId, name: memberMap.get(memberId)!.name, date: targetDate,
        overCapacity: workload.totalDuration - workload.capacity,
      });
    }
  });
  
  const unassignedTasksFinal = Array.from(unassignedTasksMap.values()).map(({task, reasons}) => ({
      ...task,
      unassignedReason: Array.from(reasons).join(', ')
  }));
  
  console.log(`--- Assignment Engine Finished for ${targetDate} ---`);

  return {
    generatedAssignments: allAssignments,
    dailyWorkloads: Array.from(dailyWorkloads.values()),
    unassignedTasks: unassignedTasksFinal,
    overCapacityMembers: overCapacityMembersFinal,
  };
};