// components/PlannerTab.tsx


import React, { useState, useCallback, useMemo } from 'react';
import {
  Assignment,
  DailyWorkload,
  Task,
  Member,
  ManagerSettings,
  ExplicitRule,
  WeeklyScheduleDay,
} from '../types';
import Button from './Button'; // <-- Added this import
import { Zap, AlertTriangle, CalendarDays, BarChart2, BookOpenText, CircleCheck } from 'lucide-react';
import dayjs from 'dayjs';
import { getNextNDays } from '../utils/helpers';
import { GoogleGenAI } from '@google/genai'; // Ensure GoogleGenAI is imported
import { getPlannerPrompt } from '../services/plannerEngine'; // Import getPlannerPrompt

interface PlannerTabProps {
  members: Member[];
  tasks: Task[];
  explicitRules: ExplicitRule[];
  weeklySchedule: WeeklyScheduleDay[];
  assignments: Assignment[];
  dailyWorkloads: DailyWorkload[];
  unassignedTasks: Task[];
  overCapacityMembers: { memberId: string; name: string; date: string; overCapacity: number }[];
  settings: ManagerSettings;
  // Fix: Removed 'ai' prop as per guidelines. GoogleGenAI instance will be created right before use.
  // ai: GoogleGenAI | null; 
  onGenerateAssignments: (startDate: string, numberOfDays: number) => Promise<void>;
}

