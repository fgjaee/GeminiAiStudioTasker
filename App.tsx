import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Header from './components/Header';
import MembersTab from './components/MembersTab';
import TasksTab from './components/TasksTab';
import RulesTab from './components/RulesTab';
import ScheduleTab from './components/ScheduleTab';
import AssignmentsTab from './components/AssignmentsTab';
import ReviewTab from './components/ReviewTab';
import SettingsTab from './components/SettingsTab';
import DataArchitectureTab from './components/DataArchitectureTab';
import Modal from './components/Modal';
import Button from './components/Button'; // Import Button
import { Toast } from './components/Toast'; // Assuming Toast is a component you want
import { XCircle, CheckCircle } from 'lucide-react';

import supabaseMock from './services/supabaseMock';
import { generateAssignmentsMock } from './services/assignmentEngine';
import { uuid, getNextNDays, assertUniqueKeys } from './utils/helpers'; // Ensure uuid and assertUniqueKeys are imported
import { importData, exportData } from './utils/importer'; // Import importer functions
import { DEFAULT_MANAGER_SETTINGS } from './constants'; // Import default settings

import {
  Member,
  Task,
  ExplicitRule,
  WeeklyScheduleDay,
  Assignment,
  Template,
  ManagerSettings,
  DailyWorkload,
  Area,
  OrderSet,
  OrderSetItem,
  SupabaseTableData,
} from './types';

