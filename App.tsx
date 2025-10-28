// App.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleGenAI } from '@google/genai';
import dayjs from 'dayjs';
import {
  Member, Task, ExplicitRule, WeeklyScheduleDay, Assignment, Template, ManagerSettings, ID,
  Area, OrderSet, OrderSetItem, StaffingTarget, Availability, ShiftTemplate, PlannedShift, PlannerConflict,
  ParsedScheduleData,
  ScheduleShift,
  DailyWorkload,
  ShiftPattern,
  ParsedScheduleShift,
  Skill,
  MemberSkill,
  MemberAlias,
} from './types';
import { supabaseMock } from './services/supabaseMock';
import { DEFAULT_MANAGER_SETTINGS } from './constants';
import { generateAssignmentsMock } from './services/assignmentEngine';
import { uuid, getNextNDays, assertUniqueKeys } from './services/utils';
import { importData, exportData } from './utils/importer';
import { ToastProvider, useToast } from './components/Toast';
import Header from './components/Header';
import MembersTab from './components/MembersTab';
import TasksTab from './components/TasksTab';
import RulesTab from './components/RulesTab';
import ScheduleTab from './components/ScheduleTab';
import AssignmentsTab from './components/AssignmentsTab';
import ReviewTab from './components/ReviewTab';
import SettingsTab from './components/SettingsTab';
import DataArchitectureTab from './components/DataArchitectureTab';
import PlannerTab from './components/PlannerTab';
import { autoFillSchedule, calculatePlannerConflicts, publishPlannedShiftsMock } from './services/plannerEngine';
import GeminiImageAnalyzer from './components/GeminiImageAnalyzer';


