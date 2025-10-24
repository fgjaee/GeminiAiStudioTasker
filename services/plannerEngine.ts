// services/plannerEngine.ts
import dayjs from 'dayjs';
import {
  Assignment,
  DailyWorkload,
  Member,
  Task,
  ExplicitRule,
  WeeklyScheduleDay,
  ManagerSettings,
} from '../types';
import { getTaskDisplayName } from './assignmentEngine'; // Re-use existing helper
// Fix: Import getNextNDays
import { getNextNDays } from '../utils/helpers';

interface PlannerEngineInput {
  planningDate: string; // YYYY-MM-DD
  planningDays: number;
  members: Member[];
  tasks: Task[];
  explicitRules: ExplicitRule[];
  weeklySchedule: WeeklyScheduleDay[];
  assignments: Assignment[];
  dailyWorkloads: DailyWorkload[];
  unassignedTasks: Task[];
  overCapacityMembers: { memberId: string; name: string; date: string; overCapacity: number }[];
  settings: ManagerSettings;
  // Fix: Add availableDates to input to ensure consistency with PlannerTab
  availableDates: string[];
}

/**
 * Generates a comprehensive prompt for the AI planner based on current application state.
 * This prompt should provide enough context for the AI to offer insights and recommendations.
 */
export const getPlannerPrompt = (input: PlannerEngineInput): string => {
  const {
    planningDate,
    planningDays,
    members,
    tasks,
    explicitRules,
    weeklySchedule,
    assignments,
    dailyWorkloads,
    unassignedTasks,
    overCapacityMembers,
    settings,
    // Fix: Destructure availableDates from input
    availableDates,
  } = input;

  let prompt = `You are an expert retail produce department manager. Your goal is to provide intelligent planning insights and recommendations based on the provided data. Analyze the team's schedule, task assignments, rules, and workload to identify potential issues, optimize efficiency, and suggest improvements for the upcoming ${planningDays} days starting on ${planningDate}.

--- Current State Summary ---

## Planning Horizon:
- Start Date: ${dayjs(planningDate).format('YYYY-MM-DD (dddd)')}
- Number of Days: ${planningDays}

## Manager Settings:
- Floor SLA Time (total min for all tasks): ${settings.floorSlaTime}
- Over Capacity Warning Threshold (min): ${settings.overCapacityThreshold}
- Default Assignment Start Time: ${settings.assignmentStartTime}

## Team Members (${members.length}):
${members.map(m => `- ${m.name} (${m.title})
  - Role Tags: ${m.role_tags.join(', ') || 'None'}
  - Strengths/Skills: ${m.strengths.join(', ') || 'None'}
  - Fixed Daily Commitments (min): ${m.fixed_commitments_minutes}`).join('\n')}

## Defined Tasks (${tasks.length}):
${tasks.map(t => `- ${getTaskDisplayName(t)} (ID: ${t.id})
  - Description: ${t.description || 'N/A'}
  - Required Skills: ${t.skill_required.join(', ') || 'None'}
  - Est. Duration: ${t.estimated_duration} min
  - Recurrence: ${t.recurrence_type} | Type: ${t.task_type}
  - Earliest Start: ${t.earliest_start} | Due By: ${t.due_by}`).join('\n')}

## Explicit Assignment Rules (${explicitRules.length}):
${explicitRules.map(rule => {
  const task = tasks.find(t => t.id === rule.taskId);
  const primarySelectorLabel = rule.primary_selector.mode === 'member'
    ? members.find(m => m.id === rule.primary_selector.value)?.name || `Member ID: ${rule.primary_selector.value}`
    : `Tag: ${rule.primary_selector.value}`;
  const fallbackSelectorsLabels = (rule.fallback_selectors || []).map(fb =>
    fb.mode === 'member' ? members.find(m => m.id === fb.value)?.name || `Member ID: ${fb.value}` : `Tag: ${fb.value}`
  ).join(', ');
  return `- Task: ${getTaskDisplayName(task)} (ID: ${rule.taskId})
  - Primary: ${primarySelectorLabel}
  - Fallbacks: ${fallbackSelectorsLabels || 'None'}
  - Exclude Days: ${rule.exclude_day?.join(', ') || 'None'}
  - Max per Member: ${rule.max_per_member_per_day === null ? 'No Limit' : rule.max_per_member_per_day}
  - Reason Template: "${rule.reason_template}"`;
}).join('\n')}

## Weekly Schedule (Shifts for the planning horizon):
${availableDates.map(date => {
  const scheduleDay = weeklySchedule.find(wsd => wsd.date === date);
  if (!scheduleDay || scheduleDay.shifts.length === 0) {
    return `- ${dayjs(date).format('YYYY-MM-DD (dddd)')}: No shifts scheduled.`;
  }
  return `- ${dayjs(date).format('YYYY-MM-DD (dddd)')}:
    ${scheduleDay.shifts.map(shift => {
      const member = members.find(m => m.id === shift.memberId);
      return `  - ${member?.name || 'Unknown Member'} (${shift.start}-${shift.end}, Class: ${shift.shift_class || 'N/A'})`;
    }).join('\n    ')}`;
}).join('\n')}

## Generated Assignments & Workloads (for the planning horizon):
${availableDates.map(date => {
  const dailyWorkloadsForDate = dailyWorkloads.filter(dw => dw.date === date);
  if (dailyWorkloadsForDate.length === 0) {
    return `### ${dayjs(date).format('YYYY-MM-DD (dddd)')}: No workloads generated.`;
  }
  return `### ${dayjs(date).format('YYYY-MM-DD (dddd)')}:
  ${dailyWorkloadsForDate.map(dw => {
    const member = members.find(m => m.id === dw.memberId);
    const assignedTasks = assignments.filter(a => a.memberId === dw.memberId && a.date === date);
    const totalShiftMinutes = dw.capacity + (member?.fixed_commitments_minutes || 0); // Re-calculate total shift for context
    const netCapacity = dw.capacity - dw.totalDuration;

    return `- **${member?.name || 'Unknown Member'}**
    - Shift Capacity: ${totalShiftMinutes} min | Workload: ${dw.totalDuration} min (Upkeep: ${dw.upkeepDuration} min)
    - Net Capacity: ${netCapacity} min ${netCapacity < 0 ? `(${Math.abs(netCapacity)} min OVER)` : ''}
    - Assigned Tasks:
      ${assignedTasks.length > 0 ? assignedTasks.map(a => {
        const task = tasks.find(t => t.id === a.taskId);
        return `  - ${getTaskDisplayName(task)} (${a.startTime}-${a.endTime}, ${a.duration}min, Status: ${a.status}) - "${a.reason}"`;
      }).join('\n      ') : 'None'}
  `;
  }).join('\n  ')}
`;
}).join('\n')}

