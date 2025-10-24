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
import { calculateDuration, timeToMinutes, minutesToTime, uuid } from '../utils/helpers';
import { WEEKDAY_NAMES } from '../constants'; // Import WEEKDAY_NAMES

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
  unassignedTasks: Task[]; // Tasks that couldn't be assigned
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

  const availableWorkMinutes = totalShiftMinutes - member.fixed_commitments_minutes;
  return { totalShiftMinutes, availableWorkMinutes: Math.max(0, availableWorkMinutes) };
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

  const rng = seedrandom(`${settings.tieBreakSeed}-${targetDate}`); // Seed for deterministic randomness
  const currentDayOfWeek = dayjs(targetDate).format('dddd'); // e.g., 'Monday'

  const memberMap = new Map<string, Member>(members.map(m => [m.id, m]));
  const taskMap = new Map<string, Task>(tasks.map(t => [t.id, t]));

  // Initialize daily workloads for all members
  const initialDailyWorkloads = new Map<string, DailyWorkload>();
  members.forEach(member => {
    const scheduleDay = weeklySchedule.find(sd => sd.date === targetDate);
    const { totalShiftMinutes, availableWorkMinutes } = getMemberCapacityForDay(member, scheduleDay);
    initialDailyWorkloads.set(member.id, {
      date: targetDate,
      memberId: member.id,
      capacity: availableWorkMinutes,
      totalDuration: 0,
      upkeepDuration: 0,
      assignedTasks: [],
      unassignedTaskIds: [],
    });
  });

  let allAssignments: Assignment[] = [];
  const unassignedTasksFinal: Task[] = [];

  // --- 0. Process Locked Assignments ---
  const lockedAssignmentsForDay = existingAssignments.filter(
    a => a.locked && a.date === targetDate && taskMap.has(a.taskId) && memberMap.has(a.memberId)
  );

  lockedAssignmentsForDay.forEach(lockedAssignment => {
    const task = taskMap.get(lockedAssignment.taskId)!;
    const workload = initialDailyWorkloads.get(lockedAssignment.memberId);

    if (workload) {
      // Add to assigned tasks and update workload
      workload.assignedTasks.push(lockedAssignment);
      if (task.task_type !== 'upkeep') {
        workload.totalDuration += lockedAssignment.duration;
      } else {
        workload.upkeepDuration += lockedAssignment.duration;
      }
      console.log(`[Locked] Member ${memberMap.get(lockedAssignment.memberId)?.name} assigned ${getTaskDisplayName(task)} (locked)`);
    } else {
      console.warn(`[Locked] Member ${memberMap.get(lockedAssignment.memberId)?.name} has no workload initialized for ${targetDate}. Locked assignment for ${getTaskDisplayName(task)} cannot be processed.`);
    }
    allAssignments.push(lockedAssignment);
  });

  const assignedTaskIds = new Set(allAssignments.map(a => a.taskId));
  // Filter out tasks that are already assigned via a locked assignment
  let remainingTasksToAssign = tasks.filter(t => !assignedTaskIds.has(t.id));

  // --- Phase 2: Build Ordered Tasks ---
  let orderedTasks: Task[] = [];
  const activeOrderSet = orderSets.find(os =>
    os.scope === 'global' ||
    (os.scope === 'weekday' && os.weekday === currentDayOfWeek) ||
    // (os.scope === 'scenario' && os.overstock === scheduleDay?.flags?.overstock && os.truck_late === scheduleDay?.flags?.truck_late) // Future: integrate with schedule flags
    false // No scenario matching for now
  );

  if (activeOrderSet) {
    const orderItems = orderSetItems.filter(osi => osi.order_set_id === activeOrderSet.id)
      .sort((a, b) => a.position - b.position);
    
    const tasksInOrderSet = new Set<string>();
    for (const item of orderItems) {
      const task = taskMap.get(item.task_id);
      if (task && !assignedTaskIds.has(task.id)) { // Only add if not already locked
        orderedTasks.push(task);
        tasksInOrderSet.add(task.id);
      }
    }
    // Add any remaining tasks that were not in the active order set, sorted by priority_weight
    const remainingUnorderedTasks = remainingTasksToAssign.filter(t => !tasksInOrderSet.has(t.id));
    orderedTasks.push(...[...remainingUnorderedTasks].sort((a, b) => a.priority_weight - b.priority_weight));

    console.log(`[OrderSet] Active Order Set: "${activeOrderSet.name}". Tasks ordered by set.`);
  } else {
    // Fallback to priority_weight if no active order set
    orderedTasks = [...remainingTasksToAssign].sort((a, b) => a.priority_weight - b.priority_weight);
    console.log(`[OrderSet] No active order set found. Tasks ordered by priority_weight.`);
  }


  // --- Pass 1: Upkeep Tasks (do not count towards workload capacity) ---
  const upkeepTasks = orderedTasks.filter(t => t.task_type === 'upkeep');
  
  for (const task of upkeepTasks) {
    if (allAssignments.some(a => a.taskId === task.id)) continue; // Skip if already assigned (e.g., locked)

    const eligibleMembers = members.filter(member =>
      member.strengths.some(skill => task.skill_required.includes(skill)) || task.skill_required.length === 0
    );

    if (eligibleMembers.length > 0) {
      // Pick a random eligible member for upkeep
      const assignedMember = eligibleMembers[Math.floor(rng() * eligibleMembers.length)];
      const workload = initialDailyWorkloads.get(assignedMember.id);

      if (workload) {
        const assignment: Assignment = {
          id: uuid(),
          taskId: task.id,
          memberId: assignedMember.id,
          date: targetDate,
          startTime: settings.assignmentStartTime, // Upkeep might not have strict times
          endTime: minutesToTime(timeToMinutes(settings.assignmentStartTime) + task.estimated_duration),
          duration: task.estimated_duration,
          reason: `Assigned as upkeep task.`,
          locked: false,
          status: 'assigned',
        };
        workload.assignedTasks.push(assignment);
        workload.upkeepDuration += assignment.duration;
        allAssignments.push(assignment);
        assignedTaskIds.add(task.id);
        console.log(`[Pass 1 Upkeep] Member ${assignedMember.name} assigned ${getTaskDisplayName(task)}`);
      }
    } else {
      console.warn(`[Pass 1 Upkeep] No eligible member found for upkeep task ${getTaskDisplayName(task)}.`);
    }
  }

  remainingTasksToAssign = remainingTasksToAssign.filter(t => !assignedTaskIds.has(t.id));
  orderedTasks = orderedTasks.filter(t => !assignedTaskIds.has(t.id)); // Update orderedTasks after upkeep


  // --- Pass 2: Explicit Rules ---
  for (const rule of explicitRules) {
    const task = taskMap.get(rule.taskId);
    if (!task || assignedTaskIds.has(task.id)) continue; // Skip if task not found or already assigned

    const isExcludedDay = rule.exclude_day?.includes(currentDayOfWeek);
    if (isExcludedDay) {
      console.log(`[Pass 2 Explicit] Task ${getTaskDisplayName(task)} skipped due to exclusion on ${currentDayOfWeek}.`);
      continue;
    }

    let assigned = false;
    const candidateSelectors = [rule.primary_selector, ...(rule.fallback_selectors || [])];

    for (const selector of candidateSelectors) {
      let eligibleMembersForSelector: Member[] = [];

      if (selector.mode === 'member') {
        const member = memberMap.get(selector.value);
        if (member) {
          eligibleMembersForSelector = [member];
        }
      } else if (selector.mode === 'tag') {
        eligibleMembersForSelector = members.filter(member =>
          member.role_tags.includes(selector.value) || member.strengths.includes(selector.value)
        );
      }

      for (const member of eligibleMembersForSelector) {
        const workload = initialDailyWorkloads.get(member.id);
        if (!workload) continue; // Member not on schedule or capacity not initialized

        // Check if member has required skills for the task
        const hasRequiredSkills = task.skill_required.every(skill =>
          member.strengths.includes(skill) || member.role_tags.includes(skill)
        );
        if (!hasRequiredSkills) continue;

        // Check max_per_member_per_day
        const assignedCount = workload.assignedTasks.filter(a => a.taskId === task.id).length;
        if (rule.max_per_member_per_day !== null && rule.max_per_member_per_day !== undefined && assignedCount >= rule.max_per_member_per_day) {
          console.log(`[Pass 2 Explicit] Member ${member.name} skipped for ${getTaskDisplayName(task)} due to max_per_member_per_day rule.`);
          continue;
        }

        // Check workload capacity (only for non-upkeep tasks)
        const newTotalDuration = workload.totalDuration + task.estimated_duration;
        if (task.task_type !== 'upkeep' && newTotalDuration > workload.capacity + settings.overCapacityThreshold) {
          console.log(`[Pass 2 Explicit] Member ${member.name} skipped for ${getTaskDisplayName(task)} due to exceeding capacity (would be ${newTotalDuration} vs ${workload.capacity}).`);
          continue;
        }

        // Check time window conflicts (basic)
        const taskStartTime = rule.earliest_start || task.earliest_start || settings.assignmentStartTime;
        const taskEndTime = rule.due_by && rule.due_by !== 'EOD' ? rule.due_by : minutesToTime(timeToMinutes(taskStartTime) + task.estimated_duration); // Use task duration if EOD
        // More sophisticated conflict detection would go here, checking against member's shifts and other assigned tasks

        const assignment: Assignment = {
          id: uuid(),
          taskId: task.id,
          memberId: member.id,
          date: targetDate,
          startTime: taskStartTime,
          endTime: taskEndTime,
          duration: task.estimated_duration,
          reason: rule.reason_template || `Assigned by explicit rule for ${member.name}.`,
          locked: false,
          status: 'assigned',
        };
        workload.assignedTasks.push(assignment);
        workload.totalDuration += assignment.duration;
        allAssignments.push(assignment);
        assignedTaskIds.add(task.id);
        assigned = true;
        console.log(`[Pass 2 Explicit] Member ${member.name} assigned ${getTaskDisplayName(task)} by rule.`);
        break; // Rule task assigned, move to next rule
      }
      if (assigned) break;
    }
  }

  remainingTasksToAssign = remainingTasksToAssign.filter(t => !assignedTaskIds.has(t.id));
  orderedTasks = orderedTasks.filter(t => !assignedTaskIds.has(t.id));


  // --- Pass 3: Time-Window & Skill Balance (main allocation loop) ---
  for (const task of orderedTasks) {
    if (allAssignments.some(a => a.taskId === task.id)) continue; // Already assigned

    const taskStartTime = task.earliest_start || settings.assignmentStartTime;
    const taskDueBy = task.due_by && task.due_by !== 'EOD' ? task.due_by : minutesToTime(timeToMinutes(taskStartTime) + task.estimated_duration);

    // Find eligible members for this task
    let eligibleMembers = members.filter(member => {
      const workload = initialDailyWorkloads.get(member.id);
      if (!workload || workload.capacity <= 0) return false; // No capacity

      // Check member skills
      const hasRequiredSkills = task.skill_required.every(skill =>
        member.strengths.includes(skill) || member.role_tags.includes(skill)
      );
      if (!hasRequiredSkills) return false;

      // Check if task can fit within remaining capacity (for non-upkeep)
      if (task.task_type !== 'upkeep' && (workload.totalDuration + task.estimated_duration) > (workload.capacity + settings.overCapacityThreshold)) {
        return false;
      }

      // Basic time window check: member must have a shift covering the task time
      const scheduleDay = weeklySchedule.find(sd => sd.date === targetDate);
      const memberShifts = scheduleDay?.shifts.filter(s => s.memberId === member.id) || [];
      const taskStartMinutes = timeToMinutes(taskStartTime);
      const taskEndMinutes = timeToMinutes(taskDueBy); // Using dueBy as end boundary

      const canFitInShift = memberShifts.some(shift => {
        const shiftStartMinutes = timeToMinutes(shift.start);
        let shiftEndMinutes = timeToMinutes(shift.end);
        if (shiftEndMinutes < shiftStartMinutes) shiftEndMinutes += 24 * 60; // Overnight shift

        // Task must start within shift and end within shift (or after for EOD)
        return (taskStartMinutes >= shiftStartMinutes && taskStartMinutes + task.estimated_duration <= shiftEndMinutes) ||
               (task.due_by === 'EOD' && taskStartMinutes >= shiftStartMinutes && taskStartMinutes < shiftEndMinutes);
               // More complex time slotting would go here
      });

      if (!canFitInShift && memberShifts.length > 0) return false; // If member has shifts, task must fit one. If no shifts, assume flexible.

      return true;
    });

    if (eligibleMembers.length === 0) {
      unassignedTasksFinal.push(task);
      console.log(`[Pass 3] Task ${getTaskDisplayName(task)} could not find an eligible member.`);
      continue;
    }

    // Sort eligible members by lowest current workload and then by tie-break seed
    eligibleMembers.sort((a, b) => {
      const workloadA = initialDailyWorkloads.get(a.id)!.totalDuration;
      const workloadB = initialDailyWorkloads.get(b.id)!.totalDuration;
      if (workloadA !== workloadB) return workloadA - workloadB;

      // Deterministic tie-breaking
      return rng() - 0.5; // Random order for equal workloads
    });

    const assignedMember = eligibleMembers[0];
    const workload = initialDailyWorkloads.get(assignedMember.id)!;

    const assignment: Assignment = {
      id: uuid(),
      taskId: task.id,
      memberId: assignedMember.id,
      date: targetDate,
      startTime: taskStartTime,
      endTime: taskDueBy,
      duration: task.estimated_duration,
      reason: `Assigned by skill and workload balance.`,
      locked: false,
      status: 'assigned',
    };
    workload.assignedTasks.push(assignment);
    workload.totalDuration += assignment.duration;
    allAssignments.push(assignment);
    assignedTaskIds.add(task.id);
    console.log(`[Pass 3] Member ${assignedMember.name} assigned ${getTaskDisplayName(task)}.`);
  }


  // --- Pass 4: Spillover / Over-capacity Flagging ---
  const overCapacityMembersFinal: { memberId: string; name: string; date: string; overCapacity: number }[] = [];
  initialDailyWorkloads.forEach(workload => {
    const member = memberMap.get(workload.memberId);
    if (!member) return;

    const actualWorkload = workload.totalDuration;
    if (actualWorkload > workload.capacity && (actualWorkload - workload.capacity) > settings.overCapacityThreshold) {
      const overCapacity = actualWorkload - workload.capacity;
      overCapacityMembersFinal.push({
        memberId: member.id,
        name: member.name,
        date: targetDate,
        overCapacity,
      });
      // Mark relevant assignments as 'over-capacity'
      workload.assignedTasks.forEach(assignment => {
        // This is a simplified approach; ideally, you'd mark tasks that pushed them over
        if (assignment.status === 'assigned' && taskMap.get(assignment.taskId)?.task_type !== 'upkeep') {
          assignment.status = 'over-capacity';
        }
      });
      console.warn(`[Pass 4 Spillover] Member ${member.name} is ${overCapacity} minutes over capacity.`);
    }
  });


  // Collect final daily workloads
  const finalDailyWorkloads: DailyWorkload[] = Array.from(initialDailyWorkloads.values());

  // Consolidate final unassigned tasks (those not explicitly rules-based but couldn't fit)
  const remainingUnassignedFromPasses = tasks.filter(t => !assignedTaskIds.has(t.id));
  unassignedTasksFinal.push(...remainingUnassignedFromPasses);


  console.log(`--- Assignment Engine Finished for ${targetDate} ---`);

  return {
    generatedAssignments: allAssignments,
    dailyWorkloads: finalDailyWorkloads,
    unassignedTasks: unassignedTasksFinal,
    overCapacityMembers: overCapacityMembersFinal,
  };
};