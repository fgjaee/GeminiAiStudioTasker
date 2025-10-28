// constants.ts
import {
  // FIX: Import SupabaseTableData
  SupabaseTableData,
  ManagerSettings,
  Template,
  Task,
  ExplicitRule,
  Member,
  WeeklyScheduleDay,
  Assignment,
  Area,
  OrderSet,
  OrderSetItem,
  StaffingTarget,
  Availability,
  ShiftTemplate,
  PlannedShift,
  ShiftClass,
  // FIX: Import Skill and MemberSkill
  Skill,
  MemberSkill,
  RecurrenceType,
  TaskType,
} from './types';
import { uuid } from './utils/helpers';
import dayjs from 'dayjs';

export const DATE_FORMAT = 'YYYY-MM-DD';
export const TIME_FORMAT = 'HH:mm';
export const PDF_MOCK_TIMEOUT = 2000; // ms
export const MOCK_DB_DELAY = 100; // ms for mock CRUD operations

export const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const SHORT_WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const DEFAULT_MANAGER_SETTINGS: ManagerSettings = {
  id: uuid(),
  floorSlaTime: 480, // 8 hours for all tasks combined
  tieBreakSeed: 12345,
  overCapacityThreshold: 30, // 30 minutes over capacity allowed before warning
  assignmentStartTime: '07:00',
  plannerSeed: 42,
  defaultPlanningPeriod: 7, // 7 days for planner view
  defaultSlotDuration: 30, // 30 minutes for planner grid slots
};

export const DEFAULT_TEMPLATE_CONTENT = `
# Daily Worklist for {{date}}

## Store: {{store}}
## Department: {{department}}
## Floor SLA Time (Total Workload Goal): {{floorSlaTime}} minutes

### Important Notes:
*   Please prioritize tasks by their assigned order.
*   Communicate any issues or delays to management.
*   Ensure all displays are neat and fully stocked.

---

## Assignments:

| Member | Task | Duration | Start | End | Status | Reason |
|---|---|---|---|---|---|---|
{{#each assignmentsByMember}}
| **{{this.memberName}}** | | | | | | |
{{#each this.tasks}}
| | {{this.taskName}} | {{this.duration}} mins | {{this.startTime}} | {{this.endTime}} | {{this.status}} | {{this.reason}} |
{{/each}}
| | **Total Assigned Workload:** | **{{this.totalDuration}} mins** | | | | |
{{#if (gt this.capacity 0)}}
| | **Available Capacity:** | **{{minus this.capacity this.totalDuration}} mins** | | | | |
{{/if}}
{{/each}}

---

{{#if unassignedTasks.length}}
### Unassigned Tasks:
The following tasks could not be assigned:
{{#each unassignedTasks}}
*   {{this.taskName}} ({{this.duration}} mins) - Due by: {{this.dueBy}}
{{/each}}
---
{{/if}}

{{#if overCapacityMembers.length}}
### Over-Capacity Members:
The following members are assigned more tasks than their available shift time:
{{#each overCapacityMembers}}
*   {{this.name}}: {{this.overCapacity}} mins over capacity
{{/each}}
---
{{/if}}

Check-in: _______________________
Check-out: ______________________
Supervisor Sign: ________________
`;

// --- Skill Data Generation ---
// Create a unified list of all skills from member strengths and task requirements
const allSkillNames = [
  "Produce Lead", "Ordering", "Dry Table/Display", "Quality Checks", "Backroom Organization", "Freshpak Wall",
  "Salads-Juice Wall", "Mirror Wall", "Wet Rack/Herbs Wall", "Receiving & Breakdown", "Cutter/Prep", "IMS",
  "Signs/Ad Change", "Produce Clerk", "Truck Sorting", "Backroom Logistics"
];
const uniqueSkillNames = [...new Set(allSkillNames)];
const initialSkills: Skill[] = uniqueSkillNames.map((name, index) => ({ id: `skill_${index}`, name }));
const skillNameToIdMap = new Map(initialSkills.map(skill => [skill.name, skill.id]));
const getSkillIds = (names: string[]) => names.map(name => skillNameToIdMap.get(name)).filter(Boolean) as string[];

