// services/supabaseMock.ts
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
  SupabaseTableData,
  ParsedScheduleData,
  Blob,
} from '../types';
import { generateChecksum } from '../utils/helpers';
import { parseSchedulePdfMock } from './pdfParserMock'; // Import the mock PDF parser
import dayjs from 'dayjs';

// In-memory data store for the mock
let mockData: SupabaseTableData = {
  members: [],
  tasks: [],
  explicit_rules: [],
  weekly_schedule: [],
  assignments: [],
  templates: [],
  manager_settings: [],
  areas: [],
  order_sets: [],
  order_set_items: [],
};

// Function to initialize or reset mock data with a sample
export const initializeMockData = (data?: SupabaseTableData) => {
  if (data) {
    mockData = JSON.parse(JSON.stringify(data)); // Deep copy
  } else {
    // Default sample data if none provided
    mockData = {
      members: [
        { id: 'mem-1', name: 'Alice', title: 'Produce Lead', role_tags: ['Lead', 'Produce'], strengths: ['Ordering', 'Merchandising'], fixed_commitments_minutes: 60, default_tasks: [] },
        { id: 'mem-2', name: 'Bob', title: 'Produce Clerk', role_tags: ['Clerk', 'Produce'], strengths: ['Stocking', 'Customer Service'], fixed_commitments_minutes: 30, default_tasks: [] },
        { id: 'mem-3', name: 'Charlie', title: 'Produce Clerk', role_tags: ['Clerk', 'Produce'], strengths: ['Receiving', 'Cleaning'], fixed_commitments_minutes: 0, default_tasks: [] },
      ],
      tasks: [
        { id: 'task-1', code: 'TROP', name: 'Tropical Table', description: 'Stock tropical fruit table', skill_required: ['Merchandising'], priority_weight: 10, earliest_start: '07:00', due_by: '09:00', estimated_duration: 30, recurrence_type: 'daily', task_type: 'standard', allow_multi_assign: false, areaId: 'area-1' },
        { id: 'task-2', code: 'WIP', name: 'Wipe Down Shelves', description: 'Clean produce shelving units', skill_required: ['Cleaning'], priority_weight: 90, earliest_start: '16:00', due_by: 'EOD', estimated_duration: 15, recurrence_type: 'daily', task_type: 'upkeep', allow_multi_assign: true, areaId: 'area-2' },
        { id: 'task-3', code: 'ORDER', name: 'Place Produce Order', description: 'Order produce for next day', skill_required: ['Ordering', 'Lead'], priority_weight: 5, earliest_start: '08:00', due_by: '10:00', estimated_duration: 60, recurrence_type: 'daily', task_type: 'standard', allow_multi_assign: false, areaId: 'area-1' },
        { id: 'task-4', code: 'REC', name: 'Receive Truck', description: 'Unload and process produce truck', skill_required: ['Receiving'], priority_weight: 20, earliest_start: '06:00', due_by: '08:00', estimated_duration: 90, recurrence_type: 'daily', task_type: 'standard', allow_multi_assign: true, areaId: 'area-3' },
      ],
      explicit_rules: [
        {
          id: 'rule-1', taskId: 'task-3', primary_selector: { id: 'sel-1', mode: 'tag', value: 'Lead' }, reason_template: 'Assigned to Lead for ordering.',
          fallback_selectors: [{ id: 'sel-2', mode: 'tag', value: 'Produce' }],
          earliest_start: '08:30', due_by: '10:30',
        },
      ],
      weekly_schedule: [
        { id: 'ws-1', date: dayjs().format('YYYY-MM-DD'), shifts: [{ id: 'shift-1-1', memberId: 'mem-1', start: '07:00', end: '15:00', shift_class: 'Opening' }, { id: 'shift-1-2', memberId: 'mem-2', start: '09:00', end: '17:00', shift_class: 'Mid-Shift' }] },
        { id: 'ws-2', date: dayjs().add(1, 'day').format('YYYY-MM-DD'), shifts: [{ id: 'shift-2-1', memberId: 'mem-1', start: '08:00', end: '16:00', shift_class: 'Opening' }, { id: 'shift-2-2', memberId: 'mem-3', start: '14:00', end: '22:00', shift_class: 'Closing' }] },
      ],
      assignments: [],
      templates: [
        {
          id: 'tmpl-1',
          name: 'Standard Daily Worklist',
          content: `## Worklist for {{date}}

### Store: {{store}}
### Department: {{department}}
### Floor SLA Time: {{floorSlaTime}} minutes

| Member           | Task             | Duration | Start | End | Reason                    |
|------------------|------------------|----------|-------|-----|---------------------------|
{{#each assignmentsByMember}}
| **{{this.memberName}}** | | | | | |
{{#each this.tasks}}
| | {{this.taskName}} | {{this.duration}} mins | {{this.startTime}} | {{this.endTime}} | {{this.reason}} |
{{/each}}
| | **Total Workload:** | **{{this.totalDuration}} mins** | | | |
{{/each}}

{{#if unassignedTasks.length}}
### Unassigned Tasks:
{{#each unassignedTasks}}
*   {{this.taskName}} ({{this.duration}} mins) - Due by: {{this.dueBy}}
{{/each}}
{{/if}}

{{#if overCapacityMembers.length}}
### Over-Capacity Members:
{{#each overCapacityMembers}}
*   {{this.memberName}}: {{this.overCapacity}} mins over capacity
{{/each}}
{{/if}}
`,
        },
      ],
      manager_settings: [
        { id: 'settings-1', floorSlaTime: 240, tieBreakSeed: 12345, overCapacityThreshold: 30, assignmentStartTime: '07:00' }
      ],
      areas: [
        { id: 'area-1', name: 'Sales Floor' },
        { id: 'area-2', name: 'Back Room' },
        { id: 'area-3', name: 'Receiving' },
      ],
      order_sets: [],
      order_set_items: [],
    };
  }
  console.log('Supabase Mock: Data initialized.', mockData);
};

