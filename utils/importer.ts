import {
  // FIX: Import SupabaseTableData
  SupabaseTableData,
  Task,
  ExplicitRule,
  // FIX: Import OldBackupData, OldTask, OldExplicitRule
  OldBackupData,
  OldTask,
  OldExplicitRule,
  PrimarySelector,
  RecurrenceType,
  TaskType,
  Member,
  MemberSkill,
  Skill,
  MemberAlias,
} from '../types';
import { uuid } from './helpers';
import dayjs from 'dayjs';
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
} from './normalizers';

/**
 * Downloads the current application data as a JSON file.
 * @param data The SupabaseTableData to export.
 */
export const exportData = (data: SupabaseTableData) => {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `worklist_automator_backup_${dayjs().format('YYYYMMDD_HHmmss')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Transforms data from an old backup JSON structure to the current SupabaseTableData format.
 * This function handles mapping fields, generating UUIDs, and providing default values for new fields.
 * @param oldData The parsed JSON object from the old backup.
 * @returns The transformed data in `SupabaseTableData` format.
 */
export const transformOldBackupToSupabaseData = (oldData: OldBackupData): SupabaseTableData => {
  const transformedTasks: Task[] = oldData.dailyTasks.map((oldTask: OldTask) => {
    const code = oldTask.id.startsWith('t_t') ? oldTask.id.replace('t_', '').toUpperCase() :
                 oldTask.id.startsWith('task_w') ? oldTask.id.replace('task_', '').toUpperCase() :
                 oldTask.id.replace('task_', '').toUpperCase();

    const skillRequiredArray = Array.isArray(oldTask.skillRequired)
      ? oldTask.skillRequired
      : (oldTask.skillRequired ? [oldTask.skillRequired] : []);

    const recurrenceType: RecurrenceType = (oldTask.recurrenceType?.toLowerCase() || 'daily') as RecurrenceType;
    const taskType: TaskType = (oldTask.taskType?.toLowerCase() === 'upkeep' ? 'upkeep' : 'standard') as TaskType;

    return {
      id: oldTask.id, // Preserve old ID for linking rules
      code: code,
      name: oldTask.name,
      description: '', // Old data doesn't have this, default to empty
      skill_ids: [], // We don't have skill IDs here, would need to map from names
      priority_weight: oldTask.order,
      earliest_start: '00:00', // Default if not specified in old data
      due_by: oldTask.deadline === 'EOD' ? '17:00' : oldTask.deadline, // Map 'EOD' to 17:00
      estimated_duration: oldTask.estimatedDuration,
      recurrence_type: recurrenceType,
      task_type: taskType,
      allow_multi_assign: !oldTask.isExclusive, // Invert isExclusive to allow_multi_assign
      areaId: undefined, // Default to undefined
    };
  });

  // Create a map for quick lookup of new task IDs based on old task names or IDs
  const taskLookupMap = new Map<string, Task>();
  transformedTasks.forEach(task => {
    taskLookupMap.set(task.name.toLowerCase(), task); // Map by lowercased name
    taskLookupMap.set(task.id.toLowerCase(), task); // Map by ID
  });

  const transformedRules: ExplicitRule[] = oldData.explicitRules.map((oldRule: OldExplicitRule) => {
    const taskId = oldRule.taskId || taskLookupMap.get(oldRule.taskName.toLowerCase())?.id;
    if (!taskId) {
      console.warn(`Importer: Could not find taskId for rule with taskName: ${oldRule.taskName}. Skipping rule.`);
      return null;
    }

    const primarySelector: PrimarySelector = oldRule.primaryMemberId
      ? { id: uuid(), mode: 'member', value: oldRule.primaryMemberId }
      // FIX: Use 'role_tag' instead of invalid 'tag'
      : (oldRule.skillRequired
        ? { id: uuid(), mode: 'role_tag', value: oldRule.skillRequired }
        : { id: uuid(), mode: 'role_tag', value: 'unspecified' }); // Default if no primary member/skill

    const fallbackSelectors: PrimarySelector[] = (oldRule.fallbacks || []).map(memberId => ({
      id: uuid(),
      mode: 'member',
      value: memberId,
    }));

    return {
      id: uuid(),
      task_id: taskId,
      primary_selector: primarySelector,
      fallback_selectors: fallbackSelectors,
      exclude_day: oldRule.excludeDay ? [oldRule.excludeDay as 'Sun'|'Mon'|'Tue'|'Wed'|'Thu'|'Fri'|'Sat'] : [], // Convert single string to array
      max_per_member_per_day: undefined, // Not in old data
      prefer_shift_class: undefined, // Not in old data
      earliest_start: undefined, // Not in old data
      due_by: undefined, // Not in old data
      reason_template: oldRule.typeLabel || `Assigned via rule for ${oldRule.taskName}.`,
    };
  }).filter(rule => rule !== null) as ExplicitRule[]; // Filter out nulls from skipped rules


  // FIX: Ensure all properties of SupabaseTableData are present, including new planner-related ones.
  const newSupabaseData: SupabaseTableData = {
    members: normalizeMembers(oldData.members.map(om => ({
      id: om.id,
      name: om.name,
      title: om.role || 'Team Member',
      role_tags: om.role ? [om.role] : [],
      skill_ids: [], // Would need to map from om.skills
      fixed_commitments_minutes: 0,
      default_tasks: [],
    })) as Member[]),
    tasks: normalizeTasks(transformedTasks),
    explicit_rules: normalizeRules(transformedRules),
    weekly_schedule: normalizeWeeklySchedule([]), // Old data had empty schedule, or different format
    assignments: normalizeAssignments([]),
    templates: normalizeTemplates([]),
    manager_settings: normalizeManagerSettings([]),
    areas: normalizeAreas([]), // Not in old data
    order_sets: normalizeOrderSets([]), // Not in old data
    order_set_items: normalizeOrderSetItems([]), // Not in old data
    staffing_targets: normalizeStaffingTargets([]),
    availability: normalizeAvailability([]),
    shift_templates: normalizeShiftTemplates([]),
    planned_shifts: normalizePlannedShifts([]),
    shift_patterns: normalizeShiftPatterns([]),
    skills: [],
    member_skills: [],
    member_aliases: [],
  };

  return newSupabaseData;
};


/**
 * Imports data from a JSON file, transforming it if it matches an old backup format.
 * @param file The JSON file to import.
 * @returns A promise resolving to the transformed SupabaseTableData.
 */
export const importData = async (file: File): Promise<SupabaseTableData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsedData = JSON.parse(content);

        // Check if it's an old backup format (e.g., has 'dailyTasks' and 'explicitRules' arrays directly)
        if (parsedData.dailyTasks && parsedData.explicitRules && parsedData.members) {
          console.log('Importer: Detected old backup data format. Transforming...');
          resolve(transformOldBackupToSupabaseData(parsedData as OldBackupData));
        } else if (
          parsedData.members &&
          parsedData.tasks &&
          parsedData.explicit_rules &&
          parsedData.weekly_schedule &&
          parsedData.assignments &&
          parsedData.templates &&
          parsedData.manager_settings
          // Keep this check loose to support older versions of the "new" format
        ) {
          console.log('Importer: Detected current data format. Normalizing...');
          // Apply normalizers to ensure data consistency, especially for IDs that might be missing in older exports of new format
          // FIX: Add missing planner properties with fallbacks to empty arrays to support older JSON structures.
          const normalizedData: SupabaseTableData = {
            members: normalizeMembers(parsedData.members),
            tasks: normalizeTasks(parsedData.tasks),
            explicit_rules: normalizeRules(parsedData.explicit_rules),
            weekly_schedule: normalizeWeeklySchedule(parsedData.weekly_schedule),
            assignments: normalizeAssignments(parsedData.assignments),
            templates: normalizeTemplates(parsedData.templates),
            manager_settings: normalizeManagerSettings(parsedData.manager_settings),
            areas: normalizeAreas(parsedData.areas || []),
            order_sets: normalizeOrderSets(parsedData.order_sets || []),
            order_set_items: normalizeOrderSetItems(parsedData.order_set_items || []),
            staffing_targets: normalizeStaffingTargets(parsedData.staffing_targets || []),
            availability: normalizeAvailability(parsedData.availability || []),
            shift_templates: normalizeShiftTemplates(parsedData.shift_templates || []),
            planned_shifts: normalizePlannedShifts(parsedData.planned_shifts || []),
            shift_patterns: normalizeShiftPatterns(parsedData.shift_patterns || []),
            skills: parsedData.skills || [],
            member_skills: parsedData.member_skills || [],
            member_aliases: parsedData.member_aliases || [],
          };
          resolve(normalizedData);
        } else {
          reject(new Error('Unrecognized data format. Please provide a valid backup JSON file.'));
        }
      } catch (e) {
        reject(new Error(`Failed to parse JSON file: ${(e as Error).message}`));
      }
    };
    reader.onerror = (error) => {
      reject(new Error(`Failed to read file: ${reader.error?.message || 'Unknown error'}`));
    };
    reader.readAsText(file);
  });
};