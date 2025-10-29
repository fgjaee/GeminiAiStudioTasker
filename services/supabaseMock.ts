// services/supabaseMock.ts
import {
  SupabaseTableData,
  SupabaseTableName,
  Member,
  Task,
  ExplicitRule,
  WeeklyScheduleDay,
  Assignment,
  Template,
  ManagerSettings,
  ParsedScheduleData,
  Area,
  OrderSet,
  OrderSetItem,
  StaffingTarget,
  Availability,
  ShiftTemplate,
  PlannedShift,
  ShiftPattern,
  ID, 
  Skill,
  MemberSkill,
  MemberAlias,
} from '../types';
import { initialMockData, MOCK_DB_DELAY } from '../constants';
import {
  normalizeMembers,
  normalizeTasks,
  normalizeRules,
  normalizeWeeklySchedule,
  normalizeAssignments,
  normalizeTemplates,
  normalizeManagerSettings,
  normalizeAreas,
  normalizeOrderSets,
  normalizeOrderSetItems,
  normalizeStaffingTargets,
  normalizeAvailability,
  normalizeShiftTemplates,
  normalizePlannedShifts,
  normalizeShiftPatterns,
} from '../utils/normalizers';
import { uuid } from '../utils/helpers';
import { parseSchedulePdfMock } from './pdfParserMock_legacy'; // Mock PDF parser

const LOCAL_STORAGE_KEY = 'worklist_automator_db';

// Function to load from local storage
const loadDatabaseFromStorage = (): SupabaseTableData | null => {
  try {
    const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedData) {
      return JSON.parse(storedData);
    }
    return null;
  } catch (error) {
    console.error("Failed to load data from localStorage", error);
    localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear corrupted data
    return null;
  }
};

// Function to save to local storage
const saveDatabaseToStorage = (db: SupabaseTableData) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
  } catch (error) {
    console.error("Failed to save data to localStorage", error);
  }
};


// In-memory mock database
let mockDatabase: SupabaseTableData;
const storedDb = loadDatabaseFromStorage();

if (storedDb) {
  mockDatabase = storedDb;
  console.log("Mock DB: Loaded from localStorage.");
} else {
  mockDatabase = JSON.parse(JSON.stringify(initialMockData));
  saveDatabaseToStorage(mockDatabase);
  console.log("Mock DB: Initialized with default data and saved to localStorage.");
}


// --- Helper to deep clone data (to prevent direct mutation of mockDatabase state) ---
const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

