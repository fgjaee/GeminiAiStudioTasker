import {
  SupabaseTableData,
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
} from './types';
import { uuid } from './utils/helpers'; // Ensure uuid is imported

export const SUPABASE_MOCK_DELAY = 100; // milliseconds
// Fix: Add PDF_MOCK_TIMEOUT constant
export const PDF_MOCK_TIMEOUT = 1000; // milliseconds for PDF parsing mock delay

export const DATE_FORMAT = 'YYYY-MM-DD';
export const TIME_FORMAT = 'HH:mm';
export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// --- Default Values for Manager Settings ---
export const DEFAULT_MANAGER_SETTINGS: ManagerSettings = {
  id: uuid(), // Stable ID for settings
  floorSlaTime: 480, // 8 hours = 480 minutes
  tieBreakSeed: 42, // Default seed for deterministic assignments
  overCapacityThreshold: 60, // 60 minutes over capacity triggers a warning
  assignmentStartTime: '07:00', // Default start time for tasks
};

// --- Initial Mock Data (seeded from user's provided JSON) ---
const userProvidedTasks: Task[] = [
  {
    "id": "task_inventory",
    "code": "INV",
    "name": "Monthly Full Produce Inventory",
    "description": "Conduct a full inventory count of all produce items.",
    "skill_required": ["Backroom Organization"],
    "priority_weight": 1,
    "earliest_start": "00:00", // Default for EOD deadline
    "due_by": "17:00", // Default for EOD deadline
    "estimated_duration": 180,
    "recurrence_type": "monthly",
    "task_type": "standard",
    "allow_multi_assign": true,
    "areaId": undefined,
  },
  {
    "id": "task_ad_change",
    "code": "AD_CHANGE",
    "name": "Weekly Ad/First Impression Change",
    "description": "Change weekly ad signs and refresh first impression displays.",
    "skill_required": ["Signs/Ad Change"],
    "priority_weight": 2,
    "earliest_start": "00:00",
    "due_by": "09:00",
    "estimated_duration": 60,
    "recurrence_type": "weekly",
    "task_type": "standard",
    "allow_multi_assign": true,
    "areaId": undefined,
  },
  {
    "id": "task_deep_clean",
    "code": "DEEP_CLEAN_SALAD",
    "name": "Weekly Deep Clean - Salad Wall",
    "description": "Perform a thorough deep clean of the salad wall area.",
    "skill_required": ["Salads-Juice Wall"],
    "priority_weight": 3,
    "earliest_start": "00:00", // Default for EOD deadline
    "due_by": "17:00", // Default for EOD deadline
    "estimated_duration": 120,
    "recurrence_type": "weekly",
    "task_type": "standard",
    "allow_multi_assign": true,
    "areaId": undefined,
  },
  {
    "id": "task_ims_audit",
    "code": "IMS_AUDIT_FINAL",
    "name": "IMS Audit Finalization",
    "description": "Finalize IMS audit entries and reports.",
    "skill_required": ["IMS"],
    "priority_weight": 4,
    "earliest_start": "00:00", // Default for EOD deadline
    "due_by": "17:00", // Default for EOD deadline
    "estimated_duration": 30,
    "recurrence_type": "weekly",
    "task_type": "standard",
    "allow_multi_assign": true,
    "areaId": undefined,
  },
  {
    "id": "task_dob_order",
    "code": "DOB_ORDER",
    "name": "DOB Order",
    "description": "Place the daily Department Order Buy (DOB) for produce.",
    "skill_required": ["Ordering"],
    "priority_weight": 5,
    "earliest_start": "00:00",
    "due_by": "07:55",
    "estimated_duration": 90,
    "recurrence_type": "daily",
    "task_type": "standard",
    "allow_multi_assign": true,
    "areaId": undefined,
  },
  {
    "id": "task_freshpak_order",
    "code": "FRESHPAK_ORDER",
    "name": "Freshpak Order",
    "description": "Place the daily Freshpak order.",
    "skill_required": ["Ordering"],
    "priority_weight": 6,
    "earliest_start": "00:00",
    "due_by": "07:55",
    "estimated_duration": 20,
    "recurrence_type": "daily",
    "task_type": "standard",
    "allow_multi_assign": true,
    "areaId": undefined,
  },
  {
    "id": "t_first_impressions",
    "code": "T0",
    "name": "T0: First Impressions",
    "description": "Ensure first impression displays are perfect.",
    "skill_required": ["Dry Table/Display"],
    "priority_weight": 10,
    "earliest_start": "00:00",
    "due_by": "09:00",
    "estimated_duration": 30,
    "recurrence_type": "daily",
    "task_type": "standard",
    "allow_multi_assign": true,
    "areaId": undefined,
  },
  {
    "id": "t_t1",
    "code": "T1",
    "name": "T1: Tropical/Harvest Table",
    "description": "Service and restock the tropical/harvest table.",
    "skill_required": ["Dry Table/Display"],
    "priority_weight": 20,
    "earliest_start": "00:00",
    "due_by": "09:00",
    "estimated_duration": 45,
    "recurrence_type": "daily",
    "task_type": "standard",
    "allow_multi_assign": true,
    "areaId": undefined,
  },
  {
    "id": "t_t2",
    "code": "T2",
    "name": "T2: Apple Bulk/Bagged Table",
    "description": "Service and restock the apple bulk and bagged table.",
    "skill_required": ["Dry Table/Display"],
    "priority_weight": 30,
    "earliest_start": "00:00",
    "due_by": "09:00",
    "estimated_duration": 90,
    "recurrence_type": "daily",
    "task_type": "standard",
    "allow_multi_assign": true,
    "areaId": undefined,
  },
  {
    "id": "t_t3",
    "code": "T3",
    "name": "T3: Berries/Grapes Table",
    "description": "Service and restock the berries and grapes table.",
    "skill_required": ["Dry Table/Display"],
    "priority_weight": 40,
    "earliest_start": "00:00",
    "due_by": "09:00",
    "estimated_duration": 45,
    "recurrence_type": "daily",
    "task_type": "standard",
    "allow_multi_assign": true,
    "areaId": undefined,
  },
  {
    "id": "t_t4",
    "code": "T4",
    "name": "T4: Banana/Citrus Table",
    "description": "Service and restock the banana and citrus table.",
    "skill_required": ["Dry Table/Display"],
    "priority_weight": 50,
    "earliest_start": "00:00",
    "due_by": "09:00",
    "estimated_duration": 45,
    "recurrence_type": "daily",
    "task_type": "standard",
    "allow_multi_assign": true,
    "areaId": undefined,
  },
  {
    "id": "t_t5",
    "code": "T5",
    "name": "T5: Tomato/Pepper Table",
    "description": "Service and restock the tomato and pepper table.",
    "skill_required": ["Dry Table/Display"],
    "priority_weight": 60,
    "earliest_start": "00:00",
    "due_by": "09:00",
    "estimated_duration": 60,
    "recurrence_type": "daily",
    "task_type": "standard",
    "allow_multi_assign": true,
    "areaId": undefined,
  },
  {
    "id": "t_t6",
    "code": "T6",
    "name": "T6: Organic Produce Table",
    "description": "Service and restock the organic produce table.",
    "skill_required": ["Dry Table/Display"],
    "priority_weight": 70,
    "earliest_start": "00:00",
    "due_by": "09:00",
    "estimated_duration": 30,
    "recurrence_type": "daily",
    "task_type": "standard",
    "allow_multi_assign": true,
    "areaId": undefined,
  },
  {
    "id": "t_t7",
    "code": "T7",
    "name": "T7: Potato/Onion Table",
    "description": "Service and restock the potato and onion table.",
    "skill_required": ["Dry Table/Display"],
    "priority_weight": 80,
    "earliest_start": "00:00",
    "due_by": "09:00",
    "estimated_duration": 60,
    "recurrence_type": "daily",
    "task_type": "standard",
    "allow_multi_assign": true,
    "areaId": undefined,
  },
  {
    "id": "task_w1",
    "code": "W1",
    "name": "W1: Freshpak Wall Service",
    "description": "Service and restock the Freshpak wall.",
    "skill_required": ["Freshpak Wall"],
    "priority_weight": 100,
    "earliest_start": "00:00",
    "due_by": "09:00",
    "estimated_duration": 90,
    "recurrence_type": "daily",
    "task_type": "standard",
    "allow_multi_assign": true,
    "areaId": undefined,
  },
  {
    "id": "task_w2",
    "code": "W2",
    "name": "W2: Salad/Juice Wall Service",
    "description": "Service and restock the salad and juice wall.",
    "skill_required": ["Salads-Juice Wall"],
    "priority_weight": 110,
    "earliest_start": "00:00",
    "due_by": "09:00",
    "estimated_duration": 240,
    "recurrence_type": "daily",
    "task_type": "standard",
    "allow_multi_assign": true,
    "areaId": undefined,
  },
  {
    "id": "task_w3",
    "code": "W3",
    "name": "W3: Mirror Wall Service",
    "description": "Service and restock the mirror wall.",
    "skill_required": ["Mirror Wall"],
    "priority_weight": 120,
    "earliest_start": "00:00",
    "due_by": "09:00",
    "estimated_duration": 90,
    "recurrence_type": "daily",
    "task_type": "standard",
    "allow_multi_assign": true,
    "areaId": undefined,
  },
  {
    "id": "task_w4",
    "code": "W4",
    "name": "W4: Wet Rack/Herb Service",
    "description": "Service and restock the wet rack and herb section.",
    "skill_required": ["Wet Rack/Herbs Wall"],
    "priority_weight": 130,
    "earliest_start": "00:00",
    "due_by": "09:00",
    "estimated_duration": 180,
    "recurrence_type": "daily",
    "task_type": "standard",
    "allow_multi_assign": true,
    "areaId": undefined,
  },
  {
    "id": "task_mid_morning_refill",
    "code": "MM_REFILL",
    "name": "Mid-Morning Refill (High Turnover)",
    "description": "Perform mid-morning refill of high turnover items.",
    "skill_required": ["Dry Table/Display"],
    "priority_weight": 200,
    "earliest_start": "00:00",
    "due_by": "11:00",
    "estimated_duration": 30,
    "recurrence_type": "daily",
    "task_type": "standard",
    "allow_multi_assign": true,
    "areaId": undefined,
  },
  {
    "id": "task_floor_check",
    "code": "FLOOR_CHECK",
    "name": "Post-Set Floor Check & Spot Clean",
    "description": "Conduct a floor check after setup and perform spot cleaning.",
    "skill_required": ["Quality Checks"],
    "priority_weight": 210,
    "earliest_start": "00:00",
    "due_by": "11:30",
    "estimated_duration": 15,
    "recurrence_type": "daily",
    "task_type": "standard",
    "allow_multi_assign": true,
    "areaId": undefined,
  },
  {
    "id": "task_bag_roll_restock",
    "code": "BAG_ROLL_RESTOCK",
    "name": "Produce Bag Roll Restock",
    "description": "Restock produce bag rolls throughout the department.",
    "skill_required": ["Quality Checks"],
    "priority_weight": 220,
    "earliest_start": "00:00",
    "due_by": "11:30",
    "estimated_duration": 15,
    "recurrence_type": "daily",
    "task_type": "standard",
    "allow_multi_assign": true,
    "areaId": undefined,
  },
  {
    "id": "task_markdowns",
    "code": "MARKDOWNS",
    "name": "Markdowns",
    "description": "Process markdowns for expiring produce.",
    "skill_required": ["Quality Checks"],
    "priority_weight": 300,
    "earliest_start": "00:00", // Default for EOD deadline
    "due_by": "17:00", // Default for EOD deadline
    "estimated_duration": 60,
    "recurrence_type": "daily",
    "task_type": "standard",
    "allow_multi_assign": true,
    "areaId": undefined,
  },
  {
    "id": "task_throwaways",
    "code": "THROWAWAYS",
    "name": "Throwaways",
    "description": "Process and dispose of unsaleable produce.",
    "skill_required": ["Quality Checks"],
    "priority_weight": 310,
    "earliest_start": "00:00", // Default for EOD deadline
    "due_by": "17:00", // Default for EOD deadline
    "estimated_duration": 45,
    "recurrence_type": "daily",
    "task_type": "standard",
    "allow_multi_assign": true,
    "areaId": undefined,
  },
  {
    "id": "task_flashfood",
    "code": "FLASHFOOD",
    "name": "FlashFood Bags",
    "description": "Prepare FlashFood bags for donation/sale.",
    "skill_required": ["Quality Checks"],
    "priority_weight": 320,
    "earliest_start": "00:00", // Default for EOD deadline
    "due_by": "17:00", // Default for EOD deadline
    "estimated_duration": 30,
    "recurrence_type": "daily",
    "task_type": "standard",
    "allow_multi_assign": true,
    "areaId": undefined,
  },
  {
    "id": "task_ims_scan",
    "code": "IMS_SCAN",
    "name": "IMS Audits",
    "description": "Conduct IMS audits and cycle counts.",
    "skill_required": ["Quality Checks"],
    "priority_weight": 330,
    "earliest_start": "00:00", // Default for EOD deadline
    "due_by": "17:00", // Default for EOD deadline
    "estimated_duration": 60,
    "recurrence_type": "daily",
    "task_type": "standard",
    "allow_multi_assign": true,
    "areaId": undefined,
  },
  {
    "id": "task_process_organics",
    "code": "PROCESS_ORGANICS",
    "name": "Process Organics",
    "description": "Continuously process and stock organic produce.",
    "skill_required": ["Backroom Organization"],
    "priority_weight": 500,
    "earliest_start": "00:00",
    "due_by": "Continuous",
    "estimated_duration": 0,
    "recurrence_type": "daily",
    "task_type": "upkeep",
    "allow_multi_assign": true,
    "areaId": undefined,
  },
  {
    "id": "upkeep_sweep",
    "code": "SWEEP",
    "name": "Sweep & Mop Floor",
    "description": "Perform general floor sweeping and mopping.",
    "skill_required": ["Quality Checks"],
    "priority_weight": 510,
    "earliest_start": "00:00",
    "due_by": "Continuous",
    "estimated_duration": 0,
    "recurrence_type": "daily",
    "task_type": "upkeep",
    "allow_multi_assign": true,
    "areaId": undefined,
  },
  {
    "id": "upkeep_facing",
    "code": "FACING",
    "name": "Facing Displays",
    "description": "Maintain faced and appealing displays.",
    "skill_required": ["Dry Table/Display"],
    "priority_weight": 520,
    "earliest_start": "00:00",
    "due_by": "Continuous",
    "estimated_duration": 0,
    "recurrence_type": "daily",
    "task_type": "upkeep",
    "allow_multi_assign": true,
    "areaId": undefined,
  },
  {
    "id": "upkeep_backroom",
    "code": "BACKROOM_CLEAN",
    "name": "Backroom Cleanliness",
    "description": "Maintain cleanliness and organization in the backroom.",
    "skill_required": ["Backroom Organization"],
    "priority_weight": 530,
    "earliest_start": "00:00",
    "due_by": "Continuous",
    "estimated_duration": 0,
    "recurrence_type": "daily",
    "task_type": "upkeep",
    "allow_multi_assign": true,
    "areaId": undefined,
  },
];