const AppContent: React.FC = () => {
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('image-analysis');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Core Data States ---
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [explicitRules, setExplicitRules] = useState<ExplicitRule[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklyScheduleDay[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [dailyWorkloads, setDailyWorkloads] = useState<DailyWorkload[]>([]);
  const [unassignedTasks, setUnassignedTasks] = useState<(Task & { unassignedReason: string; })[]>([]);
  const [overCapacityMembers, setOverCapacityMembers] = useState<{ memberId: ID; name: string; date: string; overCapacity: number }[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [settings, setSettings] = useState<ManagerSettings>(DEFAULT_MANAGER_SETTINGS);
  const [areas, setAreas] = useState<Area[]>([]);
  const [orderSets, setOrderSets] = useState<OrderSet[]>([]);
  const [orderSetItems, setOrderSetItems] = useState<OrderSetItem[]>([]);
  const [staffingTargets, setStaffingTargets] = useState<StaffingTarget[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [shiftTemplates, setShiftTemplates] = useState<ShiftTemplate[]>([]);
  const [plannedShifts, setPlannedShifts] = useState<PlannedShift[]>([]);
  const [plannerConflicts, setPlannerConflicts] = useState<PlannerConflict[]>([]);
  const [shiftPatterns, setShiftPatterns] = useState<ShiftPattern[]>([]);
  const [shiftsForManualImport, setShiftsForManualImport] = useState<ParsedScheduleShift[] | null>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [memberSkills, setMemberSkills] = useState<MemberSkill[]>([]);
  const [memberAliases, setMemberAliases] = useState<MemberAlias[]>([]);


  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all([
        supabaseMock.from<Member>('members').select(),
        supabaseMock.from<Task>('tasks').select(),
        supabaseMock.from<ExplicitRule>('explicit_rules').select(),
        supabaseMock.from<WeeklyScheduleDay>('weekly_schedule').select(),
        supabaseMock.from<Assignment>('assignments').select(),
        supabaseMock.from<Template>('templates').select(),
        supabaseMock.from<ManagerSettings>('manager_settings').select(),
        supabaseMock.from<Area>('areas').select(),
        supabaseMock.from<OrderSet>('order_sets').select(),
        supabaseMock.from<OrderSetItem>('order_set_items').select(),
        supabaseMock.from<StaffingTarget>('staffing_targets').select(),
        supabaseMock.from<Availability>('availability').select(),
        supabaseMock.from<ShiftTemplate>('shift_templates').select(),
        supabaseMock.from<PlannedShift>('planned_shifts').select(),
        supabaseMock.from<ShiftPattern>('shift_patterns').select(),
        supabaseMock.from<Skill>('skills').select(),
        supabaseMock.from<MemberSkill>('member_skills').select(),
        supabaseMock.from<MemberAlias>('member_aliases').select(),
      ]);

      setMembers(results[0].data || []);
      setTasks(results[1].data || []);
      setExplicitRules(results[2].data || []);
      setWeeklySchedule(results[3].data || []);
      setAssignments(results[4].data || []);
      setTemplates(results[5].data || []);
      setSettings((results[6].data && results[6].data[0]) ? results[6].data[0] : DEFAULT_MANAGER_SETTINGS);
      setAreas(results[7].data || []);
      setOrderSets(results[8].data || []);
      setOrderSetItems(results[9].data || []);
      setStaffingTargets(results[10].data || []);
      setAvailability(results[11].data || []);
      setShiftTemplates(results[12].data || []);
      setPlannedShifts(results[13].data || []);
      setShiftPatterns(results[14].data || []);
      setSkills(results[15].data || []);
      setMemberSkills(results[16].data || []);
      setMemberAliases(results[17].data || []);


      addToast({ message: 'Data loaded successfully!', type: 'success' });
    } catch (err) {
      setError(`Failed to load data: ${(err as Error).message}`);
      addToast({ message: `Failed to load data: ${(err as Error).message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Generic Save/Delete Handlers ---
  const createSaveHandler = <T extends {id?: ID}>(tableName: any, entityName: string) => useCallback(async (data: T | T[]) => {
      const { error } = await supabaseMock.from(tableName).upsert(data);
      if (error) addToast({ message: `Failed to save ${entityName}: ${error.message}`, type: 'error' });
      else { await fetchData(); addToast({ message: `${entityName} saved successfully!`, type: 'success' }); }
  }, [fetchData, addToast, entityName]);

  const createDeleteHandler = (tableName: any, entityName: string) => useCallback(async (id: ID) => {
      if (!window.confirm(`Are you sure you want to delete this ${entityName}?`)) return;
      const { error } = await supabaseMock.from(tableName).delete(id);
      if (error) addToast({ message: `Failed to delete ${entityName}: ${error.message}`, type: 'error' });
      else { await fetchData(); addToast({ message: `${entityName} deleted successfully!`, type: 'info' }); }
  }, [fetchData, addToast, entityName]);

  const handleSaveMember = createSaveHandler<Member>('members', 'Member');
  const handleDeleteMember = createDeleteHandler('members', 'Member');
  const handleSaveTask = createSaveHandler<Task>('tasks', 'Task');
  const handleDeleteTask = createDeleteHandler('tasks', 'Task');
  const handleSaveRule = createSaveHandler<ExplicitRule>('explicit_rules', 'Rule');
  // FIX: Corrected table name from 'rules' to 'explicit_rules' to match Supabase schema
  const handleDeleteRule = createDeleteHandler('explicit_rules', 'Rule');
  const handleSaveWeeklySchedule = createSaveHandler<WeeklyScheduleDay>('weekly_schedule', 'Schedule');
  const handleDeleteWeeklySchedule = createDeleteHandler('weekly_schedule', 'Schedule Day');
  const handleSaveAssignmentChanges = createSaveHandler<Assignment>('assignments', 'Assignment');
  const handleSaveTemplate = createSaveHandler<Template>('templates', 'Template');
  const handleDeleteTemplate = createDeleteHandler('templates', 'Template');
  const handleSaveSettings = createSaveHandler<ManagerSettings>('manager_settings', 'Settings');
  const handleSaveArea = createSaveHandler<Area>('areas', 'Area');
  const handleDeleteArea = createDeleteHandler('areas', 'Area');
  const handleSaveOrderSet = createSaveHandler<OrderSet>('order_sets', 'Order Set');
  const handleDeleteOrderSet = createDeleteHandler('order_sets', 'Order Set');
  const handleSaveOrderSetItem = createSaveHandler<OrderSetItem>('order_set_items', 'Order Set Item');
  const handleDeleteOrderSetItem = createDeleteHandler('order_set_items', 'Order Set Item');
  const handleSaveStaffingTarget = createSaveHandler<StaffingTarget>('staffing_targets', 'Staffing Target');
  const handleDeleteStaffingTarget = createDeleteHandler('staffing_targets', 'Staffing Target');
  const handleSaveAvailability = createSaveHandler<Availability>('availability', 'Availability');
  const handleDeleteAvailability = createDeleteHandler('availability', 'Availability');
  const handleSaveShiftTemplate = createSaveHandler<ShiftTemplate>('shift_templates', 'Shift Template');
  const handleDeleteShiftTemplate = createDeleteHandler('shift_templates', 'Shift Template');
  const handleSavePlannedShift = createSaveHandler<PlannedShift>('planned_shifts', 'Planned Shift');
  const handleDeletePlannedShift = createDeleteHandler('planned_shifts', 'Planned Shift');
  const handleSaveShiftPattern = createSaveHandler<ShiftPattern>('shift_patterns', 'Shift Pattern');
  const handleDeleteShiftPattern = createDeleteHandler('shift_patterns', 'Shift Pattern');
  const handleSaveSkill = createSaveHandler<Skill>('skills', 'Skill');
  const handleDeleteSkill = createDeleteHandler('skills', 'Skill');
  // FIX: Create a custom save handler for MemberSkill as it does not have an 'id' property and is incompatible with the generic createSaveHandler.
  const handleSaveMemberSkill = useCallback(async (data: MemberSkill | MemberSkill[]) => {
      const { error } = await supabaseMock.from('member_skills').upsert(data);
      if (error) addToast({ message: `Failed to save Member Skill link: ${error.message}`, type: 'error' });
      else { await fetchData(); addToast({ message: `Member Skill link saved successfully!`, type: 'success' }); }
  }, [fetchData, addToast]);
  const handleDeleteMemberSkill = useCallback(async (memberId: ID, skillId: ID) => {
    const { error } = await supabaseMock.from('member_skills').deleteMatch({ member_id: memberId, skill_id: skillId });
    if (error) addToast({ message: `Failed to delete member skill: ${error.message}`, type: 'error' });
    else { await fetchData(); addToast({ message: 'Member skill link deleted.', type: 'info' }); }
  }, [fetchData, addToast]);
  const handleSaveAlias = createSaveHandler<MemberAlias>('member_aliases', 'Alias');
  const handleDeleteAlias = createDeleteHandler('member_aliases', 'Alias');

  const handleDeletePlannedShiftsByDate = useCallback(async (date: string) => {
    if (!window.confirm(`Delete all planned shifts for ${dayjs(date).format('MMMM D')}?`)) return;
    const shiftsForDate = plannedShifts.filter(s => s.date === date);
    for (const shift of shiftsForDate) await supabaseMock.from('planned_shifts').delete(shift.id);
    await fetchData();
    addToast({ message: `Shifts for ${dayjs(date).format('MMMM D')} deleted!`, type: 'info' });
  }, [plannedShifts, fetchData, addToast]);

  const handleLockAssignment = useCallback(async (assignmentId: ID, locked: boolean) => {
    const assignmentToUpdate = assignments.find(a => a.id === assignmentId);
    if (assignmentToUpdate) {
      await handleSaveAssignmentChanges({ ...assignmentToUpdate, locked });
      addToast({ message: `Assignment ${locked ? 'locked' : 'unlocked'}!`, type: 'info' });
    }
  }, [assignments, handleSaveAssignmentChanges, addToast]);

  const handleGenerateAssignments = useCallback(async (startDate: string, numberOfDays: number) => {
    setLoading(true); addToast({ message: 'Generating assignments...', type: 'info' });
    let newAssignments: Assignment[] = [], newDailyWorkloads: DailyWorkload[] = [], newUnassignedTasks: (Task & { unassignedReason: string; })[] = [], newOverCapacityMembers: any[] = [];
    const dates = getNextNDays(startDate, numberOfDays);
    for (const date of dates) {
      const result = generateAssignmentsMock({ members, tasks, explicitRules, weeklySchedule, assignments: newAssignments.filter(a => a.locked), settings, targetDate: date, orderSets, orderSetItems });
      newAssignments.push(...result.generatedAssignments); newDailyWorkloads.push(...result.dailyWorkloads);
      newUnassignedTasks.push(...result.unassignedTasks); newOverCapacityMembers.push(...result.overCapacityMembers);
    }
    setDailyWorkloads(newDailyWorkloads); setUnassignedTasks(newUnassignedTasks); setOverCapacityMembers(newOverCapacityMembers);
    const nonLocked = newAssignments.filter(a => !a.locked);
    if (nonLocked.length > 0) await supabaseMock.from('assignments').upsert(nonLocked);
    await fetchData(); addToast({ message: 'Assignments generated!', type: 'success' }); setLoading(false);
  }, [members, tasks, explicitRules, weeklySchedule, settings, orderSets, orderSetItems, fetchData, addToast]);

  const handleAutoFillWeek = useCallback(async (startDate: string, numberOfDays: number) => {
    setLoading(true);