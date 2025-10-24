import {
  SupabaseTableData,
  SupabaseTableName,
  SelectResponse,
  UpsertResponse,
  InvokeResponse,
  UploadResponse,
  Member,
  Task,
  ExplicitRule,
  WeeklyScheduleDay,
  Assignment,
  Template,
  ManagerSettings,
  ParsedScheduleData,
  Area, // New import
  OrderSet, // New import
  OrderSetItem, // New import
  // Re-export Blob from @google/genai as it's used directly here for mock
  Blob,
} from '../types';
import { initialMockData, SUPABASE_MOCK_DELAY } from '../constants';
import { generateChecksum, uuid } from '../utils/helpers';
import { parseSchedulePdfMock } from './pdfParserMock';
import {
  normalizeMembers,
  normalizeTasks,
  normalizeRules,
  normalizeWeeklySchedule,
  normalizeAssignments,
  normalizeTemplates,
  normalizeManagerSettings,
  normalizeAreas, // New import
  normalizeOrderSets, // New import
  normalizeOrderSetItems, // New import
} from '../utils/normalizers';


let mockDatabase: SupabaseTableData = JSON.parse(JSON.stringify(initialMockData)); // Deep copy to allow mutation

// Normalize initial mock data immediately
mockDatabase = {
  members: normalizeMembers(mockDatabase.members),
  tasks: normalizeTasks(mockDatabase.tasks),
  explicit_rules: normalizeRules(mockDatabase.explicit_rules),
  weekly_schedule: normalizeWeeklySchedule(mockDatabase.weekly_schedule),
  assignments: normalizeAssignments(mockDatabase.assignments),
  templates: normalizeTemplates(mockDatabase.templates),
  manager_settings: normalizeManagerSettings(mockDatabase.manager_settings),
  areas: normalizeAreas(mockDatabase.areas), // Normalize new table
  order_sets: normalizeOrderSets(mockDatabase.order_sets), // Normalize new table
  order_set_items: normalizeOrderSetItems(mockDatabase.order_set_items), // Normalize new table
};


