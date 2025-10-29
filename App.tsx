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
import { supabaseClient as supabaseMock } from './src/services/supabaseClient';
import { DEFAULT_MANAGER_SETTINGS } from './constants';
import { generateAssignmentsMock } from './services/assignmentEngine';
import { uuid, getNextNDays, assertUniqueKeys } from './utils/helpers';
import { importData, exportData } from './utils/importer';
import { ToastProvider, useToast } from './components/Toast';
import Header from './components/Header';
import MembersTab from './src/components/MembersTab';
import TasksTab from './src/components/TasksTab';
import RulesTab from './components/RulesTab';
import ScheduleTab from './src/components/ScheduleTab';
import AssignmentsTab from './components/AssignmentsTab';
import ReviewTab from './components/ReviewTab';
import SettingsTab from './components/SettingsTab';
import DataArchitectureTab from './components/DataArchitectureTab';
import PlannerTab from './components/PlannerTab';
import { autoFillSchedule, calculatePlannerConflicts, publishPlannedShiftsMock } from './services/plannerEngine';
import GeminiImageAnalyzer from './components/GeminiImageAnalyzer';


const AppContent: React.FC = () => {
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('assignments');
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
  const [shiftsForManualImport, setShiftsForManualImport] = useState<ParsedScheduleShift[] | null>(null);
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
  
  // Custom delete handler for members to manage related data
  const handleDeleteMember = useCallback(async (memberId: ID) => {
    if (!window.confirm(`Are you sure you want to delete this Member and all their associated data (aliases, skills, shifts)? This cannot be undone.`)) return;

    try {
      // Delete from related tables first
      await supabaseMock.from('member_skills').deleteMatch({ member_id: memberId });
      await supabaseMock.from('member_aliases').deleteMatch({ member_id: memberId });
      await supabaseMock.from('planned_shifts').deleteMatch({ member_id: memberId });
      await supabaseMock.from('assignments').deleteMatch({ memberId: memberId });
      await supabaseMock.from('availability').deleteMatch({ member_id: memberId });
      await supabaseMock.from('shift_patterns').deleteMatch({ member_id: memberId });

      // Then delete the member itself
      const { error } = await supabaseMock.from('members').delete(memberId);
      if (error) throw error;
      
      addToast({ message: 'Member deleted successfully!', type: 'info' });
      await fetchData();
    } catch (err) {
      addToast({ message: `Failed to delete member: ${(err as Error).message}`, type: 'error' });
    }
  }, [fetchData, addToast]);

  const handleSaveTask = createSaveHandler<Task>('tasks', 'Task');
  const handleDeleteTask = createDeleteHandler('tasks', 'Task');
  const handleSaveRule = createSaveHandler<ExplicitRule>('explicit_rules', 'Rule');
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

  // Custom delete handler for skills to manage related data
  const handleDeleteSkill = useCallback(async (skillId: ID) => {
    if (!window.confirm(`Are you sure you want to delete this Skill? It will be removed from all members and tasks.`)) return;

    try {
      // 1. Delete from the member_skills join table
      await supabaseMock.from('member_skills').deleteMatch({ skill_id: skillId });

      // 2. Remove from all tasks that require it
      const updatedTasks = tasks
        .filter(task => task.skill_ids?.includes(skillId))
        .map(task => ({
          ...task,
          skill_ids: task.skill_ids?.filter(id => id !== skillId),
        }));

      if (updatedTasks.length > 0) {
        await supabaseMock.from('tasks').upsert(updatedTasks);
      }
      
      // 3. Delete the skill itself
      const { error } = await supabaseMock.from('skills').delete(skillId);
      if (error) throw error;
      
      addToast({ message: 'Skill deleted successfully!', type: 'info' });
      await fetchData();
    } catch (err) {
      addToast({ message: `Failed to delete skill: ${(err as Error).message}`, type: 'error' });
    }
  }, [tasks, fetchData, addToast]);
  
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
      const result = generateAssignmentsMock({ members, tasks, explicitRules, weeklySchedule, assignments: newAssignments.filter(a => a.locked), settings, targetDate: date, orderSets, orderSetItems, skills, memberSkills });
      newAssignments.push(...result.generatedAssignments); newDailyWorkloads.push(...result.dailyWorkloads);
      newUnassignedTasks.push(...result.unassignedTasks); newOverCapacityMembers.push(...result.overCapacityMembers);
    }
    setDailyWorkloads(newDailyWorkloads); setUnassignedTasks(newUnassignedTasks); setOverCapacityMembers(newOverCapacityMembers);
    const nonLocked = newAssignments.filter(a => !a.locked);
    if (nonLocked.length > 0) await supabaseMock.from('assignments').upsert(nonLocked);
    await fetchData(); addToast({ message: 'Assignments generated!', type: 'success' }); setLoading(false);
  }, [members, tasks, explicitRules, weeklySchedule, settings, orderSets, orderSetItems, fetchData, addToast, skills, memberSkills]);

  const handleAutoFillWeek = useCallback(async (startDate: string, numberOfDays: number) => {
    setLoading(true);
    addToast({ message: 'Auto-filling schedule...', type: 'info' });
    const targetDates = getNextNDays(startDate, numberOfDays);
    const result = await autoFillSchedule({
        members,
        tasks,
        areas,
        staffingTargets,
        availability,
        shiftTemplates,
        plannedShifts,
        settings,
        targetDates,
        currentWeeklySchedule: weeklySchedule,
        skills,
    });
    // This assumes autoFillSchedule returns the full list of shifts, not just new ones.
    await handleSavePlannedShift(result.generatedPlannedShifts);
    setPlannerConflicts(result.conflicts);
    addToast({ message: 'Auto-fill complete. Review the generated shifts.', type: 'success' });
    setLoading(false);
  }, [members, tasks, areas, staffingTargets, availability, shiftTemplates, plannedShifts, settings, weeklySchedule, skills, addToast, handleSavePlannedShift]);
  
  const handleRepairCoverage = useCallback(async (date: string, areaId?: ID, timeslot?: string) => {
    addToast({ message: `Attempting to repair coverage for ${date}...`, type: 'info' });
    await handleAutoFillWeek(date, 1);
  }, [handleAutoFillWeek, addToast]);

  const handlePublish = useCallback(async (startDate: string, numberOfDays: number) => {
    setLoading(true);
    addToast({ message: 'Publishing schedule...', type: 'info' });
    const datesToPublish = getNextNDays(startDate, numberOfDays);
    const updatedWeeklySchedule = publishPlannedShiftsMock(plannedShifts, weeklySchedule, datesToPublish);
    await handleSaveWeeklySchedule(updatedWeeklySchedule);
    
    const shiftsToUpdate = plannedShifts
        .filter(ps => datesToPublish.includes(ps.date))
        .map(ps => ({ ...ps, status: 'published' as const }));
    if (shiftsToUpdate.length > 0) {
      await handleSavePlannedShift(shiftsToUpdate);
    }

    addToast({ message: 'Schedule published successfully!', type: 'success' });
    setLoading(false);
  }, [plannedShifts, weeklySchedule, handleSaveWeeklySchedule, handleSavePlannedShift, addToast]);

  const handleExportData = useCallback(() => {
    exportData({
      members, tasks, explicit_rules: explicitRules, weekly_schedule: weeklySchedule,
      assignments, templates, manager_settings: [settings], areas, order_sets: orderSets,
      order_set_items: orderSetItems, staffing_targets: staffingTargets, availability,
      shift_templates: shiftTemplates, planned_shifts: plannedShifts,
      shift_patterns: shiftPatterns, skills, member_skills: memberSkills, member_aliases: memberAliases
    });
    addToast({ message: 'Data exported successfully!', type: 'success' });
  }, [members, tasks, explicitRules, weeklySchedule, assignments, templates, settings, areas, orderSets, orderSetItems, staffingTargets, availability, shiftTemplates, plannedShifts, shiftPatterns, skills, memberSkills, memberAliases, addToast]);

  const handleImportData = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          setLoading(true);
          const data = await importData(file);
          supabaseMock._reset(data);
          await fetchData();
          addToast({ message: 'Data imported successfully!', type: 'success' });
        } catch (err) {
          addToast({ message: `Import failed: ${(err as Error).message}`, type: 'error' });
        } finally {
          setLoading(false);
        }
      }
    };
    input.click();
  }, [fetchData, addToast]);

  const handleClearAllData = useCallback(async () => {
    if (window.confirm('Are you sure you want to clear all data and reset to the initial sample data? This cannot be undone.')) {
      supabaseMock._reset(); // Resets to initialMockData
      await fetchData();
      addToast({ message: 'All data has been reset.', type: 'info' });
    }
  }, [fetchData, addToast]);

  const handleScheduleParsedFromImage = useCallback((shifts: ParsedScheduleShift[]) => {
      setShiftsForManualImport(shifts);
      setActiveTab('schedule');
  }, []);

  const handleManualImportClosed = useCallback(() => {
      setShiftsForManualImport(null);
  }, []);

  useEffect(() => {
    const conflicts = calculatePlannerConflicts(plannedShifts, staffingTargets, members, getNextNDays(dayjs().format('YYYY-MM-DD'), 14));
    setPlannerConflicts(conflicts);
  }, [plannedShifts, staffingTargets, members]);

  const renderContent = () => {
    switch(activeTab) {
      case 'assignments':
        return <AssignmentsTab
          assignments={assignments} dailyWorkloads={dailyWorkloads} unassignedTasks={unassignedTasks}
          overCapacityMembers={overCapacityMembers} members={members} tasks={tasks} settings={settings}
          weeklySchedule={weeklySchedule} onGenerateAssignments={handleGenerateAssignments} onLockAssignment={handleLockAssignment}
          onSaveAssignmentChanges={handleSaveAssignmentChanges}
        />;
      case 'planner':
        return <PlannerTab
          members={members} areas={areas} staffingTargets={staffingTargets} availability={availability}
          shiftTemplates={shiftTemplates} plannedShifts={plannedShifts}
          conflicts={plannerConflicts}
          settings={settings} shiftPatterns={shiftPatterns} onSaveStaffingTarget={handleSaveStaffingTarget}
          onDeleteStaffingTarget={handleDeleteStaffingTarget} onSaveAvailability={handleSaveAvailability}
          onDeleteAvailability={handleDeleteAvailability} onSaveShiftTemplate={handleSaveShiftTemplate}
          onDeleteShiftTemplate={handleDeleteShiftTemplate} onSavePlannedShift={handleSavePlannedShift}
          onDeletePlannedShift={handleDeletePlannedShift} onDeletePlannedShiftsByDate={handleDeletePlannedShiftsByDate}
          onAutoFillWeek={handleAutoFillWeek} onRepairCoverage={handleRepairCoverage} onPublish={handlePublish}
          onSaveShiftPattern={handleSaveShiftPattern} onDeleteShiftPattern={handleDeleteShiftPattern}
        />;
      case 'schedule':
        return <ScheduleTab
          members={members} weeklySchedule={weeklySchedule} shiftPatterns={shiftPatterns}
          memberAliases={memberAliases} onSaveMember={handleSaveMember} onSaveWeeklySchedule={handleSaveWeeklySchedule}
          onDeleteWeeklySchedule={handleDeleteWeeklySchedule} fetchData={fetchData} onSaveShiftPattern={handleSaveShiftPattern}
          onDeleteShiftPattern={handleDeleteShiftPattern} onSaveAlias={handleSaveAlias}
          initialShiftsForEditor={shiftsForManualImport} onEditorClosed={handleManualImportClosed}
        />;
      case 'members':
        return <MembersTab
          members={members} skills={skills} memberSkills={memberSkills} memberAliases={memberAliases}
          onSaveMember={handleSaveMember} onDeleteMember={handleDeleteMember} onSaveSkill={handleSaveSkill}
          onDeleteSkill={handleDeleteSkill} onSaveMemberSkill={handleSaveMemberSkill} onDeleteMemberSkill={handleDeleteMemberSkill}
          onSaveAlias={handleSaveAlias} onDeleteAlias={handleDeleteAlias}
        />;
      case 'tasks':
        return <TasksTab
          tasks={tasks} areas={areas} orderSets={orderSets} orderSetItems={orderSetItems}
          onSaveTask={handleSaveTask} onDeleteTask={handleDeleteTask} onSaveArea={handleSaveArea}
          onDeleteArea={handleDeleteArea} onSaveOrderSet={handleSaveOrderSet} onDeleteOrderSet={handleDeleteOrderSet}
          onSaveOrderSetItem={handleSaveOrderSetItem} onDeleteOrderSetItem={handleDeleteOrderSetItem}
        />;
      case 'rules':
        return <RulesTab
          explicitRules={explicitRules} members={members} tasks={tasks}
          onSaveRule={handleSaveRule} onDeleteRule={handleDeleteRule}
        />;
      case 'review':
        return <ReviewTab
          assignments={assignments} dailyWorkloads={dailyWorkloads} unassignedTasks={unassignedTasks}
          overCapacityMembers={overCapacityMembers} members={members} tasks={tasks}
          templates={templates} settings={settings}
        />;
      case 'image-analysis':
        return <GeminiImageAnalyzer onScheduleParsed={handleScheduleParsedFromImage} />;
      case 'settings':
        return <SettingsTab
          settings={settings} templates={templates} onSaveSettings={handleSaveSettings}
          onSaveTemplate={handleSaveTemplate} onDeleteTemplate={handleDeleteTemplate}
          onImportData={handleImportData} onExportData={handleExportData} onClearAllData={handleClearAllData}
        />;
      case 'data-architecture':
        return <DataArchitectureTab />;
      default:
        return <div>Select a tab</div>;
    }
  };

  if (loading && !members.length) {
    return <div className="flex justify-center items-center h-screen"><p>Loading application data...</p></div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {error}</div>;
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-grow">
        {renderContent()}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
};

export default App;