// --- Mock Supabase Client ---
export const supabaseMock = {
  // Mock Auth Service
  auth: {
    signIn: async () => {
      await new Promise(resolve => setTimeout(resolve, MOCK_DB_DELAY));
      console.log("Mock Auth: Signed in");
      return { data: { user: { id: 'mock-user', email: 'user@example.com' } }, error: null };
    },
    signOut: async () => {
      await new Promise(resolve => setTimeout(resolve, MOCK_DB_DELAY));
      console.log("Mock Auth: Signed out");
      return { error: null };
    },
  },

  // Mock Database Service
  // FIX: Removed generic constraint `extends { id?: ID }` to support tables without a single 'id' primary key, like 'member_skills'.
  from: <T>(tableName: SupabaseTableName) => {
    return {
      select: async () => {
        await new Promise(resolve => setTimeout(resolve, MOCK_DB_DELAY));
        console.log(`Mock DB: Selecting from ${tableName}`);
        const data = deepClone(mockDatabase[tableName]);
        let normalizedData: T[] = [];
        switch (tableName) {
          case 'members': normalizedData = normalizeMembers(data as Member[]) as unknown as T[]; break;
          case 'tasks': normalizedData = normalizeTasks(data as Task[]) as unknown as T[]; break;
          case 'explicit_rules': normalizedData = normalizeRules(data as ExplicitRule[]) as unknown as T[]; break;
          case 'weekly_schedule': normalizedData = normalizeWeeklySchedule(data as WeeklyScheduleDay[]) as unknown as T[]; break;
          case 'assignments': normalizedData = normalizeAssignments(data as Assignment[]) as unknown as T[]; break;
          case 'templates': normalizedData = normalizeTemplates(data as Template[]) as unknown as T[]; break;
          case 'manager_settings': normalizedData = normalizeManagerSettings(data as ManagerSettings[]) as unknown as T[]; break;
          case 'areas': normalizedData = normalizeAreas(data as Area[]) as unknown as T[]; break;
          case 'order_sets': normalizedData = normalizeOrderSets(data as OrderSet[]) as unknown as T[]; break;
          case 'order_set_items': normalizedData = normalizeOrderSetItems(data as OrderSetItem[]) as unknown as T[]; break;
          case 'staffing_targets': normalizedData = normalizeStaffingTargets(data as StaffingTarget[]) as unknown as T[]; break;
          case 'availability': normalizedData = normalizeAvailability(data as Availability[]) as unknown as T[]; break;
          case 'shift_templates': normalizedData = normalizeShiftTemplates(data as ShiftTemplate[]) as unknown as T[]; break;
          case 'planned_shifts': normalizedData = normalizePlannedShifts(data as PlannedShift[]) as unknown as T[]; break;
          case 'shift_patterns': normalizedData = normalizeShiftPatterns(data as ShiftPattern[]) as unknown as T[]; break;
          case 'skills': normalizedData = data as unknown as T[]; break; // Assuming no special normalization needed for now
          case 'member_skills': normalizedData = data as unknown as T[]; break;
          case 'member_aliases': normalizedData = data as unknown as T[]; break;
          default:
            console.warn(`Mock DB: Unknown table ${tableName}`);
            normalizedData = data as unknown as T[]; // Fallback
            break;
        }
        return { data: normalizedData, error: null };
      },
      upsert: async (records: T | T[]) => {
        await new Promise(resolve => setTimeout(resolve, MOCK_DB_DELAY));
        const recordsArray = Array.isArray(records) ? records : [records];
        console.log(`Mock DB: Upserting into ${tableName}`, recordsArray);

        recordsArray.forEach(record => {
          // FIX: Cast record to any to check for 'id' property without a generic constraint.
          // Don't assign an ID to member_skills as it's a join table.
          if (tableName !== 'member_skills' && typeof record === 'object' && record && 'id' in record && !(record as any).id) {
            (record as any).id = uuid(); // Assign ID if new
          }

          // Apply normalization before storing to ensure consistency
          let normalizedRecord: T;
          switch (tableName) {
            case 'members': normalizedRecord = normalizeMembers([record as unknown as Member])[0] as unknown as T; break;
            case 'tasks': normalizedRecord = normalizeTasks([record as unknown as Task])[0] as unknown as T; break;
            case 'explicit_rules': normalizedRecord = normalizeRules([record as unknown as ExplicitRule])[0] as unknown as T; break;
            case 'weekly_schedule': normalizedRecord = normalizeWeeklySchedule([record as unknown as WeeklyScheduleDay])[0] as unknown as T; break;
            case 'assignments': normalizedRecord = normalizeAssignments([record as unknown as Assignment])[0] as unknown as T; break;
            case 'templates': normalizedRecord = normalizeTemplates([record as unknown as Template])[0] as unknown as T; break;
            case 'manager_settings': normalizedRecord = normalizeManagerSettings([record as unknown as ManagerSettings])[0] as unknown as T; break;
            case 'areas': normalizedRecord = normalizeAreas([record as unknown as Area])[0] as unknown as T; break;
            case 'order_sets': normalizedRecord = normalizeOrderSets([record as unknown as OrderSet])[0] as unknown as T; break;
            case 'order_set_items': normalizedRecord = normalizeOrderSetItems([record as unknown as OrderSetItem])[0] as unknown as T; break;
            case 'staffing_targets': normalizedRecord = normalizeStaffingTargets([record as unknown as StaffingTarget])[0] as unknown as T; break;
            case 'availability': normalizedRecord = normalizeAvailability([record as unknown as Availability])[0] as unknown as T; break;
            case 'shift_templates': normalizedRecord = normalizeShiftTemplates([record as unknown as ShiftTemplate])[0] as unknown as T; break;
            case 'planned_shifts': normalizedRecord = normalizePlannedShifts([record as unknown as PlannedShift])[0] as unknown as T; break;
            case 'shift_patterns': normalizedRecord = normalizeShiftPatterns([record as unknown as ShiftPattern])[0] as unknown as T; break;
            case 'skills': normalizedRecord = record as unknown as T; break;
            case 'member_skills': normalizedRecord = record as unknown as T; break;
            case 'member_aliases': normalizedRecord = record as unknown as T; break;
            default: normalizedRecord = record; break;
          }

          const table = mockDatabase[tableName] as any[];
          
          // FIX: Handle member_skills with a composite key (member_id, skill_id) for upsert logic.
          if (tableName === 'member_skills') {
            const msRecord = normalizedRecord as unknown as MemberSkill;
            const index = (table as MemberSkill[]).findIndex(r => r.member_id === msRecord.member_id && r.skill_id === msRecord.skill_id);
            if (index > -1) {
              table[index] = normalizedRecord;
            } else {
              table.push(normalizedRecord);
            }
          } else {
            const typedRecord = normalizedRecord as any;
            const index = 'id' in typedRecord ? table.findIndex((r: { id: string }) => r.id === typedRecord.id) : -1;

            if (index > -1) {
              table[index] = normalizedRecord;
            } else {
              table.push(normalizedRecord);
            }
          }
        });
        saveDatabaseToStorage(mockDatabase); // Persist changes
        return { data: recordsArray as unknown as T[], error: null };
      },
      delete: async (id: ID) => {
        await new Promise(resolve => setTimeout(resolve, MOCK_DB_DELAY));
        console.log(`Mock DB: Deleting from ${tableName} with ID ${id}`);
        const initialLength = mockDatabase[tableName].length;
        (mockDatabase[tableName] as any) = (mockDatabase[tableName] as any[]).filter((r: any) => r.id !== id);
        saveDatabaseToStorage(mockDatabase); // Persist changes

        if (mockDatabase[tableName].length < initialLength) {
          return { data: { id }, error: null };
        }
        return { data: null, error: new Error(`Record with ID ${id} not found in ${tableName}`) };
      },
      deleteMatch: async (query: object) => {
        await new Promise(resolve => setTimeout(resolve, MOCK_DB_DELAY));
        console.log(`Mock DB: Deleting from ${tableName} with query`, query);
        const initialLength = mockDatabase[tableName].length;
        (mockDatabase[tableName] as any) = (mockDatabase[tableName] as any[]).filter((r: any) => {
          for (const key in query) {
            if (r[key] !== (query as any)[key]) {
              return true; // Keep if it doesn't match
            }
          }
          return false; // Discard if all keys match
        });
        saveDatabaseToStorage(mockDatabase); // Persist changes

        if (mockDatabase[tableName].length < initialLength) {
          return { error: null };
        }
        return { error: new Error(`Record with query ${JSON.stringify(query)} not found in ${tableName}`) };
      },
    };
  },

  // Mock Functions Service
  functions: {
    invoke: async <T>(functionName: string, payload: any) => {
      await new Promise(resolve => setTimeout(resolve, MOCK_DB_DELAY));
      console.log(`Mock Functions: Invoking ${functionName} with payload`, payload);
      if (functionName === 'parse-schedule-pdf' || functionName === 'parse-schedule-pdf') {
        const result: ParsedScheduleData = await parseSchedulePdfMock(payload.fileChecksum, payload.fileContent);
        return { data: result as T, error: null };
      }
      if (functionName === 'planner-auto-fill' || functionName === 'planner-repair-coverage' || functionName === 'planner-suggest-plan') {
        // This is where Gemini API would be called. For mock, return structured data.
        console.log("Mock Functions: Simulating planner AI call.");
        return { data: { suggestions: "AI suggests a balanced schedule considering all constraints. Here's a draft." } as T, error: null };
      }
      return { data: null, error: new Error('Mock Function not found') };
    },
  },

  // Mock Storage Service
  storage: {
    from: (bucketName: string) => {
      return {
        upload: async (path: string, file: File | Blob, options?: { contentType?: string }) => {
          await new Promise(resolve => setTimeout(resolve, MOCK_DB_DELAY));
          console.log(`Mock Storage: Uploading to bucket ${bucketName} at ${path}`);

          // Simulate file content storage, not actually storing it.
          // For a real app, 'file' would be streamed/converted
          const fileContent = (file as File).name; // Using name for mock representation

          return { data: { path: path, id: uuid(), content: fileContent }, error: null };
        },
        download: async (path: string) => {
          await new Promise(resolve => setTimeout(resolve, MOCK_DB_DELAY));
          console.log(`Mock Storage: Downloading from bucket at ${path}`);
          // Simulate download for a file that was "uploaded"
          if (path.includes('schedules/')) {
            // Return a mock Blob or Buffer. For simplicity, return a string or base664 placeholder.
            const mockPdfContent = "base64encodedmockpdfcontent";
            const mockBlob = new Blob([mockPdfContent], { type: 'application/pdf' });
            return { data: mockBlob, error: null };
          }
          return { data: null, error: new Error('Mock file not found') };
        },
      };
    },
  },

  // Internal method to reset mock database (for import/clear data)
  _reset: (data: SupabaseTableData = initialMockData) => {
    mockDatabase = deepClone(data);
    // Apply normalizers to ensure all IDs are present for imported/reset data
    mockDatabase = {
      members: normalizeMembers(mockDatabase.members),
      tasks: normalizeTasks(mockDatabase.tasks),
      explicit_rules: normalizeRules(mockDatabase.explicit_rules),
      weekly_schedule: normalizeWeeklySchedule(mockDatabase.weekly_schedule),
      assignments: normalizeAssignments(mockDatabase.assignments),
      templates: normalizeTemplates(mockDatabase.templates),
      manager_settings: normalizeManagerSettings(mockDatabase.manager_settings),
      areas: normalizeAreas(mockDatabase.areas),
      order_sets: normalizeOrderSets(mockDatabase.order_sets),
      order_set_items: normalizeOrderSetItems(mockDatabase.order_set_items),
      staffing_targets: normalizeStaffingTargets(mockDatabase.staffing_targets),
      availability: normalizeAvailability(mockDatabase.availability),
      shift_templates: normalizeShiftTemplates(mockDatabase.shift_templates),
      planned_shifts: normalizePlannedShifts(mockDatabase.planned_shifts),
      shift_patterns: normalizeShiftPatterns(mockDatabase.shift_patterns),
      skills: mockDatabase.skills || [],
      member_skills: mockDatabase.member_skills || [],
      member_aliases: mockDatabase.member_aliases || [],
    };
    saveDatabaseToStorage(mockDatabase); // Persist reset state
    console.log("Mock DB: Reset to initial state or imported data.");
  },
};