const userProvidedRules: ExplicitRule[] = [
  {
    "id": uuid(),
    "taskId": "task_dob_order",
    "primary_selector": { id: uuid(), mode: "member", value: "m_marlon" },
    "fallback_selectors": [
      { id: uuid(), mode: "member", value: "m_james" },
      { id: uuid(), mode: "member", value: "m_deb" },
      { id: uuid(), mode: "member", value: "m_kenneth" },
      { id: uuid(), mode: "member", value: "m_william" }
    ],
    "exclude_day": ["Wednesday"],
    "reason_template": "Assigned by explicit rule: DOB Order to primary member."
  },
  {
    "id": uuid(),
    "taskId": "task_freshpak_order",
    "primary_selector": { id: uuid(), mode: "member", value: "m_sandra" },
    "fallback_selectors": [
      { id: uuid(), mode: "member", value: "m_deb" },
      { id: uuid(), mode: "member", value: "m_beth" },
      { id: uuid(), mode: "member", value: "m_marlon" },
      { id: uuid(), mode: "member", value: "m_james" }
    ],
    "exclude_day": ["Tuesday"],
    "reason_template": "Assigned by explicit rule: Freshpak Order to primary member."
  },
  {
    "id": uuid(),
    "taskId": "task_w1",
    "primary_selector": { id: uuid(), mode: "member", value: "m_sandra" },
    "fallback_selectors": [
      { id: uuid(), mode: "member", value: "m_heidi" },
      { id: uuid(), mode: "member", value: "m_james" },
      { id: uuid(), mode: "member", value: "m_beth" }
    ],
    "reason_template": "Assigned by explicit rule: W1: Freshpak Wall Service to primary member."
  },
  {
    "id": uuid(),
    "taskId": "task_w2",
    "primary_selector": { id: uuid(), mode: "member", value: "m_deb" },
    "fallback_selectors": [
      { id: uuid(), mode: "member", value: "m_sandra" }
    ],
    "reason_template": "Assigned by explicit rule: W2: Salad/Juice Wall Service to primary member."
  },
  {
    "id": uuid(),
    "taskId": "task_w3",
    "primary_selector": { id: uuid(), mode: "member", value: "m_john" },
    "fallback_selectors": [
      { id: uuid(), mode: "member", value: "m_william" }
    ],
    "reason_template": "Assigned by explicit rule: W3: Mirror Wall Service to primary member."
  },
  {
    "id": uuid(),
    "taskId": "task_w4",
    "primary_selector": { id: uuid(), mode: "member", value: "m_heidi" },
    "fallback_selectors": [
      { id: uuid(), mode: "member", value: "m_john" }
    ],
    "reason_template": "Assigned by explicit rule: W4: Wet Rack/Herb Service to primary member."
  },
  {
    "id": uuid(),
    "taskId": "task_markdowns",
    "primary_selector": { id: uuid(), mode: "tag", value: "Quality Checks" }, // Using skillRequired as tag
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
    "reason_template": "Assigned by explicit rule: Markdowns (Expiration Check)."
  },
  {
    "id": uuid(),
    "taskId": "task_throwaways",
    "primary_selector": { id: uuid(), mode: "tag", value: "Quality Checks" }, // Using skillRequired as tag
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
    "reason_template": "Assigned by explicit rule: Throwaways Processing."
  },
  {
    "id": uuid(),
    "taskId": "task_flashfood",
    "primary_selector": { id: uuid(), mode: "tag", value: "Quality Checks" }, // Using skillRequired as tag
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
    "reason_template": "Assigned by explicit rule: FlashFood Bagging."
  },
  {
    "id": uuid(),
    "taskId": "task_ims_scan",
    "primary_selector": { id: uuid(), mode: "tag", value: "Quality Checks" }, // Using skillRequired as tag
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
    "reason_template": "Assigned by explicit rule: IMS Scan/Cycle Count."
  }
];