const memberData = [
    { id: "m_alice", name: "Alice Johnson", title: "Produce Lead", role_tags: ["Produce Lead", "Ordering"], strengths: ["Produce Lead", "Ordering", "Dry Table/Display", "Quality Checks", "Backroom Organization", "Freshpak Wall", "Salads-Juice Wall", "Mirror Wall", "Wet Rack/Herbs Wall", "Receiving & Breakdown", "Cutter/Prep", "IMS", "Signs/Ad Change"], fixed_commitments_minutes: 60, max_daily_minutes: 480, max_weekly_minutes: 2400, shift_class_preference: ["Opening"] as ShiftClass[], availability: [ { id: uuid(), day: 'Mon', start: '06:00', end: '16:00' }, { id: uuid(), day: 'Tue', start: '06:00', end: '16:00' }, { id: uuid(), day: 'Wed', start: '06:00', end: '16:00' }, { id: uuid(), day: 'Thu', start: '06:00', end: '16:00' }, { id: uuid(), day: 'Fri', start: '06:00', end: '16:00' }, { id: uuid(), day: 'Sat', start: '07:00', end: '15:00' }, { id: uuid(), day: 'Sun', start: '07:00', end: '15:00' } ], default_tasks: [] },
    { id: "m_bob", name: "Bob Smith", title: "Produce Clerk", role_tags: ["Produce Clerk"], strengths: ["Produce Clerk", "Dry Table/Display", "Quality Checks", "Backroom Organization"], fixed_commitments_minutes: 30, max_daily_minutes: 420, max_weekly_minutes: 2000, shift_class_preference: ["Mid-Shift", "Closing"] as ShiftClass[], availability: [ { id: uuid(), day: 'Mon', start: '09:00', end: '18:00' }, { id: uuid(), day: 'Tue', start: '09:00', end: '18:00' }, { id: uuid(), day: 'Wed', start: '09:00', end: '18:00' }, { id: uuid(), day: 'Thu', start: '09:00', end: '18:00' }, { id: uuid(), day: 'Fri', start: '09:00', end: '18:00' } ], default_tasks: [] },
    { id: "m_charlie", name: "Charlie Brown", title: "Produce Clerk", role_tags: ["Produce Clerk"], strengths: ["Produce Clerk", "Wet Rack/Herbs Wall", "Salads-Juice Wall", "Quality Checks"], fixed_commitments_minutes: 45, max_daily_minutes: 450, max_weekly_minutes: 2200, shift_class_preference: ["Opening", "Mid-Shift"] as ShiftClass[], availability: [ { id: uuid(), day: 'Mon', start: '07:00', end: '16:00' }, { id: uuid(), day: 'Tue', start: '07:00', end: '16:00' }, { id: uuid(), day: 'Wed', start: '07:00', end: '16:00' }, { id: uuid(), day: 'Thu', start: '07:00', end: '16:00' }, { id: uuid(), day: 'Fri', start: '07:00', end: '16:00' } ], default_tasks: [] },
    { id: "m_marlon", name: "Marlon", title: "Produce Clerk", role_tags: ["Produce Clerk", "Overnight"], strengths: ["Ordering"], fixed_commitments_minutes: 0, default_tasks: [], max_daily_minutes: 480, max_weekly_minutes: 2400, shift_class_preference: ["Opening", "Overnight"] as ShiftClass[], availability: [] },
    { id: "m_soloman", name: "Soloman", title: "Produce Clerk", role_tags: ["Produce Clerk", "Overnight"], strengths: ["Truck Sorting", "Backroom Logistics", "Backroom Organization", "Receiving & Breakdown"], fixed_commitments_minutes: 0, default_tasks: [], max_daily_minutes: 480, max_weekly_minutes: 2400, shift_class_preference: ["Overnight"] as ShiftClass[], availability: [] },
    { id: "m_james", name: "James", title: "Produce Clerk", role_tags: ["Produce Clerk"], strengths: ["Ordering", "Freshpak Wall"], fixed_commitments_minutes: 0, default_tasks: [], max_daily_minutes: 480, max_weekly_minutes: 2400, shift_class_preference: ["Mid-Shift"] as ShiftClass[], availability: [] },
    { id: "m_deb", name: "Deb", title: "Produce Lead", role_tags: ["Produce Lead", "Ordering"], strengths: ["Ordering", "Salads-Juice Wall"], fixed_commitments_minutes: 0, default_tasks: [], max_daily_minutes: 480, max_weekly_minutes: 2400, shift_class_preference: ["Closing"] as ShiftClass[], availability: [] },
    { id: "m_kenneth", name: "Kenneth", title: "Produce Clerk", role_tags: ["Produce Clerk"], strengths: ["Ordering"], fixed_commitments_minutes: 0, default_tasks: [], max_daily_minutes: 480, max_weekly_minutes: 2400, shift_class_preference: [] as ShiftClass[], availability: [] },
    { id: "m_william", name: "William", title: "Produce Clerk", role_tags: ["Produce Clerk"], strengths: ["Ordering", "Mirror Wall"], fixed_commitments_minutes: 0, default_tasks: [], max_daily_minutes: 480, max_weekly_minutes: 2400, shift_class_preference: [] as ShiftClass[], availability: [] },
    { id: "m_sandra", name: "Sandra", title: "Produce Lead", role_tags: ["Produce Lead", "Ordering"], strengths: ["Ordering", "Freshpak Wall"], fixed_commitments_minutes: 0, default_tasks: [], max_daily_minutes: 480, max_weekly_minutes: 2400, shift_class_preference: ["Opening"] as ShiftClass[], availability: [] },
    { id: "m_beth", name: "Beth", title: "Produce Clerk", role_tags: ["Produce Clerk"], strengths: ["Ordering", "Freshpak Wall"], fixed_commitments_minutes: 0, default_tasks: [], max_daily_minutes: 480, max_weekly_minutes: 2400, shift_class_preference: ["Mid-Shift"] as ShiftClass[], availability: [] },
    { id: "m_heidi", name: "Heidi", title: "Produce Clerk", role_tags: ["Produce Clerk"], strengths: ["Wet Rack/Herbs Wall"], fixed_commitments_minutes: 0, default_tasks: [], max_daily_minutes: 480, max_weekly_minutes: 2400, shift_class_preference: ["Closing"] as ShiftClass[], availability: [] },
    { id: "m_john", name: "John", title: "Produce Clerk", role_tags: ["Produce Clerk"], strengths: ["Mirror Wall"], fixed_commitments_minutes: 0, default_tasks: [], max_daily_minutes: 480, max_weekly_minutes: 2400, shift_class_preference: [] as ShiftClass[], availability: [] },
    { id: "m_nabil", name: "Nabil", title: "Produce Clerk", role_tags: ["Produce Clerk"], strengths: ["Quality Checks"], fixed_commitments_minutes: 0, default_tasks: [], max_daily_minutes: 480, max_weekly_minutes: 2400, shift_class_preference: [] as ShiftClass[], availability: [] },
    { id: "m_barry", name: "Barry", title: "Produce Clerk", role_tags: ["Produce Clerk"], strengths: ["Quality Checks"], fixed_commitments_minutes: 0, default_tasks: [], max_daily_minutes: 480, max_weekly_minutes: 2400, shift_class_preference: [] as ShiftClass[], availability: [] },
    { id: "m_victoria", name: "Victoria", title: "Produce Clerk", role_tags: ["Produce Clerk"], strengths: ["Quality Checks"], fixed_commitments_minutes: 0, default_tasks: [], max_daily_minutes: 480, max_weekly_minutes: 2400, shift_class_preference: [] as ShiftClass[], availability: [] },
];