// Toast Message Interface
interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('assignments');
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [explicitRules, setExplicitRules] = useState<ExplicitRule[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklyScheduleDay[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [templates, setTemplates] = useState<Template[]>(([]);
  const [settings, setSettings] = useState<ManagerSettings>(DEFAULT_MANAGER_SETTINGS); // Initialize with default
  const [areas, setAreas] = useState<Area[]>([]); // New state for areas
  const [orderSets, setOrderSets] = useState<OrderSet[]>([]); // New state for order sets
  const [orderSetItems, setOrderSetItems] = useState<OrderSetItem[]>([]); // New state for order set items

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Derived state for assignment engine output
  const [dailyWorkloads, setDailyWorkloads] = useState<DailyWorkload[]>([]);
  const [unassignedTasks, setUnassignedTasks] = useState<Task[]>([]);
  const [overCapacityMembers, setOverCapacityMembers] = useState<{ memberId: string; name: string; date: string; overCapacity: number }[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = uuid();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [
        { data: membersData },
        { data: tasksData },
        { data: explicitRulesData },
        { data: weeklyScheduleData },
        { data: assignmentsData },
        { data: templatesData },
        { data: managerSettingsData },
        { data: areasData }, // Fetch areas
        { data: orderSetsData }, // Fetch order sets
        { data: orderSetItemsData }, // Fetch order set items
      ] = await Promise.all([
        supabaseMock.from<Member>('members').select(),
        supabaseMock.from<Task>('tasks').select(),
        supabaseMock.from<ExplicitRule>('explicit_rules').select(),
        supabaseMock.from<WeeklyScheduleDay>('weekly_schedule').select(),
        supabaseMock.from<Assignment>('assignments').select(),
        supabaseMock.from<Template>('templates').select(),
        supabaseMock.from<ManagerSettings>('manager_settings').select(),
        supabaseMock.from<Area>('areas').select(), // Select areas
        supabaseMock.from<OrderSet>('order_sets').select(), // Select order sets
        supabaseMock.from<OrderSetItem>('order_set_items').select(), // Select order set items
      ]);

      setMembers(membersData || []);
      setTasks(tasksData || []);
      setExplicitRules(explicitRulesData || []);
      setWeeklySchedule(weeklyScheduleData || []);
      setAssignments(assignmentsData || []);
      setTemplates(templatesData || []);
      setSettings((managerSettingsData && managerSettingsData.length > 0) ? managerSettingsData[0] : DEFAULT_MANAGER_SETTINGS);
      setAreas(areasData || []); // Set areas
      setOrderSets(orderSetsData || []); // Set order sets
      setOrderSetItems(orderSetItemsData || []); // Set order set items

      addToast('Data loaded successfully!', 'success');
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data. Please try again.');
      addToast(`Failed to load data: ${(err as Error).message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- CRUD Operations ---

  const handleSaveMember = useCallback(async (member: Member) => {
    setIsLoading(true);
    try {
      const { data, error: err } = await supabaseMock.from<Member>('members').upsert([member]);
      if (err) throw err;
      setMembers(prev => {
        const existingIndex = prev.findIndex(m => m.id === member.id);
        if (existingIndex > -1) {
          const updated = [...prev];
          updated[existingIndex] = data![0];
          return updated;
        }
        return [...prev, data![0]];
      });
      addToast(`Member "${member.name}" saved!`, 'success');
    } catch (err) {
      console.error('Error saving member:', err);
      addToast(`Error saving member: ${(err as Error).message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  const handleDeleteMember = useCallback(async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this member?')) return;
    setIsLoading(true);
    try {
      const { error: err } = await supabaseMock.from<Member>('members').delete(id);
      if (err) throw err;
      setMembers(prev => prev.filter(m => m.id !== id));
      addToast('Member deleted!', 'success');
    } catch (err) {
      console.error('Error deleting member:', err);
      addToast(`Error deleting member: ${(err as Error).message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  const handleSaveTask = useCallback(async (task: Task) => {
    setIsLoading(true);
    try {
      const { data, error: err } = await supabaseMock.from<Task>('tasks').upsert([task]);
      if (err) throw err;
      setTasks(prev => {
        const existingIndex = prev.findIndex(t => t.id === task.id);
        if (existingIndex > -1) {
          const updated = [...prev];
          updated[existingIndex] = data![0];
          return updated;
        }
        return [...prev, data![0]];
      });
      addToast(`Task "${task.name}" saved!`, 'success');
    } catch (err) {
      console.error('Error saving task:', err);
      addToast(`Error saving task: ${(err as Error).message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  const handleDeleteTask = useCallback(async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    setIsLoading(true);
    try {
      const { error: err } = await supabaseMock.from<Task>('tasks').delete(id);
      if (err) throw err;
      setTasks(prev => prev.filter(t => t.id !== id));
      addToast('Task deleted!', 'success');
    } catch (err) {
      console.error('Error deleting task:', err);
      addToast(`Error deleting task: ${(err as Error).message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  const handleSaveRule = useCallback(async (rule: ExplicitRule) => {
    setIsLoading(true);
    try {
      const { data, error: err } = await supabaseMock.from<ExplicitRule>('explicit_rules').upsert([rule]);
      if (err) throw err;
      setExplicitRules(prev => {
        const existingIndex = prev.findIndex(r => r.id === rule.id);
        if (existingIndex > -1) {
          const updated = [...prev];
          updated[existingIndex] = data![0];
          return updated;
        }
        return [...prev, data![0]];
      });
      addToast('Rule saved!', 'success');
    } catch (err) {
      console.error('Error saving rule:', err);
      addToast(`Error saving rule: ${(err as Error).message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  const handleDeleteRule = useCallback(async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;
    setIsLoading(true);
    try {
      const { error: err } = await supabaseMock.from<ExplicitRule>('explicit_rules').delete(id);
      if (err) throw err;
      setExplicitRules(prev => prev.filter(r => r.id !== id));
      addToast('Rule deleted!', 'success');
    } catch (err) {
      console.error('Error deleting rule:', err);
      addToast(`Error deleting rule: ${(err as Error).message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  const handleSaveWeeklySchedule = useCallback(async (scheduleDay: WeeklyScheduleDay) => {
    setIsLoading(true);
    try {
      const { data, error: err } = await supabaseMock.from<WeeklyScheduleDay>('weekly_schedule').upsert([scheduleDay]);
      if (err) throw err;
      setWeeklySchedule(prev => {
        const existingIndex = prev.findIndex(sd => sd.id === scheduleDay.id);
        if (existingIndex > -1) {
          const updated = [...prev];
          updated[existingIndex] = data![0];
          return updated;
        }
        return [...prev, data![0]];
      });
      addToast(`Schedule for ${scheduleDay.date} saved!`, 'success');
    } catch (err) {
      console.error('Error saving schedule:', err);
      addToast(`Error saving schedule: ${(err as Error).message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  const handleDeleteWeeklySchedule = useCallback(async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this schedule day?')) return;
    setIsLoading(true);
    try {
      const { error: err } = await supabaseMock.from<WeeklyScheduleDay>('weekly_schedule').delete(id);
      if (err) throw err;
      setWeeklySchedule(prev => prev.filter(sd => sd.id !== id));
      addToast('Schedule day deleted!', 'success');
    } catch (err) {
      console.error('Error deleting schedule day:', err);
      addToast(`Error deleting schedule day: ${(err as Error).message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  const handleSaveAssignmentChanges = useCallback(async (assignment: Assignment) => {
    setIsLoading(true);
    try {
      const { data, error: err } = await supabaseMock.from<Assignment>('assignments').upsert([assignment]);
      if (err) throw err;
      setAssignments(prev => {
        const existingIndex = prev.findIndex(a => a.id === assignment.id);
        if (existingIndex > -1) {
          const updated = [...prev];
          updated[existingIndex] = data![0];
          return updated;
        }
        return [...prev, data![0]];
      });
      addToast(`Assignment for ${tasks.find(t=>t.id===assignment.taskId)?.name} saved!`, 'success');
    } catch (err) {
      console.error('Error saving assignment:', err);
      addToast(`Error saving assignment: ${(err as Error).message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [tasks, addToast]);

  const handleLockAssignment = useCallback(async (id: string, locked: boolean) => {
    setIsLoading(true);
    try {
      const assignmentToUpdate = assignments.find(a => a.id === id);
      if (!assignmentToUpdate) throw new Error('Assignment not found');
      const updatedAssignment = { ...assignmentToUpdate, locked };
      const { data, error: err } = await supabaseMock.from<Assignment>('assignments').upsert([updatedAssignment]);
      if (err) throw err;
      setAssignments(prev => prev.map(a => a.id === id ? data![0] : a));
      addToast(`Assignment ${locked ? 'locked' : 'unlocked'}!`, 'success');
    } catch (err) {
      console.error('Error locking assignment:', err);
      addToast(`Error locking assignment: ${(err as Error).message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [assignments, addToast]);

  const handleSaveTemplate = useCallback(async (template: Template) => {
    setIsLoading(true);
    try {
      const { data, error: err } = await supabaseMock.from<Template>('templates').upsert([template]);
      if (err) throw err;
      setTemplates(prev => {
        const existingIndex = prev.findIndex(t => t.id === template.id);
        if (existingIndex > -1) {
          const updated = [...prev];
          updated[existingIndex] = data![0];
          return updated;
        }
        return [...prev, data![0]];
      });
      addToast(`Template "${template.name}" saved!`, 'success');
    } catch (err) {
      console.error('Error saving template:', err);
      addToast(`Error saving template: ${(err as Error).message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  const handleDeleteTemplate = useCallback(async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    setIsLoading(true);
    try {
      const { error: err } = await supabaseMock.from<Template>('templates').delete(id);
      if (err) throw err;
      setTemplates(prev => prev.filter(t => t.id !== id));
      addToast('Template deleted!', 'success');
    } catch (err) {
      console.error('Error deleting template:', err);
      addToast(`Error deleting template: ${(err as Error).message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  const handleSaveSettings = useCallback(async (updatedSettings: ManagerSettings) => {
    setIsLoading(true);
    try {
      const { data, error: err } = await supabaseMock.from<ManagerSettings>('manager_settings').upsert([updatedSettings]);
      if (err) throw err;
      setSettings(data![0]);
      addToast('Manager settings saved!', 'success');
    } catch (err) {
      console.error('Error saving settings:', err);
      addToast(`Error saving settings: ${(err as Error).message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  // Fix: Implement handleSaveOrderSet
  const handleSaveOrderSet = useCallback(async (orderSet: OrderSet) => {
    setIsLoading(true);
    try {
      const { data, error: err } = await supabaseMock.from<OrderSet>('order_sets').upsert([orderSet]);
      if (err) throw err;
      setOrderSets(prev => {
        const existingIndex = prev.findIndex(os => os.id === orderSet.id);
        if (existingIndex > -1) {
          const updated = [...prev];
          updated[existingIndex] = data![0];
          return updated;
        }
        return [...prev, data![0]];
      });
      addToast(`Order Set "${orderSet.name}" saved!`, 'success');
    } catch (err) {
      console.error('Error saving order set:', err);
      addToast(`Error saving order set: ${(err as Error).message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  // Fix: Implement handleDeleteOrderSet
  const handleDeleteOrderSet = useCallback(async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this order set? This will also delete all associated order set items.')) return;
    setIsLoading(true);
    try {
      // Fix: First delete associated items by iterating through them
      const itemsToDelete = orderSetItems.filter(osi => osi.order_set_id === id);
      for (const item of itemsToDelete) {
        // Ensure each OrderSetItem is deleted by its own primary ID
        const { error: deleteItemErr } = await supabaseMock.from<OrderSetItem>('order_set_items').delete(item.id);
        if (deleteItemErr) throw deleteItemErr;
      }
      setOrderSetItems(prev => prev.filter(osi => osi.order_set_id !== id)); // Update state after mock deletion

      const { error: err } = await supabaseMock.from<OrderSet>('order_sets').delete(id);
      if (err) throw err;
      setOrderSets(prev => prev.filter(os => os.id !== id));
      addToast('Order Set deleted!', 'success');
    } catch (err) {
      console.error('Error deleting order set:', err);
      addToast(`Error deleting order set: ${(err as Error).message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [orderSetItems, addToast]); // Added orderSetItems to dependencies

  // Fix: Implement handleSaveOrderSetItem
  const handleSaveOrderSetItem = useCallback(async (orderSetItemsToSave: OrderSetItem[]) => {
    setIsLoading(true);
    try {
      // The upsert on OrderSetItem can handle existing IDs or assign new ones through normalization.
      const { data, error: err } = await supabaseMock.from<OrderSetItem>('order_set_items').upsert(orderSetItemsToSave);
      if (err) throw err;
      
      // A full re-fetch of all orderSetItems is the safest way to ensure state consistency
      // after potentially bulk upserting.
      await fetchData(); 
      addToast('Order Set Items saved!', 'success');
    } catch (err) {
      console.error('Error saving order set items:', err);
      addToast(`Error saving order set items: ${(err as Error).message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast, fetchData]);

  // Fix: Implement handleDeleteOrderSetItem
  const handleDeleteOrderSetItem = useCallback(async (order_set_id: string, task_id: string) => {
    if (!window.confirm('Are you sure you want to remove this task from the order set?')) return;
    setIsLoading(true);
    try {
      // Find the specific item to delete. Its 'id' should be guaranteed by normalizeOrderSetItems.
      const itemToDelete = orderSetItems.find(item => item.order_set_id === order_set_id && item.task_id === task_id);
      if (!itemToDelete) { // Check if itemToDelete is found
        throw new Error('Order Set Item not found for deletion.');
      }
      // Delete the item using its primary ID.
      const { error: err } = await supabaseMock.from<OrderSetItem>('order_set_items').delete(itemToDelete.id);
      if (err) throw err;
      setOrderSetItems(prev => prev.filter(osi => !(osi.order_set_id === order_set_id && osi.task_id === task_id)));
      addToast('Order Set Item deleted!', 'success');
    } catch (err) {
      console.error('Error deleting order set item:', err);
      addToast(`Error deleting order set item: ${(err as Error).message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [orderSetItems, addToast]);


  // --- Data Import/Export/Clear ---

  const handleExportData = useCallback(() => {
    const allData: SupabaseTableData = {
      members, tasks, explicit_rules: explicitRules, weekly_schedule: weeklySchedule,
      assignments, templates, manager_settings: [settings], areas, order_sets: orderSets, order_set_items: orderSetItems
    };
    exportData(allData);
    addToast('All data exported!', 'success');
  }, [members, tasks, explicitRules, weeklySchedule, assignments, templates, settings, areas, orderSets, orderSetItems, addToast]);

  const handleImportData = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setIsLoading(true);
        try {
          const importedData = await importData(file);
          supabaseMock._reset(importedData); // Reset mock DB with imported data
          await fetchData(); // Re-fetch from the reset mock DB
          addToast('Data imported successfully!', 'success');
        } catch (err) {
          console.error('Error importing data:', err);
          addToast(`Error importing data: ${(err as Error).message}`, 'error');
        } finally {
          setIsLoading(false);
        }
      }
    };
    input.click();
  }, [fetchData, addToast]);

  const handleClearAllData = useCallback(async () => {
    if (!window.confirm('Are you sure you want to clear all data? This cannot be undone and will reset the app to initial sample data.')) return;
    setIsLoading(true);
    try {
      supabaseMock._reset(); // Reset to initial mock data
      await fetchData(); // Re-fetch from the reset mock DB
      addToast('All data cleared!', 'success');
    } catch (err) {
      console.error('Error clearing data:', err);
      addToast(`Error clearing data: ${(err as Error).message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [fetchData, addToast]);


  // --- Assignment Generation ---

  const handleGenerateAssignments = useCallback(async (startDate: string, numberOfDays: number) => {
    setIsLoading(true);
    setError(null);
    setDailyWorkloads([]);
    setUnassignedTasks([]);
    setOverCapacityMembers([]);

    const newAssignments: Assignment[] = [];
    const newDailyWorkloads: DailyWorkload[] = [];
    const newUnassignedTasks: Task[] = [];
    const newOverCapacityMembers: { memberId: string; name: string; date: string; overCapacity: number }[] = [];

    const datesToGenerate = getNextNDays(startDate, numberOfDays);

    // Filter out existing locked assignments to re-include in generation logic for consistency
    const lockedAssignments = assignments.filter(a => a.locked);

    for (const date of datesToGenerate) {
      console.log(`Generating assignments for: ${date}`);
      const result = generateAssignmentsMock({
        members,
        tasks,
        explicitRules,
        weeklySchedule,
        assignments: lockedAssignments, // Pass all locked assignments
        settings,
        targetDate: date,
        orderSets,
        orderSetItems,
      });

      newAssignments.push(...result.generatedAssignments);
      newDailyWorkloads.push(...result.dailyWorkloads);
      newUnassignedTasks.push(...result.unassignedTasks);
      newOverCapacityMembers.push(...result.overCapacityMembers);
    }

    // Save only the newly generated (non-locked) assignments
    const assignmentsToSave = newAssignments.filter(a => !a.locked);
    try {
      if (assignmentsToSave.length > 0) {
        // Clear all non-locked assignments for the target dates first
        const assignmentsToDelete = assignments.filter(a => !a.locked && datesToGenerate.includes(a.date));
        for(const assign of assignmentsToDelete) {
          await supabaseMock.from<Assignment>('assignments').delete(assign.id);
        }

        // Then upsert the new ones
        const { data, error: err } = await supabaseMock.from<Assignment>('assignments').upsert(assignmentsToSave);
        if (err) throw err;
        setAssignments(prev => {
            const nonTargetDateAssignments = prev.filter(a => !datesToGenerate.includes(a.date) || a.locked);
            return [...nonTargetDateAssignments, ...(data || [])];
        });
      } else {
         // If no new assignments, just make sure existing non-locked for target dates are cleared
         const assignmentsToDelete = assignments.filter(a => !a.locked && datesToGenerate.includes(a.date));
         for(const assign of assignmentsToDelete) {
           await supabaseMock.from<Assignment>('assignments').delete(assign.id);
         }
         setAssignments(prev => prev.filter(a => !datesToGenerate.includes(a.date) || a.locked));
      }
      
      setDailyWorkloads(newDailyWorkloads);
      setUnassignedTasks(newUnassignedTasks);
      setOverCapacityMembers(newOverCapacityMembers);
      addToast('Assignments generated successfully!', 'success');
    } catch (err) {
      console.error('Error saving generated assignments:', err);
      addToast(`Error saving assignments: ${(err as Error).message}`, 'error');
    } finally {
      // Always re-fetch all data to get the definitive state, including any locked assignments
      // that weren't part of the direct upsert
      await fetchData();
      setIsLoading(false);
    }

  }, [members, tasks, explicitRules, weeklySchedule, assignments, settings, orderSets, orderSetItems, addToast, fetchData]);


  const renderContent = useMemo(() => {
    switch (currentTab) {
      case 'assignments':
        return (
          <AssignmentsTab
            assignments={assignments}
            dailyWorkloads={dailyWorkloads}
            unassignedTasks={unassignedTasks}
            overCapacityMembers={overCapacityMembers}
            members={members}
            tasks={tasks}
            settings={settings}
            onGenerateAssignments={handleGenerateAssignments}
            onLockAssignment={handleLockAssignment}
            onSaveAssignmentChanges={handleSaveAssignmentChanges}
          />
        );
      case 'review':
        return (
          <ReviewTab
            assignments={assignments}
            dailyWorkloads={dailyWorkloads}
            unassignedTasks={unassignedTasks}
            overCapacityMembers={overCapacityMembers}
            members={members}
            tasks={tasks}
            templates={templates}
            settings={settings}
          />
        );
      case 'schedule':
        return (
          <ScheduleTab
            members={members}
            weeklySchedule={weeklySchedule}
            onSaveWeeklySchedule={handleSaveWeeklySchedule}
            onDeleteWeeklySchedule={handleDeleteWeeklySchedule}
            supabaseMock={supabaseMock}
            fetchData={fetchData}
          />
        );
      case 'members':
        return (
          <MembersTab
            members={members}
            tasks={tasks.map(t => t.id)} // Pass only IDs
            onSaveMember={handleSaveMember}
            onDeleteMember={handleDeleteMember}
          />
        );
      case 'tasks':
        return (
          <TasksTab
            tasks={tasks}
            areas={areas}
            orderSets={orderSets}
            orderSetItems={orderSetItems}
            onSaveTask={handleSaveTask}
            onDeleteTask={handleDeleteTask}
            // Fix: Pass the new handler functions for order sets and order set items
            onSaveOrderSet={handleSaveOrderSet}
            onSaveOrderSetItem={handleSaveOrderSetItem}
            onDeleteOrderSet={handleDeleteOrderSet}
            onDeleteOrderSetItem={handleDeleteOrderSetItem}
          />
        );
      case 'rules':
        return (
          <RulesTab
            explicitRules={explicitRules}
            members={members}
            tasks={tasks}
            onSaveRule={handleSaveRule}
            onDeleteRule={handleDeleteRule}
          />
        );
      case 'dataArchitecture':
        return <DataArchitectureTab />;
      case 'settings':
        return (
          <SettingsTab
            settings={settings}
            templates={templates}
            onSaveSettings={handleSaveSettings}
            onSaveTemplate={handleSaveTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onImportData={handleImportData}
            onExportData={handleExportData}
            onClearAllData={handleClearAllData}
          />
        );
      default:
        return <AssignmentsTab
          assignments={assignments}
          dailyWorkloads={dailyWorkloads}
          unassignedTasks={unassignedTasks}
          overCapacityMembers={overCapacityMembers}
          members={members}
          tasks={tasks}
          settings={settings}
          onGenerateAssignments={handleGenerateAssignments}
          onLockAssignment={handleLockAssignment}
          onSaveAssignmentChanges={handleSaveAssignmentChanges}
        />;
    }
  }, [
    currentTab, members, tasks, explicitRules, weeklySchedule, assignments, templates, settings, areas, orderSets, orderSetItems,
    dailyWorkloads, unassignedTasks, overCapacityMembers,
    handleSaveMember, handleDeleteMember, handleSaveTask, handleDeleteTask, handleSaveRule, handleDeleteRule,
    handleSaveWeeklySchedule, handleDeleteWeeklySchedule, handleSaveAssignmentChanges, handleLockAssignment,
    handleSaveTemplate, handleDeleteTemplate, handleSaveSettings,
    handleSaveOrderSet, handleDeleteOrderSet, handleSaveOrderSetItem, handleDeleteOrderSetItem, // Fix: Added new handlers to dependencies
    handleGenerateAssignments, handleImportData, handleExportData, handleClearAllData,
    fetchData // Include fetchData in dependencies if it can change (though useCallback should stabilize it)
  ]);

  // Assert unique keys for toasts (dev mode only)
  if (process.env.NODE_ENV !== "production") {
    assertUniqueKeys(toasts.map(t => t.id), "App.toasts");
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header currentTab={currentTab} onSelectTab={setCurrentTab} />
      <main className="flex-grow container mx-auto px-4 py-8 mt-16"> {/* Added mt-16 to offset fixed header */}
        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded-lg shadow-md flex items-center space-x-2">
              <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-8 w-8"></div>
              <span className="text-lg font-medium text-textdark">Loading Data...</span>
            </div>
          </div>
        )}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline ml-2">{error}</span>
            <span className="absolute top-0 bottom-0 right-0 px-4 py-3">
              <Button onClick={() => setError(null)} variant="outline" size="sm">
                <XCircle size={16} />
              </Button>
            </span>
          </div>
        )}
        {renderContent}
      </main>

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
          />
        ))}
      </div>
      {/* Basic Loader CSS */}
      <style>{`
        .loader {
          border-top-color: #3498db; /* Blue */
          animation: spinner 1.5s linear infinite;
        }
        @keyframes spinner {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default App;