// Initialize with sample data on load
initializeMockData();

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const supabaseMock = {
  auth: {
    signIn: async (credentials: any) => {
      await delay(200);
      console.log('Supabase Mock: Sign in attempt.', credentials);
      if (credentials.email === 'user@example.com' && credentials.password === 'password') {
        return { data: { user: { id: 'mock-user-1', email: 'user@example.com' } }, error: null };
      }
      return { data: null, error: new Error('Invalid credentials') };
    },
    signOut: async () => {
      await delay(100);
      console.log('Supabase Mock: Sign out.');
      return { error: null };
    },
    getSession: async () => {
      await delay(50);
      // Always return a session for simplicity in mock, or null if no user logged in
      return { data: { session: { user: { id: 'mock-user-1', email: 'user@example.com' } } }, error: null };
    }
  },
  from: <T>(tableName: keyof SupabaseTableData) => ({
    select: async (): Promise<{ data: T[] | null; error: Error | null }> => {
      await delay(100);
      console.log(`Supabase Mock: Selecting from ${tableName}`);
      const data = mockData[tableName] as T[];
      return { data: JSON.parse(JSON.stringify(data)), error: null }; // Return a deep copy
    },
    // Fix: Add explicit type for records to include 'id: string'
    upsert: async (records: (T & { id: string })[]): Promise<{ data: T[] | null; error: Error | null }> => {
      await delay(150);
      console.log(`Supabase Mock: Upserting into ${tableName}`, records);
      const currentRecords = mockData[tableName] as (T & { id: string })[];
      const upsertedRecords: T[] = [];

      for (const record of records) {
        const index = currentRecords.findIndex(r => r.id === record.id);
        if (index !== -1) {
          currentRecords[index] = record; // Update existing
        } else {
          currentRecords.push(record); // Insert new
        }
        upsertedRecords.push(record);
      }
      mockData = { ...mockData, [tableName]: currentRecords };
      return { data: JSON.parse(JSON.stringify(upsertedRecords)), error: null };
    },
    // Fix: Add explicit type for deleted record to include 'id: string'
    delete: async (id: string): Promise<{ data: (T & { id: string }) | null; error: Error | null }> => {
      await delay(150);
      console.log(`Supabase Mock: Deleting from ${tableName} with id: ${id}`);
      let deletedRecord: (T & { id: string }) | null = null;
      const currentRecords = mockData[tableName] as (T & { id: string })[];
      const initialLength = currentRecords.length;
      mockData = {
        ...mockData,
        [tableName]: currentRecords.filter(record => {
          if (record.id === id) {
            deletedRecord = record;
            return false;
          }
          return true;
        })
      };
      if (currentRecords.length < initialLength) {
        return { data: deletedRecord, error: null };
      }
      return { data: null, error: new Error(`Record with id ${id} not found in ${tableName}`) };
    },
  }),
  functions: {
    invoke: async <T>(functionName: string, payload: any): Promise<{ data: T | null; error: Error | null }> => {
      await delay(200); // Simulate network latency
      console.log(`Supabase Mock: Invoking function "${functionName}" with payload:`, payload);
      if (functionName === 'parse-schedule-pdf') {
        try {
          // The mock PDF parser directly uses fileChecksum and fileContent from payload
          const parsedData = await parseSchedulePdfMock(payload.fileChecksum, payload.fileContent);
          return { data: parsedData as T, error: null };
        } catch (err) {
          console.error('Supabase Mock: Error in parse-schedule-pdf mock', err);
          return { data: null, error: err as Error };
        }
      }
      return { data: null, error: new Error(`Unknown function: ${functionName}`) };
    },
  },
  storage: {
    from: (bucketName: string) => ({
      upload: async (path: string, file: File | Blob, options?: { contentType?: string }): Promise<{ data: { path: string } | null; error: Error | null }> => {
        await delay(300); // Simulate upload time
        console.log(`Supabase Mock: Uploading to bucket "${bucketName}" at path "${path}"`, file);
        // In a real scenario, you'd store the file. Here, we just return success.
        return { data: { path }, error: null };
      },
      // You might add download/remove methods here if needed
    }),
  },
};