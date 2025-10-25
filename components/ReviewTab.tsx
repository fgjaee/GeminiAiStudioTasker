import React, { useState, useCallback, useMemo } from 'react';
import { Assignment, Member, DailyWorkload, Task, Template, ManagerSettings, ID } from '../types';
import Button from './Button';
import Select from './Select';
import Input from './Input';
import { FileText, Download } from 'lucide-react';
import dayjs from 'dayjs';
import Handlebars from 'handlebars';
import { assertUniqueKeys } from '../utils/helpers';
import { getTaskDisplayName } from '../services/assignmentEngine';
import { WEEKDAY_NAMES } from '../constants';

// Register a Handlebars helper for comparison (greater than)
Handlebars.registerHelper('gt', function(a, b) {
  return a > b;
});

// Register a Handlebars helper for subtraction
Handlebars.registerHelper('minus', function(a, b) {
  return a - b;
});


interface ReviewTabProps {
  assignments: Assignment[];
  dailyWorkloads: DailyWorkload[];
  // FIX: Update prop type to match the state in App.tsx, which includes `unassignedReason`.
  unassignedTasks: (Task & { unassignedReason: string })[];
  overCapacityMembers: { memberId: ID; name: string; date: string; overCapacity: number }[];
  members: Member[];
  tasks: Task[];
  templates: Template[];
  settings: ManagerSettings;
}

const ReviewTab: React.FC<ReviewTabProps> = ({
  assignments,
  dailyWorkloads,
  unassignedTasks,
  overCapacityMembers,
  members,
  tasks,
  templates,
  settings,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<ID>(templates[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [generatedContent, setGeneratedContent] = useState<string>('');

  const memberMap = useMemo(() => new Map(members.map(m => [m.id, m])), [members]);
  const taskMap = useMemo(() => new Map(tasks.map(t => [t.id, t])), [tasks]);

  const templateOptions = useMemo(() => {
    // Assert unique keys for templates list (dev mode only)
    if (process.env.NODE_ENV !== "production") {
      assertUniqueKeys(templates.map(t => t.id), "ReviewTab.templateOptions");
    }
    return templates.map(t => ({ value: t.id, label: t.name }));
  }, [templates]);

  const getTaskName = useCallback((taskId: ID) => getTaskDisplayName(taskMap.get(taskId)), [taskMap]);
  const getMemberName = useCallback((memberId: ID) => memberMap.get(memberId)?.name || `Unknown Member (${memberId})`, [memberMap]);

  const generateReport = useCallback(() => {
    const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
    if (!selectedTemplate) {
      setGeneratedContent('Please select a template.');
      return;
    }

    const assignmentsForDate = assignments.filter(a => a.date === selectedDate);
    const workloadsForDate = dailyWorkloads.filter(dw => dw.date === selectedDate);
    
    // Filter tasks relevant for the selected date based on recurrence
    const allTasksRelevantForDate = tasks.filter(task => {
        switch (task.recurrence_type) {
            case 'daily':
                return true;
            case 'weekly':
                const dayOfWeek = dayjs(selectedDate).format('dddd'); // e.g., "Monday"
                return task.recurrence_detail === dayOfWeek;
            case 'monthly':
                // Assuming recurrence_detail like "Last Sunday" or "1st Day"
                if (task.recurrence_detail === "Last Sunday") {
                    return dayjs(selectedDate).day() === 0 && dayjs(selectedDate).add(7, 'day').month() !== dayjs(selectedDate).month();
                } else if (task.recurrence_detail === "1st Day") {
                    return dayjs(selectedDate).date() === 1;
                }
                return false; // Default for other monthly details
            case 'one-time':
                // For one-time tasks, assume they are only relevant if manually assigned or explicitly scheduled for this date
                return false; // Not automatically included in the pool for 'unassigned'
            default:
                return false;
        }
    });

    const unassignedForDate = allTasksRelevantForDate.filter(t => !assignmentsForDate.some(a => a.taskId === t.id));
    const overCapacityForDate = overCapacityMembers.filter(ocm => ocm.date === selectedDate);

    const assignmentsByMember = workloadsForDate.map(dw => {
      const member = memberMap.get(dw.memberId);
      // Assert unique keys for dw.assignedTasks (dev mode only)
      if (process.env.NODE_ENV !== "production") {
        assertUniqueKeys(dw.assignedTasks.map(a => a.id), `ReviewTab.assignmentsByMember.tasks for ${member?.name || dw.memberId}`);
      }
      return {
        memberName: member?.name || 'Unknown',
        totalDuration: dw.totalDuration,
        upkeepDuration: dw.upkeepDuration,
        capacity: dw.capacity,
        tasks: assignmentsForDate
          .filter(a => a.memberId === dw.memberId)
          .sort((a, b) => dayjs(a.startTime, 'HH:mm').diff(dayjs(b.startTime, 'HH:mm')))
          .map(a => ({
            taskName: getTaskName(a.taskId),
            duration: a.duration,
            startTime: a.startTime,
            endTime: a.endTime,
            reason: a.reason,
            status: a.status,
          })),
      };
    }).sort((a, b) => a.memberName.localeCompare(b.memberName));

    const templateData = {
      date: dayjs(selectedDate).format('YYYY-MM-DD'),
      store: 'Your Store Name', // Placeholder
      department: 'Produce', // Placeholder
      floorSlaTime: settings.floorSlaTime,
      assignmentsByMember,
      unassignedTasks: unassignedForDate.map(t => ({
        taskName: getTaskDisplayName(t),
        duration: t.estimated_duration,
        dueBy: t.due_by,
      })),
      overCapacityMembers: overCapacityForDate,
      // Add other global context variables if needed
    };

    try {
      const template = Handlebars.compile(selectedTemplate.content);
      const output = template(templateData);
      setGeneratedContent(output);
    } catch (error) {
      console.error('Error rendering template:', error);
      setGeneratedContent(`Error rendering template: ${(error as Error).message}`);
    }
  }, [selectedTemplateId, selectedDate, assignments, dailyWorkloads, unassignedTasks, overCapacityMembers, members, tasks, templates, settings, memberMap, taskMap, getTaskName]);

  const handleDownload = useCallback(() => {
    if (generatedContent) {
      const filename = `Worklist_${selectedDate}_${selectedTemplateId}.md`;
      const blob = new Blob([generatedContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [generatedContent, selectedDate, selectedTemplateId]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-textdark">Review Worklist & Reports</h2>
      </div>

      <div className="bg-card shadow-lg rounded-lg p-6 mb-8">
        <h3 className="text-xl font-semibold text-textdark mb-4 border-b pb-2">Generate Worklist</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Select
            id="templateSelect"
            label="Select Template"
            options={templateOptions}
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            required
          />
          <Input
            id="reportDate"
            label="Select Date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            required
          />
          <Button onClick={generateReport} variant="primary" className="md:col-span-1 mt-6">
            <FileText size={18} className="mr-2" /> Generate Report
          </Button>
        </div>

        {generatedContent && (
          <div className="mt-6 border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold text-textdark">Generated Content Preview</h4>
              <Button onClick={handleDownload} variant="secondary" size="sm">
                <Download size={16} className="mr-2" /> Download Markdown
              </Button>
            </div>
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200 text-sm overflow-auto max-h-96 whitespace-pre-wrap font-mono">
              {generatedContent}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewTab;
