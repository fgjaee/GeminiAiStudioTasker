// services/supabaseClient.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
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
} from '../../types';
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
} from '../../utils/normalizers';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.');
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to convert camelCase keys to snake_case for Supabase
const toSnakeCase = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  if (typeof obj !== 'object') return obj;

  const snakeCaseObj: any = {};
  for (const key in obj) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    snakeCaseObj[snakeKey] = toSnakeCase(obj[key]);
  }
  return snakeCaseObj;
};

// Helper function to convert snake_case keys to camelCase from Supabase
const toCamelCase = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (typeof obj !== 'object') return obj;

  const camelCaseObj: any = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    camelCaseObj[camelKey] = toCamelCase(obj[key]);
  }
  return camelCaseObj;
};

// Helper function to prepare data for database (remove fields that are in separate tables)
const prepareForDatabase = (tableName: SupabaseTableName, obj: any): any => {
  if (tableName === 'members') {
    // Remove availability field - it's stored in a separate table
    const { availability, ...rest } = obj;
    return rest;
  }
  return obj;
};

// Real Supabase Client
export const supabaseClient = {
  // Auth Service
  auth: {
    signIn: async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { data, error };
    },
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      return { error };
    },
    getUser: async () => {
      const { data, error } = await supabase.auth.getUser();
      return { data, error };
    },
  },

  // Database Service
  from: <T>(tableName: SupabaseTableName) => {
    return {
      select: async () => {
        console.log(`Supabase: Selecting from ${tableName}`);
        const { data, error } = await supabase.from(tableName).select('*');

        if (error) {
          console.error(`Supabase error selecting from ${tableName}:`, error);
          return { data: null, error };
        }

        // Convert snake_case to camelCase and apply normalizers
        const camelData = toCamelCase(data || []);
        let normalizedData: T[] = [];

        switch (tableName) {
          case 'members':
            normalizedData = normalizeMembers(camelData as Member[]) as unknown as T[];
            break;
          case 'tasks':
            normalizedData = normalizeTasks(camelData as Task[]) as unknown as T[];
            break;
          case 'explicit_rules':
            normalizedData = normalizeRules(camelData as ExplicitRule[]) as unknown as T[];
            break;
          case 'weekly_schedule':
            normalizedData = normalizeWeeklySchedule(camelData as WeeklyScheduleDay[]) as unknown as T[];
            break;
          case 'assignments':
            normalizedData = normalizeAssignments(camelData as Assignment[]) as unknown as T[];
            break;
          case 'templates':
            normalizedData = normalizeTemplates(camelData as Template[]) as unknown as T[];
            break;
          case 'manager_settings':
            normalizedData = normalizeManagerSettings(camelData as ManagerSettings[]) as unknown as T[];
            break;
          case 'areas':
            normalizedData = normalizeAreas(camelData as Area[]) as unknown as T[];
            break;
          case 'order_sets':
            normalizedData = normalizeOrderSets(camelData as OrderSet[]) as unknown as T[];
            break;
          case 'order_set_items':
            normalizedData = normalizeOrderSetItems(camelData as OrderSetItem[]) as unknown as T[];
            break;
          case 'staffing_targets':
            normalizedData = normalizeStaffingTargets(camelData as StaffingTarget[]) as unknown as T[];
            break;
          case 'availability':
            normalizedData = normalizeAvailability(camelData as Availability[]) as unknown as T[];
            break;
          case 'shift_templates':
            normalizedData = normalizeShiftTemplates(camelData as ShiftTemplate[]) as unknown as T[];
            break;
          case 'planned_shifts':
            normalizedData = normalizePlannedShifts(camelData as PlannedShift[]) as unknown as T[];
            break;
          case 'shift_patterns':
            normalizedData = normalizeShiftPatterns(camelData as ShiftPattern[]) as unknown as T[];
            break;
          case 'skills':
          case 'member_skills':
          case 'member_aliases':
            normalizedData = camelData as unknown as T[];
            break;
          default:
            console.warn(`Supabase: Unknown table ${tableName}`);
            normalizedData = camelData as unknown as T[];
            break;
        }

        return { data: normalizedData, error: null };
      },

      upsert: async (records: T | T[]) => {
        const recordsArray = Array.isArray(records) ? records : [records];
        console.log(`Supabase: Upserting into ${tableName}`, recordsArray);

        // Convert camelCase to snake_case
        const snakeRecords = recordsArray.map((record) => {
          // Apply normalization before sending
          let normalizedRecord: any;
          switch (tableName) {
            case 'members':
              normalizedRecord = normalizeMembers([record as unknown as Member])[0];
              break;
            case 'tasks':
              normalizedRecord = normalizeTasks([record as unknown as Task])[0];
              break;
            case 'explicit_rules':
              normalizedRecord = normalizeRules([record as unknown as ExplicitRule])[0];
              break;
            case 'weekly_schedule':
              normalizedRecord = normalizeWeeklySchedule([record as unknown as WeeklyScheduleDay])[0];
              break;
            case 'assignments':
              normalizedRecord = normalizeAssignments([record as unknown as Assignment])[0];
              break;
            case 'templates':
              normalizedRecord = normalizeTemplates([record as unknown as Template])[0];
              break;
            case 'manager_settings':
              normalizedRecord = normalizeManagerSettings([record as unknown as ManagerSettings])[0];
              break;
            case 'areas':
              normalizedRecord = normalizeAreas([record as unknown as Area])[0];
              break;
            case 'order_sets':
              normalizedRecord = normalizeOrderSets([record as unknown as OrderSet])[0];
              break;
            case 'order_set_items':
              normalizedRecord = normalizeOrderSetItems([record as unknown as OrderSetItem])[0];
              break;
            case 'staffing_targets':
              normalizedRecord = normalizeStaffingTargets([record as unknown as StaffingTarget])[0];
              break;
            case 'availability':
              normalizedRecord = normalizeAvailability([record as unknown as Availability])[0];
              break;
            case 'shift_templates':
              normalizedRecord = normalizeShiftTemplates([record as unknown as ShiftTemplate])[0];
              break;
            case 'planned_shifts':
              normalizedRecord = normalizePlannedShifts([record as unknown as PlannedShift])[0];
              break;
            case 'shift_patterns':
              normalizedRecord = normalizeShiftPatterns([record as unknown as ShiftPattern])[0];
              break;
            default:
              normalizedRecord = record;
              break;
          }
          return toSnakeCase(prepareForDatabase(tableName, normalizedRecord));
        });

        const { data, error } = await supabase.from(tableName).upsert(snakeRecords).select();

        if (error) {
          console.error(`Supabase error upserting into ${tableName}:`, error);
          return { data: null, error };
        }

        return { data: toCamelCase(data) as unknown as T[], error: null };
      },

      delete: async (id: ID) => {
        console.log(`Supabase: Deleting from ${tableName} with ID ${id}`);
        const { error } = await supabase.from(tableName).delete().eq('id', id);

        if (error) {
          console.error(`Supabase error deleting from ${tableName}:`, error);
          return { data: null, error };
        }

        return { data: null, error: null };
      },

      deleteMatch: async (query: object) => {
        console.log(`Supabase: Deleting from ${tableName} with query`, query);

        // Convert camelCase query to snake_case
        const snakeQuery = toSnakeCase(query);

        // Build delete query with multiple conditions
        let deleteQuery = supabase.from(tableName).delete();
        for (const [key, value] of Object.entries(snakeQuery)) {
          deleteQuery = deleteQuery.eq(key, value);
        }

        const { error } = await deleteQuery;

        if (error) {
          console.error(`Supabase error deleting from ${tableName}:`, error);
          return { data: null, error };
        }

        return { data: null, error: null };
      },
    };
  },

  // Functions Service
  functions: {
    invoke: async <T>(functionName: string, payload: any) => {
      console.log(`Supabase: Invoking function ${functionName}`, payload);
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload,
      });

      if (error) {
        console.error(`Supabase error invoking function ${functionName}:`, error);
        return { data: null, error };
      }

      return { data: data as T, error: null };
    },
  },

  // Storage Service
  storage: {
    from: (bucketName: string) => {
      return {
        upload: async (path: string, file: File | Blob, options?: { contentType?: string }) => {
          console.log(`Supabase: Uploading to bucket ${bucketName} at ${path}`);
          const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(path, file, options);

          if (error) {
            console.error(`Supabase error uploading to ${bucketName}:`, error);
            return { data: null, error };
          }

          return { data, error: null };
        },
        download: async (path: string) => {
          console.log(`Supabase: Downloading from bucket ${bucketName} at ${path}`);
          const { data, error } = await supabase.storage.from(bucketName).download(path);

          if (error) {
            console.error(`Supabase error downloading from ${bucketName}:`, error);
            return { data: null, error };
          }

          return { data, error: null };
        },
      };
    },
  },
};

export default supabaseClient;