const PlannerTab: React.FC<PlannerTabProps> = ({
  members,
  tasks,
  explicitRules,
  weeklySchedule,
  assignments,
  dailyWorkloads,
  unassignedTasks,
  overCapacityMembers,
  settings,
  // Fix: Removed 'ai' from destructuring props.
  // ai,
  onGenerateAssignments,
}) => {
  const [planningDate, setPlanningDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [planningDays, setPlanningDays] = useState(7);
  const [planningResults, setPlanningResults] = useState<string | null>(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const availableDates = useMemo(() => {
    return getNextNDays(planningDate, planningDays);
  }, [planningDate, planningDays]);

  const handleGeneratePlanning = useCallback(async () => {
    setLoadingAI(true);
    setAiError(null);
    setPlanningResults(null);

    // Fix: Instantiate GoogleGenAI right before making the API call.
    let aiInstance: GoogleGenAI;
    try {
      if (typeof window.aistudio !== 'undefined') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await window.aistudio.openSelectKey();
          // After openSelectKey, assume key is selected. A new instance will pick it up.
          setAiError("Please confirm your API key selection. Retrying AI call.");
        }
      }
      aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY || '' }); // Ensure API_KEY is available
    } catch (error) {
      console.error('Error initializing Gemini client:', error);
      setAiError(`Failed to initialize Gemini client: ${error instanceof Error ? error.message : String(error)}`);
      setLoadingAI(false);
      return;
    }

    try {
      // Step 1: Generate assignments using the existing engine
      // This will update the assignments, dailyWorkloads, etc., in the parent App component's state.
      await onGenerateAssignments(planningDate, planningDays);

      // After assignments are generated and state is updated, construct AI prompt
      const prompt = getPlannerPrompt({
        planningDate,
        planningDays,
        members,
        tasks,
        explicitRules,
        weeklySchedule,
        assignments: assignments, // Use the updated assignments
        dailyWorkloads: dailyWorkloads, // Use the updated daily workloads
        unassignedTasks: unassignedTasks, // Use the updated unassigned tasks
        overCapacityMembers: overCapacityMembers, // Use the updated over capacity members
        settings,
        // Fix: Pass availableDates to the plannerEngine
        availableDates,
      });

      console.log('Sending prompt to Gemini:', prompt);

      const response = await aiInstance.models.generateContent({
        model: "gemini-2.5-flash", // Use a suitable model
        contents: prompt,
        config: {
          temperature: 0.7,
          topP: 0.95,
          topK: 64,
        },
      });

      setPlanningResults(response.text);
    } catch (error) {
      console.error('Error during AI planning:', error);
      setAiError(`Failed to get AI planning results: ${error instanceof Error ? error.message : String(error)}`);
      // If the error indicates an API key issue, prompt for key selection
      if (typeof window.aistudio !== 'undefined' && error instanceof Error && error.message.includes("Requested entity was not found.")) {
        await window.aistudio.openSelectKey();
        setAiError("API key might be invalid or unselected. Please select your API key again.");
        // Fix: No need to call setAi here, as the client is instantiated per call.
        // Instead, the next call to handleGeneratePlanning will create a new instance with the potentially updated key.
      }
    } finally {
      setLoadingAI(false);
    }
  }, [planningDate, planningDays, onGenerateAssignments, members, tasks, explicitRules, weeklySchedule, assignments, dailyWorkloads, unassignedTasks, overCapacityMembers, settings, availableDates]);


  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-textdark">AI-Powered Planning Assistant</h2>
        <div className="flex items-center space-x-2">
          <label htmlFor="planningDate" className="text-sm font-medium text-textdark">Start Date:</label>
          <input
            id="planningDate"
            type="date"
            value={planningDate}
            onChange={(e) => setPlanningDate(e.target.value)}
            className="p-1 rounded-md border border-gray-300 bg-card text-textdark"
          />
          <label htmlFor="planningDays" className="text-sm font-medium text-textdark">Days:</label>
          <input
            id="planningDays"
            type="number"
            value={planningDays}
            onChange={(e) => setPlanningDays(parseInt(e.target.value, 10))}
            min="1"
            max="14"
            className="w-20 p-1 rounded-md border border-gray-300 bg-card text-textdark"
          />
          <Button onClick={handleGeneratePlanning} variant="primary" disabled={loadingAI}>
            {loadingAI ? 'Generating AI Plan...' : <><Zap size={18} className="mr-2" /> Get AI Plan</>}
          </Button>
        </div>
      </div>

      {aiError && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-md">
          <div className="flex items-center">
            <AlertTriangle size={20} className="text-red-700 mr-3" />
            <p className="text-sm font-medium text-red-800">{aiError}</p>
          </div>
        </div>
      )}

      {planningResults && (
        <div className="bg-card shadow-lg rounded-lg p-6 mb-8">
          <h3 className="text-xl font-semibold text-textdark mb-4 border-b pb-2 flex items-center">
            <BookOpenText size={20} className="mr-2" /> AI Planning Summary
          </h3>
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200 overflow-x-auto custom-scrollbar max-h-[60vh]">
            <pre className="whitespace-pre-wrap font-mono text-sm text-textdark">
              {planningResults}
            </pre>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-card shadow-lg rounded-lg p-6 flex flex-col items-center justify-center">
          <CalendarDays size={48} className="text-primary mb-4" />
          <h3 className="text-xl font-semibold text-textdark mb-2">Detailed Schedule</h3>
          <p className="text-gray-700 text-center">Review daily shifts and availability for your team.</p>
          <Button variant="secondary" className="mt-4" onClick={() => { /* Navigate to Schedule tab */ }}>Go to Schedule</Button>
        </div>

        <div className="bg-card shadow-lg rounded-lg p-6 flex flex-col items-center justify-center">
          <BarChart2 size={48} className="text-primary mb-4" />
          <h3 className="text-xl font-semibold text-textdark mb-2">Workload Overview</h3>
          <p className="text-gray-700 text-center">Visualize team workload and identify over/under capacity members.</p>
          <Button variant="secondary" className="mt-4" onClick={() => { /* Navigate to Assignments tab */ }}>View Workloads</Button>
        </div>

        <div className="bg-card shadow-lg rounded-lg p-6 flex flex-col items-center justify-center">
          <CircleCheck size={48} className="text-primary mb-4" />
          <h3 className="text-xl font-semibold text-textdark mb-2">Assignment Status</h3>
          <p className="text-gray-700 text-center">Track assigned and unassigned tasks with detailed reasons.</p>
          <Button variant="secondary" className="mt-4" onClick={() => { /* Navigate to Assignments tab */ }}>Manage Assignments</Button>
        </div>
      </div>
    </div>
  );
};

export default PlannerTab;