const initialMembers = memberData.map(({ strengths, ...m }) => ({
    ...m,
    id: m.id || uuid(),
    skill_ids: getSkillIds(strengths),
}));

const initialMemberSkills: MemberSkill[] = initialMembers.flatMap(m =>
    (m.skill_ids || []).map(skill_id => ({ member_id: m.id, skill_id }))
);

// --- Initial Mock Data (seeded with user's provided tasks and rules) ---
// This initial data will be loaded into supabaseMock on app start.
export const initialMockData: SupabaseTableData = {
  members: initialMembers,
  skills: initialSkills,
  member_skills: initialMemberSkills,
  member_aliases: [],
  tasks: [
    {
      "id": "task_truck", "code": "TRK", "name": "Truck Unload & Sort", "description": "Unload overnight delivery truck and sort produce for stocking.",
      "skill_required": ["Truck Sorting", "Receiving & Breakdown"], "earliest_start": "04:00", "due_by": "07:00", "estimated_duration": 180, "task_type": "standard", "priority_weight": 5, "allow_multi_assign": false, "recurrence_type": "daily", "is_must_run": true, "areaId": "area_backroom"
    },
    {
      "id": "task_pull_backstock", "code": "PULL", "name": "Pull Backstock Carts to Floor", "description": "Pull all temperature-safe backstock carts to the sales floor.",
      "skill_required": ["Backroom Organization"], "earliest_start": "06:00", "due_by": "07:00", "estimated_duration": 30, "task_type": "standard", "priority_weight": 9, "allow_multi_assign": true, "recurrence_type": "daily", "areaId": "area_backroom"
    },
    {
      "id": "task_inventory", "code": "INV", "name": "Monthly Full Produce Inventory", "description": "Conduct a full inventory count of all produce items in the department.",
      "skill_required": ["Backroom Organization", "IMS"], "earliest_start": "08:00", "due_by": "EOD", "estimated_duration": 180, "task_type": "project", "priority_weight": 1, "allow_multi_assign": false, "recurrence_type": "monthly", "recurrence_detail": "Last Sunday", "areaId": "area_backroom"
    },
    {
      "id": "task_ad_change", "code": "AD", "name": "Weekly Ad/First Impression Change", "description": "Update all ad signage and refresh first impression displays.",
      "skill_required": ["Signs/Ad Change", "Dry Table/Display"], "earliest_start": "06:00", "due_by": "09:00", "estimated_duration": 60, "task_type": "standard", "priority_weight": 2, "allow_multi_assign": false, "recurrence_type": "weekly", "recurrence_detail": "Wed", "areaId": "area_front"
    },
    {
      "id": "task_deep_clean", "code": "DCW2", "name": "Weekly Deep Clean - Salad Wall", "description": "Thoroughly clean and sanitize the salad wall display.",
      "skill_required": ["Salads-Juice Wall", "Quality Checks"], "earliest_start": "09:00", "due_by": "EOD", "estimated_duration": 120, "task_type": "standard", "priority_weight": 3, "allow_multi_assign": false, "recurrence_type": "weekly", "recurrence_detail": "Tue", "areaId": "area_wall_salad"
    },
    {
      "id": "task_ims_audit", "code": "IMSF", "name": "IMS Audit Finalization", "description": "Finalize weekly IMS audit and reconcile discrepancies.",
      "skill_required": ["IMS", "Quality Checks"], "earliest_start": "14:00", "due_by": "EOD", "estimated_duration": 30, "task_type": "standard", "priority_weight": 4, "allow_multi_assign": false, "recurrence_type": "weekly", "recurrence_detail": "Sat", "areaId": "area_backroom"
    },
    {
      "id": "task_dob_order", "code": "DOB", "name": "DOB Order", "description": "Place daily produce order with the distribution center.",
      "skill_required": ["Ordering"], "earliest_start": "07:00", "due_by": "07:55", "estimated_duration": 90, "task_type": "standard", "priority_weight": 5, "allow_multi_assign": false, "recurrence_type": "daily", "areaId": "area_office"
    },
    {
      "id": "task_freshpak_order", "code": "FPO", "name": "Freshpak Order", "description": "Place daily order for pre-packaged produce items.",
      "skill_required": ["Ordering"], "earliest_start": "07:00", "due_by": "07:55", "estimated_duration": 20, "task_type": "standard", "priority_weight": 6, "allow_multi_assign": false, "recurrence_type": "daily", "areaId": "area_office"
    },
    {
      "id": "t_first_impressions", "code": "T0", "name": "First Impressions", "description": "Ensure the entrance and front displays are perfectly stocked and appealing.",
      "skill_required": ["Dry Table/Display"], "earliest_start": "07:00", "due_by": "09:00", "estimated_duration": 30, "task_type": "standard", "priority_weight": 10, "allow_multi_assign": false, "recurrence_type": "daily", "areaId": "area_front"
    },
    {
      "id": "t_t4", "code": "T4", "name": "Banana/Citrus Table", "description": "Stock and maintain the banana and citrus display table.",
      "skill_required": ["Dry Table/Display"], "earliest_start": "07:00", "due_by": "09:00", "estimated_duration": 45, "task_type": "standard", "priority_weight": 20, "allow_multi_assign": false, "recurrence_type": "daily", "areaId": "area_dry_table"
    },
    {
      "id": "t_t2", "code": "T2", "name": "Apple Bulk/Bagged Table", "description": "Stock and maintain the apple bulk and bagged display table.",
      "skill_required": ["Dry Table/Display"], "earliest_start": "07:00", "due_by": "09:00", "estimated_duration": 90, "task_type": "standard", "priority_weight": 30, "allow_multi_assign": false, "recurrence_type": "daily", "areaId": "area_dry_table"
    },
    {
      "id": "t_t1", "code": "T1", "name": "Tropical/Harvest Table", "description": "Stock and maintain the tropical and harvest produce table.",
      "skill_required": ["Dry Table/Display"], "earliest_start": "07:00", "due_by": "09:00", "estimated_duration": 45, "task_type": "standard", "priority_weight": 40, "allow_multi_assign": false, "recurrence_type": "daily", "areaId": "area_dry_table"
    },
    {
      "id": "t_t3", "code": "T3", "name": "Berries/Grapes Table", "description": "Stock and maintain the berries and grapes display table.",
      "skill_required": ["Dry Table/Display"], "earliest_start": "07:00", "due_by": "09:00", "estimated_duration": 45, "task_type": "standard", "priority_weight": 50, "allow_multi_assign": false, "recurrence_type": "daily", "areaId": "area_dry_table"
    },
    {
      "id": "t_t5", "code": "T5", "name": "Tomato/Pepper Table", "description": "Stock and maintain the tomato and pepper display table.",
      "skill_required": ["Dry Table/Display"], "earliest_start": "07:00", "due_by": "09:00", "estimated_duration": 60, "task_type": "standard", "priority_weight": 60, "allow_multi_assign": false, "recurrence_type": "daily", "areaId": "area_dry_table"
    },
    {
      "id": "t_t6", "code": "T6", "name": "Organic Produce Table", "description": "Stock and maintain the organic produce display table.",
      "skill_required": ["Dry Table/Display"], "earliest_start": "07:00", "due_by": "09:00", "estimated_duration": 30, "task_type": "standard", "priority_weight": 70, "allow_multi_assign": false, "recurrence_type": "daily", "areaId": "area_dry_table"
    },
    {
      "id": "t_t7", "code": "T7", "name": "Potato/Onion Table", "description": "Stock and maintain the potato and onion display table.",
      "skill_required": ["Dry Table/Display"], "earliest_start": "07:00", "due_by": "09:00", "estimated_duration": 60, "task_type": "standard", "priority_weight": 80, "allow_multi_assign": false, "recurrence_type": "daily", "areaId": "area_dry_table"
    },
    {
      "id": "task_w1", "code": "W1", "name": "Freshpak Wall Service", "description": "Service and replenish the fresh-packed produce wall.",
      "skill_required": ["Freshpak Wall"], "earliest_start": "07:00", "due_by": "09:00", "estimated_duration": 90, "task_type": "standard", "priority_weight": 100, "allow_multi_assign": false, "recurrence_type": "daily", "areaId": "area_wall_freshpak"
    },
    {
      "id": "task_w2", "code": "W2", "name": "Salad/Juice Wall Service", "description": "Service and replenish the salad and juice wall.",
      "skill_required": ["Salads-Juice Wall"], "earliest_start": "07:00", "due_by": "09:00", "estimated_duration": 240, "task_type": "standard", "priority_weight": 110, "allow_multi_assign": false, "recurrence_type": "daily", "areaId": "area_wall_salad"
    },
    {
      "id": "task_w3", "code": "W3", "name": "Mirror Wall Service", "description": "Service and replenish the mirror wall displays.",
      "skill_required": ["Mirror Wall"], "earliest_start": "07:00", "due_by": "09:00", "estimated_duration": 90, "task_type": "standard", "priority_weight": 120, "allow_multi_assign": false, "recurrence_type": "daily", "areaId": "area_wall_mirror"
    },
    {
      "id": "task_w4", "code": "W4", "name": "Wet Rack/Herb Service", "description": "Service and replenish the wet rack and herb displays.",
      "skill_required": ["Wet Rack/Herbs Wall"], "earliest_start": "07:00", "due_by": "09:00", "estimated_duration": 180, "task_type": "standard", "priority_weight": 130, "allow_multi_assign": false, "recurrence_type": "daily", "areaId": "area_wall_wet"
    },
    {
      "id": "task_mid_morning_refill", "code": "MMR", "name": "Mid-Morning Refill (High Turnover)", "description": "Perform a mid-morning refill of high-turnover items.",
      "skill_required": ["Dry Table/Display"], "earliest_start": "10:30", "due_by": "11:00", "estimated_duration": 30, "task_type": "standard", "priority_weight": 200, "allow_multi_assign": false, "recurrence_type": "daily", "areaId": "area_front"
    },
    {
      "id": "task_floor_check", "code": "FLOOR", "name": "Post-Set Floor Check & Spot Clean", "description": "Perform a floor check after initial setup and conduct spot cleaning.",
      "skill_required": ["Quality Checks"], "earliest_start": "11:00", "due_by": "11:30", "estimated_duration": 15, "task_type": "standard", "priority_weight": 210, "allow_multi_assign": false, "recurrence_type": "daily", "areaId": "area_floor"
    },
    {
      "id": "task_bag_roll_restock", "code": "BAGS", "name": "Produce Bag Roll Restock", "description": "Restock produce bag rolls at all stations.",
      "skill_required": ["Quality Checks"], "earliest_start": "11:00", "due_by": "11:30", "estimated_duration": 15, "task_type": "standard", "priority_weight": 220, "allow_multi_assign": false, "recurrence_type": "daily", "areaId": "area_floor"
    },
    {
      "id": "task_markdowns", "code": "MD", "name": "Markdowns", "description": "Identify and markdown items nearing expiration or quality decline.",
      "skill_required": ["Quality Checks"], "earliest_start": "15:00", "due_by": "EOD", "estimated_duration": 60, "task_type": "standard", "priority_weight": 300, "allow_multi_assign": false, "recurrence_type": "daily", "areaId": "area_backroom"
    },
    {
      "id": "task_returns", "code": "RET", "name": "Shop Back Customer Returns", "description": "Process items returned by customers at the service desk.",
      "skill_required": ["Quality Checks"], "earliest_start": "15:00", "due_by": "EOD", "estimated_duration": 30, "task_type": "standard", "priority_weight": 315, "allow_multi_assign": false, "recurrence_type": "daily", "areaId": "area_backroom"
    },
    {
      "id": "task_putbacks", "code": "PUT", "name": "Customer Putbacks", "description": "Collect and restock items left by customers around the store.",
      "skill_required": ["Quality Checks"], "earliest_start": "15:00", "due_by": "EOD", "estimated_duration": 30, "task_type": "standard", "priority_weight": 316, "allow_multi_assign": true, "recurrence_type": "daily", "areaId": "area_floor"
    },
    {
      "id": "task_throwaways", "code": "WASTE", "name": "Throwaways", "description": "Process and dispose of unsaleable produce.",
      "skill_required": ["Quality Checks"], "earliest_start": "15:00", "due_by": "EOD", "estimated_duration": 45, "task_type": "standard", "priority_weight": 310, "allow_multi_assign": false, "recurrence_type": "daily", "areaId": "area_backroom"
    },
    {
      "id": "task_flashfood", "code": "FFB", "name": "FlashFood Bags", "description": "Prepare FlashFood bags for discounted produce.",
      "skill_required": ["Quality Checks"], "earliest_start": "15:00", "due_by": "EOD", "estimated_duration": 30, "task_type": "standard", "priority_weight": 320, "allow_multi_assign": false, "recurrence_type": "daily", "areaId": "area_backroom"
    },
    {
      "id": "task_ims_scan", "code": "IMS", "name": "IMS Audits", "description": "Perform daily IMS inventory scans and audits.",
      "skill_required": ["IMS", "Quality Checks"], "earliest_start": "15:00", "due_by": "EOD", "estimated_duration": 60, "task_type": "standard", "priority_weight": 330, "allow_multi_assign": false, "recurrence_type": "daily", "areaId": "area_backroom"
    },
    {
      "id": "task_breakdown_pallets", "code": "PAL", "name": "Breakdown Pallets in Cooler", "description": "Fully breakdown and combine previous day pallets in cooler.",
      "skill_required": ["Backroom Organization", "Backroom Logistics"], "earliest_start": "15:00", "due_by": "EOD", "estimated_duration": 60, "task_type": "standard", "priority_weight": 340, "allow_multi_assign": false, "recurrence_type": "daily", "areaId": "area_backroom"
    },
    {
      "id": "task_tags", "code": "TAG", "name": "Pull Expired Sale Tags", "description": "On Saturday nights, pull all expired sale tags and signs.",
      "skill_required": ["Signs/Ad Change"], "earliest_start": "20:00", "due_by": "EOD", "estimated_duration": 45, "task_type": "standard", "priority_weight": 350, "allow_multi_assign": true, "recurrence_type": "weekly", "recurrence_detail": "Sat", "areaId": "area_floor"
    },
    {
      "id": "task_process_organics", "code": "ORG", "name": "Process Organics", "description": "Process and stock organic produce deliveries.",
      "skill_required": ["Backroom Organization"], "earliest_start": "Continuous", "due_by": "Continuous", "estimated_duration": 0, "task_type": "upkeep", "priority_weight": 500, "allow_multi_assign": true, "recurrence_type": "daily", "areaId": "area_backroom"
    },
    {
      "id": "upkeep_sweep", "code": "SWEEP", "name": "Sweep & Mop Floor", "description": "Maintain cleanliness of the produce floor.",
      "skill_required": ["Quality Checks"], "earliest_start": "Continuous", "due_by": "Continuous", "estimated_duration": 0, "task_type": "upkeep", "priority_weight": 510, "allow_multi_assign": true, "recurrence_type": "daily", "areaId": "area_floor"
    },
    {
      "id": "upkeep_cardboard", "code": "CRD", "name": "Clear Empty Cardboard", "description": "Clear empty cardboard from tables and take to bailer.",
      "skill_required": ["Backroom Logistics"], "earliest_start": "Continuous", "due_by": "Continuous", "estimated_duration": 0, "task_type": "upkeep", "priority_weight": 515, "allow_multi_assign": true, "recurrence_type": "daily", "areaId": "area_floor"
    },
    {
      "id": "upkeep_facing", "code": "FACE", "name": "Facing Displays", "description": "Continuously face and rotate produce on displays.",
      "skill_required": ["Dry Table/Display"], "earliest_start": "Continuous", "due_by": "Continuous", "estimated_duration": 0, "task_type": "upkeep", "priority_weight": 520, "allow_multi_assign": true, "recurrence_type": "daily", "areaId": "area_dry_table"
    },
    {
      "id": "upkeep_backroom", "code": "BCLR", "name": "Backroom Cleanliness", "description": "Maintain organization and cleanliness in the produce backroom.",
      "skill_required": ["Backroom Organization"], "earliest_start": "Continuous", "due_by": "Continuous", "estimated_duration": 0, "task_type": "upkeep", "priority_weight": 530, "allow_multi_assign": true, "recurrence_type": "daily", "areaId": "area_backroom"
    }
  ].map(({ skill_required, ...t }) => ({
    ...t,
    id: t.id || uuid(),
    code: t.code || (t.id || uuid()).substring(0, 4).toUpperCase(),
    skill_ids: getSkillIds(skill_required || []),
    recurrence_type: (t.recurrence_type || 'daily') as RecurrenceType,
    task_type: (t.task_type || 'standard') as TaskType,
    allow_multi_assign: t.allow_multi_assign ?? true,
    priority_weight: t.priority_weight || 50,
    estimated_duration: t.estimated_duration || 30,
    earliest_start: t.earliest_start || '07:00',
    due_by: t.due_by || '17:00'
  })),
  explicit_rules: [
    {
      id: uuid(), "task_id": "task_truck",
      "primary_selector": { id: uuid(), mode: "member", value: "m_soloman" },
      "fallback_selectors": [
        { id: uuid(), mode: "member", value: "m_marlon" }
      ],
      "reason_template": "Assigned to {{memberName}} for Truck Unload & Sort (Primary/Fallback Rule)."
    },
    {
      id: uuid(), "task_id": "task_dob_order",
      "primary_selector": { id: uuid(), mode: "member", value: "m_marlon" },
      "fallback_selectors": [
        { id: uuid(), mode: "member", value: "m_james" },
        { id: uuid(), mode: "member", value: "m_deb" },
        { id: uuid(), mode: "member", value: "m_kenneth" },
        { id: uuid(), mode: "member", value: "m_william" }
      ],
      "exclude_day": ["Wed"],
      "reason_template": "Assigned to {{memberName}} for DOB Order (Primary/Fallback Rule)."
    },
    {
      id: uuid(), "task_id": "task_freshpak_order",
      "primary_selector": { id: uuid(), mode: "member", value: "m_sandra" },
      "fallback_selectors": [
        { id: uuid(), mode: "member", value: "m_deb" },
        { id: uuid(), mode: "member", value: "m_beth" },
        { id: uuid(), mode: "member", value: "m_marlon" },
        { id: uuid(), mode: "member", value: "m_james" }
      ],
      "exclude_day": ["Tue"],
      "reason_template": "Assigned to {{memberName}} for Freshpak Order (Primary/Fallback Rule)."
    },
    {
      id: uuid(), "task_id": "task_w1",
      "primary_selector": { id: uuid(), mode: "member", value: "m_sandra" },
      "fallback_selectors": [
        { id: uuid(), mode: "member", value: "m_heidi" },
        { id: uuid(), mode: "member", value: "m_james" },
        { id: uuid(), mode: "member", value: "m_beth" }
      ],
      "reason_template": "Assigned to {{memberName}} for W1 Freshpak Wall Service (Primary/Fallback Rule)."
    },
    {
      id: uuid(), "task_id": "task_w2",
      "primary_selector": { id: uuid(), mode: "member", value: "m_deb" },
      "fallback_selectors": [
        { id: uuid(), mode: "member", value: "m_sandra" }
      ],
      "reason_template": "Assigned to {{memberName}} for W2 Salad/Juice Wall Service (Primary/Fallback Rule)."
    },
    {
      id: uuid(), "task_id": "task_w3",
      "primary_selector": { id: uuid(), mode: "member", value: "m_john" },
      "fallback_selectors": [
        { id: uuid(), mode: "member", value: "m_william" }
      ],
      "reason_template": "Assigned to {{memberName}} for W3 Mirror Wall Service (Primary/Fallback Rule)."
    },
    {
      id: uuid(), "task_id": "task_w4",
      "primary_selector": { id: uuid(), mode: "member", value: "m_heidi" },
      "fallback_selectors": [
        { id: uuid(), mode: "member", value: "m_john" }
      ],
      "reason_template": "Assigned to {{memberName}} for W4 Wet Rack/Herb Service (Primary/Fallback Rule)."
    },
    {
      id: uuid(), "task_id": "task_markdowns",
      "primary_selector": { id: uuid(), mode: "role_tag", value: "Quality Checks" },
      "fallback_selectors": [
        { id: uuid(), mode: "member", value: "m_sandra" },
        { id: uuid(), mode: "member", value: "m_deb" },
        { id: uuid(), mode: "member", value: "m_beth" },
        { id: uuid(), mode: "member", value: "m_william" },
        { id: uuid(), mode: "member", value: "m_nabil" },
        { id: uuid(), mode: "member", value: "m_james" },
        { id: uuid(), mode: "member", value: "m_barry" },
        { id: uuid(), mode: "member", value: "m_victoria" }
      ],
      "reason_template": "Assigned to {{memberName}} for Markdowns (Quality Checks Rule)."
    },
    {
      id: uuid(), "task_id": "task_throwaways",
      "primary_selector": { id: uuid(), mode: "role_tag", value: "Quality Checks" },
      "fallback_selectors": [
        { id: uuid(), mode: "member", value: "m_sandra" },
        { id: uuid(), mode: "member", value: "m_deb" },
        { id: uuid(), mode: "member", value: "m_beth" },
        { id: uuid(), mode: "member", value: "m_william" },
        { id: uuid(), mode: "member", value: "m_nabil" },
        { id: uuid(), mode: "member", value: "m_james" },
        { id: uuid(), mode: "member", value: "m_barry" },
        { id: uuid(), mode: "member", value: "m_victoria" }
      ],
      "reason_template": "Assigned to {{memberName}} for Throwaways (Quality Checks Rule)."
    },
    {
      id: uuid(), "task_id": "task_flashfood",
      "primary_selector": { id: uuid(), mode: "role_tag", value: "Quality Checks" },
      "fallback_selectors": [
        { id: uuid(), mode: "member", value: "m_sandra" },
        { id: uuid(), mode: "member", value: "m_deb" },
        { id: uuid(), mode: "member", value: "m_beth" },
        { id: uuid(), mode: "member", value: "m_william" },
        { id: uuid(), mode: "member", value: "m_nabil" },
        { id: uuid(), mode: "member", value: "m_james" },
        { id: uuid(), mode: "member", value: "m_barry" },
        { id: uuid(), mode: "member", value: "m_victoria" }
      ],
      "reason_template": "Assigned to {{memberName}} for FlashFood Bags (Quality Checks Rule)."
    },
    {
      id: uuid(), "task_id": "task_ims_scan",
      "primary_selector": { id: uuid(), mode: "role_tag", value: "Quality Checks" },
      "fallback_selectors": [
        { id: uuid(), mode: "member", value: "m_sandra" },
        { id: uuid(), mode: "member", value: "m_deb" },
        { id: uuid(), mode: "member", value: "m_beth" },
        { id: uuid(), mode: "member", value: "m_william" },
        { id: uuid(), mode: "member", value: "m_nabil" },
        { id: uuid(), mode: "member", value: "m_james" },
        { id: uuid(), mode: "member", value: "m_barry" },
        { id: uuid(), mode: "member", value: "m_victoria" }
      ],
      "reason_template": "Assigned to {{memberName}} for IMS Audits (Quality Checks Rule)."
    }
  ],
  weekly_schedule: [
    // This entry is dynamically set to the current day to ensure the assignment engine has staff.
    {
      id: uuid(),
      date: dayjs().format(DATE_FORMAT),
      shifts: [
        { id: uuid(), memberId: 'm_soloman', start: '00:00', end: '08:00', shift_class: 'Overnight' },
        { id: uuid(), memberId: 'm_marlon', start: '01:00', end: '09:00', shift_class: 'Overnight' },
        { id: uuid(), memberId: 'm_sandra', start: '06:00', end: '14:00', shift_class: 'Opening' },
        { id: uuid(), memberId: 'm_deb', start: '14:00', end: '22:00', shift_class: 'Closing' },
        { id: uuid(), memberId: 'm_heidi', start: '14:00', end: '22:00', shift_class: 'Closing' },
        { id: uuid(), memberId: 'm_john', start: '08:00', end: '16:00', shift_class: 'Mid-Shift' },
        { id: uuid(), memberId: 'm_james', start: '09:00', end: '17:00', shift_class: 'Mid-Shift' },
        { id: uuid(), memberId: 'm_william', start: '08:00', end: '16:00', shift_class: 'Mid-Shift' },
        { id: uuid(), memberId: 'm_nabil', start: '15:00', end: '22:00', shift_class: 'Closing' },
        { id: uuid(), memberId: 'm_barry', start: '15:00', end: '22:00', shift_class: 'Closing' },
        { id: uuid(), memberId: 'm_victoria', start: '15:00', end: '22:00', shift_class: 'Closing' },
        { id: uuid(), memberId: 'm_alice', start: '06:00', end: '14:30', shift_class: 'Opening' },
        { id: uuid(), memberId: 'm_bob', start: '09:00', end: '17:30', shift_class: 'Mid-Shift' },
        { id: uuid(), memberId: 'm_charlie', start: '07:00', end: '15:30', shift_class: 'Opening' },
      ],
      flags: { source: 'sample_data' }
    }
  ],
  assignments: [],
  templates: [
    {
      id: 'default-template',
      name: 'Default Daily Worklist',
      content: DEFAULT_TEMPLATE_CONTENT,
    },
  ],
  manager_settings: [DEFAULT_MANAGER_SETTINGS],
  areas: [
    { id: 'area_front', name: 'Front Displays', position: 1 },
    { id: 'area_dry_table', name: 'Dry Tables', position: 2 },
    { id: 'area_wall_freshpak', name: 'Freshpak Wall', position: 3 },
    { id: 'area_wall_salad', name: 'Salad Wall', position: 4 },
    { id: 'area_wall_mirror', name: 'Mirror Wall', position: 5 },
    { id: 'area_wall_wet', name: 'Wet Rack/Herbs', position: 6 },
    { id: 'area_floor', name: 'Sales Floor', position: 7 },
    { id: 'area_backroom', name: 'Backroom', position: 8 },
    { id: 'area_office', name: 'Office', position: 9 },
  ],
  order_sets: [
    { id: 'default-order-set', name: 'Default Daily Tasks', scope: 'global', created_at: new Date().toISOString() },
  ],
  order_set_items: [
    // Populate with some default tasks, using IDs from the 'tasks' array above
    { id: uuid(), order_set_id: 'default-order-set', task_id: 't_first_impressions', position: 10 },
    { id: uuid(), order_set_id: 'default-order-set', task_id: 't_t4', position: 20 },
    { id: uuid(), order_set_id: 'default-order-set', task_id: 't_t2', position: 30 },
    { id: uuid(), order_set_id: 'default-order-set', task_id: 't_t1', position: 40 },
    { id: uuid(), order_set_id: 'default-order-set', task_id: 't_t3', position: 50 },
    { id: uuid(), order_set_id: 'default-order-set', task_id: 't_t5', position: 60 },
    { id: uuid(), order_set_id: 'default-order-set', task_id: 't_t6', position: 70 },
    { id: uuid(), order_set_id: 'default-order-set', task_id: 't_t7', position: 80 },
    { id: uuid(), order_set_id: 'default-order-set', task_id: 'task_w1', position: 100 },
    { id: uuid(), order_set_id: 'default-order-set', task_id: 'task_w2', position: 110 },
    { id: uuid(), order_set_id: 'default-order-set', task_id: 'task_w3', position: 120 },
    { id: uuid(), order_set_id: 'default-order-set', task_id: 'task_w4', position: 130 },
    { id: uuid(), order_set_id: 'default-order-set', task_id: 'task_truck', position: 5 },
    { id: uuid(), order_set_id: 'default-order-set', task_id: 'task_dob_order', position: 6 },
    { id: uuid(), order_set_id: 'default-order-set', task_id: 'task_freshpak_order', position: 7 },
    { id: uuid(), order_set_id: 'default-order-set', task_id: 'task_floor_check', position: 210 },
    { id: uuid(), order_set_id: 'default-order-set', task_id: 'task_bag_roll_restock', position: 220 },
    { id: uuid(), order_set_id: 'default-order-set', task_id: 'task_markdowns', position: 300 },
    { id: uuid(), order_set_id: 'default-order-set', task_id: 'task_throwaways', position: 310 },
    { id: uuid(), order_set_id: 'default-order-set', task_id: 'task_flashfood', position: 320 },
    { id: uuid(), order_set_id: 'default-order-set', task_id: 'task_ims_scan', position: 330 },
  ],
  staffing_targets: [
    { id: uuid(), day: 'Mon', area_id: 'area_front', start: '07:00', end: '09:00', required_count: 2 },
    { id: uuid(), day: 'Mon', area_id: 'area_dry_table', start: '07:00', end: '11:00', required_count: 2 },
    { id: uuid(), day: 'Mon', area_id: 'area_wall_salad', start: '07:00', end: '11:00', required_count: 1 },
    { id: uuid(), day: 'Mon', area_id: 'area_backroom', start: '07:00', end: '10:00', required_count: 1 },
    { id: uuid(), day: 'Tue', area_id: 'area_front', start: '07:00', end: '09:00', required_count: 2 },
    { id: uuid(), day: 'Tue', area_id: 'area_dry_table', start: '07:00', end: '11:00', required_count: 2 },
    { id: uuid(), day: 'Wed', area_id: 'area_front', start: '07:00', end: '09:00', required_count: 3 },
  ],
  availability: [
    { id: uuid(), member_id: 'm_alice', day: 'Mon', start: '07:00', end: '15:00' },
    { id: uuid(), member_id: 'm_alice', day: 'Tue', start: '07:00', end: '15:00' },
    { id: uuid(), member_id: 'm_alice', day: 'Wed', start: '07:00', end: '15:00' },
    { id: uuid(), member_id: 'm_bob', day: 'Mon', start: '09:00', end: '17:00' },
    { id: uuid(), member_id: 'm_bob', day: 'Tue', start: '09:00', end: '17:00' },
    { id: uuid(), member_id: 'm_charlie', day: 'Mon', start: '11:00', end: '19:00' },
  ],
  shift_templates: [
    { id: uuid(), name: 'Opening Shift (Early)', start: '06:00', end: '14:00', shift_class: 'Opening', role_tags: ['Produce Lead'] },
    { id: uuid(), name: 'Opening Shift (Standard)', start: '07:00', end: '15:00', shift_class: 'Opening', role_tags: ['Produce Clerk'] },
    { id: uuid(), name: 'Mid-Shift', start: '09:00', end: '17:00', shift_class: 'Mid-Shift', role_tags: ['Produce Clerk'] },
    { id: uuid(), name: 'Closing Shift', start: '14:00', end: '22:00', shift_class: 'Closing', role_tags: ['Produce Clerk'] },
  ],
  planned_shifts: [],
  shift_patterns: [],
};