## Unassigned Tasks Identified:
${unassignedTasks.length > 0 ? unassignedTasks.map(t => `- ${getTaskDisplayName(t)} (Est. Duration: ${t.estimated_duration} min, Due By: ${t.due_by})`).join('\n') : 'None'}

## Over-Capacity Members Flagged:
${overCapacityMembers.length > 0 ? overCapacityMembers.map(ocm => `- ${ocm.name} on ${dayjs(ocm.date).format('MMM D')}: ${ocm.overCapacity} mins over capacity.`).join('\n') : 'None'}

--- Request for Analysis ---

Based on the above information, please provide the following:
1.  **Key Observations:** Summarize the most important insights regarding workload distribution, task coverage, and rule effectiveness for the upcoming days.
2.  **Potential Issues & Bottlenecks:** Point out any specific days, members, or tasks that seem problematic (e.g., severe over-capacity, frequently unassigned critical tasks, skill gaps).
3.  **Recommendations for Optimization:**
    *   **Task/Rule Adjustments:** Suggest modifications to existing task definitions (e.g., duration, required skills) or explicit rules to improve assignment quality.
    *   **Staffing/Scheduling Suggestions:** Provide recommendations related to shift adjustments, member strengths development, or cross-training.
    *   **Proactive Measures:** What actions could prevent recurring issues?
4.  **Strategic Advice:** Offer high-level strategic guidance for managing the produce department based on the observed patterns.

Be concise, actionable, and focus on practical solutions. Use markdown formatting for readability.`;

  return prompt;
};