export const initialMockData: SupabaseTableData = {
  members: [], // User's JSON had an empty members array
  tasks: userProvidedTasks,
  explicit_rules: userProvidedRules,
  weekly_schedule: [],
  assignments: [],
  templates: [
    {
      id: uuid(),
      name: 'Default Daily Worklist',
      content: `# {{department}} Daily Worklist - {{date}}

**Objective:** Ensure a productive and well-maintained department for an excellent customer experience.
**Important Notes:**
*   Floor SLA time: {{floorSlaTime}} minutes
*   All tasks must be completed with attention to detail and food safety.
*   Communicate any issues or delays to management immediately.

---

## Assignments by Team Member

| Team Member          | Task                          | Duration   | Start   | End     | Reason                 |
| :------------------- | :---------------------------- | :--------- | :------ | :------ | :--------------------- |
{{#each assignmentsByMember}}
| **{{this.memberName}}** |                             |            |         |         |                        |
{{#each this.tasks}}
|                      | {{this.taskName}}             | {{this.duration}} mins | {{this.startTime}} | {{this.endTime}} | {{this.reason}}        |
{{/each}}
|                      | **Total Workload:**           | **{{this.totalDuration}} mins** |         |         |                        |
{{/each}}

---

## Summary

{{#if unassignedTasks.length}}
### Unassigned Tasks:
{{#each unassignedTasks}}
*   {{this.taskName}} ({{this.duration}} mins) - Due by: {{this.dueBy}}
{{/each}}
{{/if}}

{{#if overCapacityMembers.length}}
### Over-Capacity Members:
{{#each overCapacityMembers}}
*   {{this.memberName}}: {{this.overCapacity}} mins over capacity.
{{/each}}
{{/if}}

---

**Check-in:** __________ **Time:** __________
**Check-out:** __________ **Time:** __________

**Manager Signature:** _________________________
`    },
  ],
  manager_settings: [DEFAULT_MANAGER_SETTINGS],
  areas: [ // Sample Areas
    { id: uuid(), name: 'Dry Tables', group_name: 'Sales Floor', position: 1 },
    { id: uuid(), name: 'Wall Displays', group_name: 'Sales Floor', position: 2 },
    { id: uuid(), name: 'Wet Rack', group_name: 'Sales Floor', position: 3 },
    { id: uuid(), name: 'Backroom', group_name: 'Operations', position: 4 },
    { id: uuid(), name: 'Ordering', group_name: 'Operations', position: 5 },
  ],
  order_sets: [],
  order_set_items: [],
};