const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const supabaseMock = {
  auth: {
    signIn: async () => {
      await delay(SUPABASE_MOCK_DELAY);
      console.log('Supabase Mock: User signed in.');
      return { user: { id: 'mock-user-id', email: 'test@example.com' }, session: 'mock-session' };
    },
    signOut: async () => {
      await delay(SUPABASE_MOCK_DELAY);
      console.log('Supabase Mock: User signed out.');
      return null;
    },
  },

  // Generic constraint T extends { id: string | undefined } ensures T has an 'id' property
  // Casting to 'unknown' first resolves Type 'X[]' is not comparable to type 'Y[]' errors
  from: <T extends { id: string | undefined }>(tableName: SupabaseTableName) => ({
    select: async (): Promise<SelectResponse<T>> => {
      await delay(SUPABASE_MOCK_DELAY);
      let data = mockDatabase[tableName] as unknown as T[];

      // Apply normalization based on table name
      switch (tableName) {
        // Fix: Explicitly cast to 'unknown' first for safe type assertion.
        case 'members': data = normalizeMembers(data as unknown as Member[]) as unknown as T[]; break;
        case 'tasks': data = normalizeTasks(data as unknown as Task[]) as unknown as T[]; break;
        case 'explicit_rules': data = normalizeRules(data as unknown as ExplicitRule[]) as unknown as T[]; break;
        case 'weekly_schedule': data = normalizeWeeklySchedule(data as unknown as WeeklyScheduleDay[]) as unknown as T[]; break;
        case 'assignments': data = normalizeAssignments(data as unknown as Assignment[]) as unknown as T[]; break;
        case 'templates': data = normalizeTemplates(data as unknown as Template[]) as unknown as T[]; break;
        case 'manager_settings': data = normalizeManagerSettings(data as unknown as ManagerSettings[]) as unknown as T[]; break;
        case 'areas': data = normalizeAreas(data as unknown as Area[]) as unknown as T[]; break; // Normalize new table
        case 'order_sets': data = normalizeOrderSets(data as unknown as OrderSet[]) as unknown as T[]; break; // Normalize new table
        case 'order_set_items': data = normalizeOrderSetItems(data as unknown as OrderSetItem[]) as unknown as T[]; break; // Normalize new table
      }
      
      console.log(`Supabase Mock: Selected from ${tableName}`, data);
      return { data, error: null };
    },
    upsert: async (records: T[]): Promise<UpsertResponse<T>> => {
      await delay(SUPABASE_MOCK_DELAY);
      let currentRecords = mockDatabase[tableName] as unknown as T[];
      const upsertedResults: T[] = [];

      for (const record of records) {
        // Fix: Ensure OrderSetItem also gets an ID if missing for the generic upsert to work,
        // even if it's not its natural primary key.
        const recordId = record.id || uuid();
        const newRecord = { ...record, id: recordId } as T;

        const index = currentRecords.findIndex(r => r.id === newRecord.id);
        if (index !== -1) {
          currentRecords[index] = newRecord; // Update existing record
          console.log(`Supabase Mock: Updated record in ${tableName}:`, newRecord);
        } else {
          currentRecords.push(newRecord); // Add new record
          console.log(`Supabase Mock: Inserted new record in ${tableName}:`, newRecord);
        }
        upsertedResults.push(newRecord); // Collect all upserted records for the response
      }

      // Update the reference in mockDatabase with the modified currentRecords array
      // This is necessary to ensure the mock database's state is correctly updated.
      (mockDatabase as any)[tableName] = currentRecords; 
      
      return { data: upsertedResults, error: null };
    },
    delete: async (idToDelete: string): Promise<UpsertResponse<T>> => {
        await delay(SUPABASE_MOCK_DELAY);
        let currentRecords = mockDatabase[tableName] as unknown as T[];
        const initialLength = currentRecords.length;
        const deletedRecords: T[] = [];
        
        const newRecords = currentRecords.filter(r => {
            if (r.id === idToDelete) {
                deletedRecords.push(r);
                return false; // Exclude this record from the new list
            }
            return true; // Keep this record
        });

        if (newRecords.length < initialLength) {
            (mockDatabase as any)[tableName] = newRecords; // Update the actual database reference
            console.log(`Supabase Mock: Deleted record with ID ${idToDelete} from ${tableName}`);
            // Return the records that were actually deleted
            return { data: deletedRecords, error: null };
        }
        console.warn(`Supabase Mock: No record found with ID ${idToDelete} in ${tableName} for deletion.`);
        return { data: null, error: { message: `No record found with ID ${idToDelete}`, name: 'NotFound' } as Error };
    },
  }),

  functions: {
    invoke: async <T>(functionName: string, payload: any): Promise<InvokeResponse<T>> => {
      await delay(SUPABASE_MOCK_DELAY);
      console.log(`Supabase Mock: Invoking function ${functionName} with payload:`, payload);
      if (functionName === 'parse-schedule-pdf') {
        const { fileChecksum, fileContent } = payload;
        const parsedData: ParsedScheduleData = await parseSchedulePdfMock(fileChecksum, fileContent);
        console.log('Supabase Mock: PDF parsing function returned:', parsedData);
        return { data: parsedData as T, error: null };
      }
      return { data: null, error: { message: 'Unknown function', name: 'Error' } };
    },
  },

  storage: {
    from: (bucketName: string) => ({
      upload: async (path: string, file: File | Blob, options?: { contentType?: string }): Promise<UploadResponse> => {
        await delay(SUPABASE_MOCK_DELAY);
        console.log(`Supabase Mock: Uploading file to bucket '${bucketName}' at path '${path}'`);
        // Simulate file content for checksum
        const fileContent = await (file as File).text(); // Fix: Directly read file content as string
        const checksum = await generateChecksum(fileContent);
        console.log(`Supabase Mock: Uploaded file checksum: ${checksum}`);
        // In a real scenario, this would store the file or its metadata
        return { data: { path: `mock-cdn-url/${bucketName}/${path}?checksum=${checksum}` }, error: null };
      },
    }),
  },

  // Utility to reset or get current mock data for testing/import/export
  _reset: (data?: SupabaseTableData) => {
    mockDatabase = data ? JSON.parse(JSON.stringify(data)) : JSON.parse(JSON.stringify(initialMockData));
    // Normalize after reset
    mockDatabase = {
      members: normalizeMembers(mockDatabase.members),
      tasks: normalizeTasks(mockDatabase.tasks),
      explicit_rules: normalizeRules(mockDatabase.explicit_rules),
      weekly_schedule: normalizeWeeklySchedule(mockDatabase.weekly_schedule),
      assignments: normalizeAssignments(mockDatabase.assignments),
      templates: normalizeTemplates(mockDatabase.templates),
      manager_settings: normalizeManagerSettings(mockDatabase.manager_settings),
      areas: normalizeAreas(mockDatabase.areas), // Normalize new table
      order_sets: normalizeOrderSets(mockDatabase.order_sets), // Normalize new table
      order_set_items: normalizeOrderSetItems(mockDatabase.order_set_items), // Normalize new table
    };
    console.log('Supabase Mock: Database reset.');
  },
  _getData: () => JSON.parse(JSON.stringify(mockDatabase)),
};

export default supabaseMock;