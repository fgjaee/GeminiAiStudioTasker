
import React from 'react';
import { Database, Layout, GitFork, Settings, Users, ClipboardList, ListOrdered, Calendar, Archive, FileText } from 'lucide-react';

const DataArchitectureTab: React.FC = () => {
  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold text-textdark mb-6">Data Architecture & Mock Supabase</h2>

      <div className="bg-card shadow-lg rounded-lg p-6 mb-8">
        <h3 className="text-xl font-semibold text-textdark mb-4 flex items-center border-b pb-2">
          <Layout size={24} className="mr-2 text-primary" /> Application Structure
        </h3>
        <p className="text-gray-700 mb-4">
          This application is built with React and uses a component-based architecture. Data is managed centrally in the <code>App.tsx</code> component and passed down to child components as props.
          Interaction with the backend (or mock backend) is handled via a service layer.
        </p>
        <ul className="list-disc list-inside text-gray-700">
          <li><code>App.tsx</code>: Main application component, state management, and data fetching.</li>
          <li><code>components/</code>: Reusable UI components for different sections of the application.</li>
          <li><code>services/</code>: Contains logic for interacting with external services (e.g., <code>supabaseMock.ts</code>, <code>assignmentEngine.ts</code>, <code>pdfParserMock.ts</code>).</li>
          <li><code>types.ts</code>: TypeScript interface definitions for all data models.</li>
          <li><code>utils/</code>: Utility functions (e.g., helpers, normalizers).</li>
        </ul>
      </div>

      <div className="bg-card shadow-lg rounded-lg p-6 mb-8">
        <h3 className="text-xl font-semibold text-textdark mb-4 flex items-center border-b pb-2">
          <Database size={24} className="mr-2 text-primary" /> Data Models (Supabase Mock Tables)
        </h3>
        <p className="text-gray-700 mb-4">
          The application interacts with a mock Supabase backend, simulating various tables for different data entities.
          Each entity has a unique <code>id</code> field for consistency.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <h4 className="font-medium text-textdark flex items-center"><Users size={16} className="mr-1" /> Members</h4>
            <p className="text-sm text-gray-600">Employee profiles with roles, strengths, and commitments.</p>
            <pre className="bg-gray-100 p-2 mt-2 rounded-sm text-xs overflow-auto"><code>
              <FileText size={12} className="inline mr-1" /> id: string <br/>
              <FileText size={12} className="inline mr-1" /> name: string <br/>
              <FileText size={12} className="inline mr-1" /> title: string <br/>
              <FileText size={12} className="inline mr-1" /> role_tags: string[] <br/>
              <FileText size={12} className="inline mr-1" /> strengths: string[] <br/>
              <FileText size={12} className="inline mr-1" /> fixed_commitments_minutes: number <br/>
            </code></pre>
          </div>
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <h4 className="font-medium text-textdark flex items-center"><ClipboardList size={16} className="mr-1" /> Tasks</h4>
            <p className="text-sm text-gray-600">Definitions of recurring and one-time tasks.</p>
            <pre className="bg-gray-100 p-2 mt-2 rounded-sm text-xs overflow-auto"><code>
              <FileText size={12} className="inline mr-1" /> id: string <br/>
              <FileText size={12} className="inline mr-1" /> name: string <br/>
              <FileText size={12} className="inline mr-1" /> description: string <br/>
              <FileText size={12} className="inline mr-1" /> skill_required: string[] <br/>
              <FileText size={12} className="inline mr-1" /> priority_weight: number <br/>
              <FileText size={12} className="inline mr-1" /> earliest_start: string <br/>
              <FileText size={12} className="inline mr-1" /> due_by: string <br/>
              <FileText size={12} className="inline mr-1" /> estimated_duration: number <br/>
              <FileText size={12} className="inline mr-1" /> recurrence_type: 'daily' | 'weekly' | 'onetime' <br/>
              <FileText size={12} className="inline mr-1" /> task_type: 'upkeep' | 'standard' | 'project' <br/>
              <FileText size={12} className="inline mr-1" /> allow_multi_assign: boolean <br/>
              <FileText size={12} className="inline mr-1" /> order: number <br/>
            </code></pre>
          </div>
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <h4 className="font-medium text-textdark flex items-center"><ListOrdered size={16} className="mr-1" /> Explicit Rules</h4>
            <p className="text-sm text-gray-600">Rules for assigning specific tasks to members or roles.</p>
            <pre className="bg-gray-100 p-2 mt-2 rounded-sm text-xs overflow-auto"><code>
              <FileText size={12} className="inline mr-1" /> id: string <br/>
              <FileText size={12} className="inline mr-1" /> taskId: string <br/>
              <FileText size={12} className="inline mr-1" /> primary_selector: PrimarySelector <br/>
              <FileText size={12} className="inline mr-1" /> fallback_selectors: PrimarySelector[] <br/>
              <FileText size={12} className="inline mr-1" /> exclude_day?: string[] <br/>
              <FileText size={12} className="inline mr-1" /> max_per_member_per_day?: number <br/>
              <FileText size={12} className="inline mr-1" /> prefer_shift_class?: string <br/>
              <FileText size={12} className="inline mr-1" /> earliest_start?: string <br/>
              <FileText size={12} className="inline mr-1" /> due_by?: string <br/>
              <FileText size={12} className="inline mr-1" /> reason_template: string <br/>
            </code></pre>
          </div>
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <h4 className="font-medium text-textdark flex items-center"><Calendar size={16} className="mr-1" /> Weekly Schedule</h4>
            <p className="text-sm text-gray-600">Parsed schedule data from PDF uploads.</p>
            <pre className="bg-gray-100 p-2 mt-2 rounded-sm text-xs overflow-auto"><code>
              <FileText size={12} className="inline mr-1" /> id: string <br/>
              <FileText size={12} className="inline mr-1" /> date: string (YYYY-MM-DD) <br/>
              <FileText size={12} className="inline mr-1" /> shifts: ScheduleShift[] <br/>
              <FileText size={12} className="inline mr-1" /> flags: object <br/>
            </code></pre>
          </div>
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <h4 className="font-medium text-textdark flex items-center"><Archive size={16} className="mr-1" /> Assignments</h4>
            <p className="text-sm text-gray-600">Generated (and optionally locked) task assignments.</p>
            <pre className="bg-gray-100 p-2 mt-2 rounded-sm text-xs overflow-auto"><code>
              <FileText size={12} className="inline mr-1" /> id: string <br/>
              <FileText size={12} className="inline mr-1" /> taskId: string <br/>
              <FileText size={12} className="inline mr-1" /> memberId: string <br/>
              <FileText size={12} className="inline mr-1" /> date: string (YYYY-MM-DD) <br/>
              <FileText size={12} className="inline mr-1" /> startTime: string <br/>
              <FileText size={12} className="inline mr-1" /> endTime: string <br/>
              <FileText size={12} className="inline mr-1" /> duration: number <br/>
              <FileText size={12} className="inline mr-1" /> reason: string <br/>
              <FileText size={12} className="inline mr-1" /> locked: boolean <br/>
              <FileText size={12} className="inline mr-1" /> status: AssignmentStatus <br/>
            </code></pre>
          </div>
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <h4 className="font-medium text-textdark flex items-center"><FileText size={16} className="mr-1" /> Templates</h4>
            <p className="text-sm text-gray-600">Templates for generating worklist reports (Handlebars format).</p>
            <pre className="bg-gray-100 p-2 mt-2 rounded-sm text-xs overflow-auto"><code>
              <FileText size={12} className="inline mr-1" /> id: string <br/>
              <FileText size={12} className="inline mr-1" /> name: string <br/>
              <FileText size={12} className="inline mr-1" /> content: string <br/>
            </code></pre>
          </div>
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <h4 className="font-medium text-textdark flex items-center"><Settings size={16} className="mr-1" /> Manager Settings</h4>
            <p className="text-sm text-gray-600">Global settings for assignment engine and app behavior.</p>
            <pre className="bg-gray-100 p-2 mt-2 rounded-sm text-xs overflow-auto"><code>
              <FileText size={12} className="inline mr-1" /> id: string <br/>
              <FileText size={12} className="inline mr-1" /> floorSlaTime: number <br/>
              <FileText size={12} className="inline mr-1" /> tieBreakSeed: number <br/>
              <FileText size={12} className="inline mr-1" /> overCapacityThreshold: number <br/>
              <FileText size={12} className="inline mr-1" /> assignmentStartTime: string <br/>
            </code></pre>
          </div>
        </div>
      </div>

      <div className="bg-card shadow-lg rounded-lg p-6">
        <h3 className="text-xl font-semibold text-textdark mb-4 flex items-center border-b pb-2">
          <GitFork size={24} className="mr-2 text-primary" /> Mock Supabase Implementation
        </h3>
        <p className="text-gray-700 mb-4">
          The <code>supabaseMock.ts</code> service simulates interactions with a Supabase backend. It provides mock implementations for:
        </p>
        <ul className="list-disc list-inside text-gray-700 space-y-2">
          <li><strong>Authentication:</strong> <code>auth.signIn()</code>, <code>auth.signOut()</code></li>
          <li><strong>Database Queries:</strong> <code>from(tableName).select()</code>, <code>upsert(records)</code>, <code>delete(id)</code></li>
          <li><strong>Edge Functions:</strong> <code>functions.invoke('parse-schedule-pdf', payload)</code></li>
          <li><strong>Storage:</strong> <code>storage.from('bucket').upload(path, file)</code></li>
        </ul>
        <p className="text-gray-700 mt-4">
          This mock layer allows the frontend application to function without a real backend, facilitating development and testing. Data is stored in memory and reset upon page refresh (unless exported/imported manually).
        </p>
      </div>
    </div>
  );
};

export default DataArchitectureTab;