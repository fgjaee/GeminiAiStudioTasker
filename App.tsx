import React, { useState, useEffect, useCallback } from 'react';
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
import { ToastProvider, useToast } from './components/Toast';

import {
  Member,
  Task,
  ExplicitRule,
  WeeklyScheduleDay,
  Assignment,
  DailyWorkload,
  ManagerSettings,
  Template,
  Area,
  OrderSet,
  OrderSetItem,
  SupabaseTableData,
} from './types';
import { supabaseMock, initializeMockData } from './services/supabaseMock';
import { generateAssignmentsMock } from './services/assignmentEngine';
import { importData, exportData, transformOldBackupToSupabaseData } from './utils/importer';
// Fix: Added missing import for dayjs
import dayjs from 'dayjs';
import { uuid } from './utils/helpers';
// Fix: Added missing import for Button
import Button from './components/Button';

// Gemini API related imports
import { GoogleGenAI } from "@google/genai";

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('planner');
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [explicitRules, setExplicitRules] = useState<ExplicitRule[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklyScheduleDay[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [dailyWorkloads, setDailyWorkloads] = useState<DailyWorkload[]>([]);
  const [unassignedTasks, setUnassignedTasks] = useState<Task[]>([]);
  const [overCapacityMembers, setOverCapacityMembers] = useState<{ memberId: string; name: string; date: string; overCapacity: number }[]>([]);
  const [managerSettings, setManagerSettings] = useState<ManagerSettings | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [orderSets, setOrderSets] = useState<OrderSet[]>([]);
  const [orderSetItems, setOrderSetItems] = useState<OrderSetItem[]>([]);
  const { addToast } = useToast();

  // Gemini API client initialization - Removed as per guidelines. Client will be instantiated before each API call.
  // const [ai, setAi] = useState<GoogleGenAI | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [
        { data: membersData },
        { data: tasksData },
        { data: rulesData },
        { data: scheduleData },
        { data: assignmentsData },
        { data: templatesData },
        { data: settingsData },
        { data: areasData },
        { data: orderSetsData },
        { data: orderSetItemsData },
      ] = await Promise.all([
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
      ]);

      setMembers(membersData || []);
      setTasks(tasksData || []);
      setExplicitRules(rulesData || []);
      setWeeklySchedule(scheduleData || []);
      setAssignments(assignmentsData || []);
      setTemplates(templatesData || []);
      setManagerSettings(settingsData && settingsData.length > 0 ? settingsData[0] : null);
      setAreas(areasData || []);
      setOrderSets(orderSetsData || []);
      setOrderSetItems(orderSetItemsData || []);

      console.log('Data fetched successfully!');
    } catch (error) {
      console.error('Error fetching data:', error);
      addToast({ message: `Error fetching data: ${error instanceof Error ? error.message : String(error)}`, type: 'error' });
    }
  }, [addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Gemini API Key handling and client instantiation - Removed as per guidelines.
  // useEffect(() => {
  //   const initializeGeminiClient = async () => {
  //     // Check if window.aistudio is available and if an API key has been selected (for Veo video models)
  //     if (typeof window.aistudio !== 'undefined') {
  //       try {
  //         const hasKey = await window.aistudio.hasSelectedApiKey();
  //         if (!hasKey) {
  //           console.log('No API key selected. Prompting user to select one.');
  //           // Optionally, you could trigger a UI element here to call openSelectKey()
  //           // For now, we'll assume the user will handle it if needed for Veo.
  //         }
  //         // Always create a new client after checking, to ensure it picks up the latest key
  //         setAi(new GoogleGenAI({ apiKey: process.env.API_KEY || 'YOUR_MOCK_API_KEY_IF_NEEDED' }));
  //       } catch (error) {
  //         console.error('Error checking API key or initializing Gemini client:', error);
  //         // If hasSelectedApiKey fails, proceed with client init, but warn
  //         setAi(new GoogleGenAI({ apiKey: process.env.API_KEY || 'YOUR_MOCK_API_KEY_IF_NEEDED' }));
  //       }
  //     } else {
  //       // If not in AISTUDIO environment, use API_KEY from environment directly
  //       setAi(new GoogleGenAI({ apiKey: process.env.API_KEY || 'YOUR_MOCK_API_KEY_IF_NEEDED' }));
  //     }
  //   };

  //   initializeGeminiClient();
  // }, []); // Run once on component mount


  const handleSaveMember = useCallback(async (member: Member) => {
    const { error } = await supabaseMock.from<Member>('members').upsert([member]);
    if (error) {
      console.error('Error saving member:', error);
      addToast({ message: `Failed to save member: ${error.message}`, type: 'error' });
    } else {
      addToast({ message: `Member "${member.name}" saved!`, type: 'success' });
      await fetchData();
    }
  }, [addToast, fetchData]);

  const handleDeleteMember = useCallback(async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this member?')) return;
    const { error } = await supabaseMock.from<Member>('members').delete(id);
    if (error) {
      console.error('Error deleting member:', error);
      addToast({ message: `Failed to delete member: ${error.message}`, type: 'error' });
    } else {
      addToast({ message: 'Member deleted successfully!', type: 'info' });
      await fetchData();
    }
  }, [addToast, fetchData]);

  const handleSaveTask = useCallback(async (task: Task) => {
    const { error } = await supabaseMock.from<Task>('tasks').upsert([task]);
    if (error) {
      console.error('Error saving task:', error);
      addToast({ message: `Failed to save task: ${error.message}`, type: 'error' });
    } else {
      addToast({ message: `Task "${task.name}" saved!`, type: 'success' });
      await fetchData();
    }
  }, [addToast, fetchData]);

  const handleDeleteTask = useCallback(async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    const { error } = await supabaseMock.from<Task>('tasks').delete(id);
    if (error) {
      console.error('Error deleting task:', error);
      addToast({ message: `Failed to delete task: ${error.message}`, type: 'error' });
    } else {
      addToast({ message: 'Task deleted successfully!', type: 'info' });
      await fetchData();
    }
  }, [addToast, fetchData]);

  const handleSaveRule = useCallback(async (rule: ExplicitRule) => {
    const { error } = await supabaseMock.from<ExplicitRule>('explicit_rules').upsert([rule]);
    if (error) {
      console.error('Error saving rule:', error);
      addToast({ message: `Failed to save rule: ${error.message}`, type: 'error' });
    } else {
      addToast({ message: 'Rule saved successfully!', type: 'success' });
      await fetchData();
    }
  }, [addToast, fetchData]);

  const handleDeleteRule = useCallback(async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;
    const { error } = await supabaseMock.from<ExplicitRule>('explicit_rules').delete(id);
    if (error) {
      console.error('Error deleting rule:', error);
      addToast({ message: `Failed to delete rule: ${error.message}`, type: 'error' });
    } else {
      addToast({ message: 'Rule deleted successfully!', type: 'info' });
      await fetchData();
    }
  }, [addToast, fetchData]);

  const handleSaveWeeklySchedule = useCallback(async (scheduleDay: WeeklyScheduleDay) => {
    const { error } = await supabaseMock.from<WeeklyScheduleDay>('weekly_schedule').upsert([scheduleDay]);
    if (error) {
      console.error('Error saving weekly schedule:', error);
      addToast({ message: `Failed to save schedule: ${error.message}`, type: 'error' });
    } else {
      // No toast here as this is often called in bulk from PDF upload
      // addToast({ message: `Schedule for ${scheduleDay.date} updated!`, type: 'success' });
      // fetchData is called after batch updates, so no need here either.
    }
  }, [addToast]);

  const handleDeleteWeeklySchedule = useCallback(async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this day\'s schedule?')) return;
    const { error } = await supabaseMock.from<WeeklyScheduleDay>('weekly_schedule').delete(id);
    if (error) {
      console.error('Error deleting schedule day:', error);
      addToast({ message: `Failed to delete schedule: ${error.message}`, type: 'error' });
    } else {
      addToast({ message: 'Schedule day deleted successfully!', type: 'info' });
      await fetchData();
    }
  }, [addToast, fetchData]);

  const handleGenerateAssignments = useCallback(async (startDate: string, numberOfDays: number) => {
    if (!managerSettings) {
      addToast({ message: 'Please configure Manager Settings first.', type: 'error' });
      return;
    }

    addToast({ message: 'Generating assignments...', type: 'info' });
    // Clear previous dynamic assignments (keep locked ones)
    const existingLockedAssignments = assignments.filter(a => a.locked);
    await supabaseMock.from<Assignment>('assignments').upsert(existingLockedAssignments); // Re-save only locked ones

    const newAssignments: Assignment[] = [...existingLockedAssignments];
    const newDailyWorkloads: DailyWorkload[] = [];
    const newUnassignedTasks: Task[] = [];
    const newOverCapacityMembers: { memberId: string; name: string; date: string; overCapacity: number }[] = [];

    const datesToGenerate = Array.from({ length: numberOfDays }).map((_, i) =>
      dayjs(startDate).add(i, 'day').format('YYYY-MM-DD')
    );

    for (const targetDate of datesToGenerate) {
      const input = {
        members,
        tasks,
        explicitRules,
        weeklySchedule,
        assignments: existingLockedAssignments.filter(a => a.date === targetDate), // Pass only locked assignments for the current day
        settings: managerSettings,
        targetDate,
        orderSets,
        orderSetItems,
      };
      const result = generateAssignmentsMock(input);
      newAssignments.push(...result.generatedAssignments);
      newDailyWorkloads.push(...result.dailyWorkloads);
      newUnassignedTasks.push(...result.unassignedTasks);
      newOverCapacityMembers.push(...result.overCapacityMembers);
    }

    const { error } = await supabaseMock.from<Assignment>('assignments').upsert(newAssignments);
    if (error) {
      console.error('Error saving generated assignments:', error);
      addToast({ message: `Failed to generate assignments: ${error.message}`, type: 'error' });
    } else {
      setAssignments(newAssignments);
      setDailyWorkloads(newDailyWorkloads);
      setUnassignedTasks(newUnassignedTasks);
      setOverCapacityMembers(newOverCapacityMembers);
      addToast({ message: 'Assignments generated successfully!', type: 'success' });
    }
  }, [addToast, members, tasks, explicitRules, weeklySchedule, assignments, managerSettings, orderSets, orderSetItems]);


  const handleLockAssignment = useCallback(async (assignmentId: string, locked: boolean) => {
    const updatedAssignment = assignments.find(a => a.id === assignmentId);
    if (updatedAssignment) {
      const newAssignment = { ...updatedAssignment, locked };
      const { error } = await supabaseMock.from<Assignment>('assignments').upsert([newAssignment]);
      if (error) {
        console.error('Error updating assignment lock status:', error);
        addToast({ message: `Failed to update lock status: ${error.message}`, type: 'error' });
      } else {
        addToast({ message: `Assignment ${locked ? 'locked' : 'unlocked'}!`, type: 'info' });
        await fetchData(); // Re-fetch to update state consistently
      }
    }
  }, [addToast, assignments, fetchData]);

  const handleSaveAssignmentChanges = useCallback(async (updatedAssignment: Assignment) => {
    const { error } = await supabaseMock.from<Assignment>('assignments').upsert([updatedAssignment]);
    if (error) {
      console.error('Error saving assignment changes:', error);
      addToast({ message: `Failed to save assignment changes: ${error.message}`, type: 'error' });
    } else {
      addToast({ message: 'Assignment updated successfully!', type: 'success' });
      await fetchData();
    }
  }, [addToast, fetchData]);

  const handleSaveSettings = useCallback(async (settings: ManagerSettings) => {
    const { error } = await supabaseMock.from<ManagerSettings>('manager_settings').upsert([settings]);
    if (error) {
      console.error('Error saving settings:', error);
      addToast({ message: `Failed to save settings: ${error.message}`, type: 'error' });
    } else {
      addToast({ message: 'Settings saved successfully!', type: 'success' });
      await fetchData();
    }
  }, [addToast, fetchData]);

  const handleSaveTemplate = useCallback(async (template: Template) => {
    const { error } = await supabaseMock.from<Template>('templates').upsert([template]);
    if (error) {
      console.error('Error saving template:', error);
      addToast({ message: `Failed to save template: ${error.message}`, type: 'error' });
    } else {
      addToast({ message: `Template "${template.name}" saved!`, type: 'success' });
      await fetchData();
    }
  }, [addToast, fetchData]);

  const handleDeleteTemplate = useCallback(async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    const { error } = await supabaseMock.from<Template>('templates').delete(id);
    if (error) {
      console.error('Error deleting template:', error);
      addToast({ message: `Failed to delete template: ${error.message}`, type: 'error' });
    } else {
      addToast({ message: 'Template deleted successfully!', type: 'info' });
      await fetchData();
    }
  }, [addToast, fetchData]);


  const handleExportData = useCallback(() => {
    const dataToExport: SupabaseTableData = {
      members,
      tasks,
      explicit_rules: explicitRules,
      weekly_schedule: weeklySchedule,
      assignments,
      templates,
      manager_settings: managerSettings ? [managerSettings] : [],
      areas,
      order_sets: orderSets,
      order_set_items: orderSetItems,
    };
    exportData(dataToExport);
    addToast({ message: 'Data exported successfully!', type: 'success' });
  }, [members, tasks, explicitRules, weeklySchedule, assignments, templates, managerSettings, areas, orderSets, orderSetItems, addToast]);

  const handleImportData = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const file = target.files[0];
        try {
          const importedSupabaseData = await importData(file);

          // Clear existing data (optional, but good for a clean import)
          // For a real app, you might merge or ask user for overwrite strategy.
          // For mock, re-initialize mockData with the new imported data
          initializeMockData(importedSupabaseData);
          await fetchData(); // Re-fetch all data to update UI

          addToast({ message: 'Data imported successfully!', type: 'success' });
        } catch (error) {
          console.error('Error importing data:', error);
          addToast({ message: `Failed to import data: ${error instanceof Error ? error.message : String(error)}`, type: 'error' });
        }
      }
    };
    input.click();
  }, [addToast, fetchData]);

  const handleClearAllData = useCallback(() => {
    if (!window.confirm('Are you sure you want to clear ALL data and reset to sample data? This cannot be undone.')) {
      return;
    }
    initializeMockData(); // Resets to initial sample data
    fetchData();
    addToast({ message: 'All data cleared and reset to sample data!', type: 'info' });
  }, [addToast, fetchData]);


  const renderTabContent = () => {
    if (!managerSettings) {
      return (
        <div className="p-6 text-center text-red-500">
          <p className="text-lg">Loading settings or settings not found. Please ensure settings are configured.</p>
          <Button onClick={() => setActiveTab('settings')} variant="primary" className="mt-4">Go to Settings</Button>
        </div>
      );
    }
    switch (activeTab) {
      case 'planner':
        return <PlannerTab
                 members={members}
                 tasks={tasks}
                 explicitRules={explicitRules}
                 weeklySchedule={weeklySchedule}
                 assignments={assignments}
                 dailyWorkloads={dailyWorkloads}
                 unassignedTasks={unassignedTasks}
                 overCapacityMembers={overCapacityMembers}
                 settings={managerSettings}
                 // Fix: Removed `ai` prop as it will be instantiated directly in PlannerTab.
                 // ai={ai} 
                 onGenerateAssignments={handleGenerateAssignments}
               />;
      case 'assignments':
        return <AssignmentsTab
          assignments={assignments}
          dailyWorkloads={dailyWorkloads}
          unassignedTasks={unassignedTasks}
          overCapacityMembers={overCapacityMembers}
          members={members}
          tasks={tasks}
          settings={managerSettings}
          onGenerateAssignments={handleGenerateAssignments}
          onLockAssignment={handleLockAssignment}
          onSaveAssignmentChanges={handleSaveAssignmentChanges}
        />;
      case 'members':
        return <MembersTab
          members={members}
          onSaveMember={handleSaveMember}
          onDeleteMember={handleDeleteMember}
        />;
      case 'tasks':
        return <TasksTab
          tasks={tasks}
          areas={areas}
          orderSets={orderSets}
          orderSetItems={orderSetItems}
          onSaveTask={handleSaveTask}
          onDeleteTask={handleDeleteTask}
          onSaveOrderSet={async () => { /* mock */ }}
          onSaveOrderSetItem={async () => { /* mock */ }}
          onDeleteOrderSet={async () => { /* mock */ }}
          onDeleteOrderSetItem={async () => { /* mock */ }}
        />;
      case 'rules':
        return <RulesTab
          explicitRules={explicitRules}
          members={members}
          tasks={tasks}
          onSaveRule={handleSaveRule}
          onDeleteRule={handleDeleteRule}
        />;
      case 'schedule':
        return <ScheduleTab
          members={members}
          weeklySchedule={weeklySchedule}
          onSaveWeeklySchedule={handleSaveWeeklySchedule}
          onDeleteWeeklySchedule={handleDeleteWeeklySchedule}
          supabaseMock={supabaseMock}
          fetchData={fetchData}
        />;
      case 'review':
        return <ReviewTab
          assignments={assignments}
          dailyWorkloads={dailyWorkloads}
          unassignedTasks={unassignedTasks}
          overCapacityMembers={overCapacityMembers}
          members={members}
          tasks={tasks}
          templates={templates}
          settings={managerSettings}
        />;
      case 'settings':
        return <SettingsTab
          settings={managerSettings}
          templates={templates}
          onSaveSettings={handleSaveSettings}
          onSaveTemplate={handleSaveTemplate}
          onDeleteTemplate={handleDeleteTemplate}
          onImportData={handleImportData}
          onExportData={handleExportData}
          onClearAllData={handleClearAllData}
        />;
      case 'architecture':
        return <DataArchitectureTab />;
      default:
        return <p className="p-6">Select a tab from the header.</p>;
    }
  };

  return (
    <div className="min-h-screen bg-background text-textlight">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="container mx-auto py-8">
        {renderTabContent()}
      </main>
    </div>
  );
};

const App: React.FC = () => (
  <ToastProvider>
    <AppContent />
  </ToastProvider>
);

export default App;