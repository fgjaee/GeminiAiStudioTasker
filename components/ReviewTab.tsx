import React, { useState, useCallback, useMemo } from 'react';
import { Assignment, Member, DailyWorkload, Task, Template, ManagerSettings } from '../types';
import Button from './Button';
import Select from './Select';
import Input from './Input';
import { FileText, Download } from 'lucide-react';
import dayjs from 'dayjs';
import Handlebars from 'handlebars';
import { assertUniqueKeys } from '../utils/helpers';
import { getTaskDisplayName } from '../services/assignmentEngine';
import { WEEKDAY_NAMES } from '../constants';

interface ReviewTabProps {
  assignments: Assignment[];
  dailyWorkloads: DailyWorkload[];
  unassignedTasks: Task[];
  overCapacityMembers: { memberId: string; name: string; date: string; overCapacity: number }[];
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
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id || '');
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

  const getTaskName = useCallback((taskId: string) => getTaskDisplayName(taskMap.get(taskId)), [taskMap]);
  const getMemberName = useCallback((memberId: string) => memberMap.get(memberId)?.name || `Unknown Member (${memberId})`, [memberMap]);

  const generateReport = useCallback(() => {
    const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
    if (!selectedTemplate) {
      setGeneratedContent('Please select a template.');
      return;
    }

    const assignmentsForDate = assignments.filter(a => a.date === selectedDate);
    const workloadsForDate = dailyWorkloads.filter(dw => dw.date === selectedDate);
    // Unassigned tasks should be all tasks not assigned for this date, not just filtered by unassigned status
    const allTasksForDate = tasks.filter(t => {
      // Fix: Simplified recurrence logic as 'recurrence_detail' does not exist on Task type
      const recurrenceMatches =
        t.recurrence_type === 'daily' ||
        (t.recurrence_type === 'weekly' && dayjs(selectedDate).day() === WEEKDAY_NAMES.indexOf('Monday')) || // Assuming weekly tasks are for Monday
        (t.recurrence_type === 'monthly' && dayjs(selectedDate).date() === 1); // Assuming monthly tasks are for the 1st of the month

      return recurrenceMatches;
    });

    const unassignedForDate = allTasksForDate.filter(t => !assignmentsForDate.some(a => a.taskId === t.id));
    const overCapacityForDate = overCapacityMembers.filter(ocm => ocm.date === selectedDate);

    const assignmentsByMember = workloadsForDate.map(dw => {
      const member = memberMap.get(dw.memberId);
      // Assert unique keys for dw.assignedTasks (dev mode only)
      if (process.env.NODE_ENV !== "production") {
        assertUniqueKeys(dw.assignedTasks.map(a => a.id), `ReviewTab.assignmentsByMember.tasks for ${member?.name}`);
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
            id="template-selector"
            label="Select Template"
            options={templateOptions}
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            required
          />
          <Input
            id="report-date"
            label="Select Date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            required
          />
          <div className="flex items-end pt-2 md:pt-0">
            <Button onClick={generateReport} variant="primary" className="w-full">
              <FileText size={18} className="mr-2" /> Generate Report
            </Button>
          </div>
        </div>

        {generatedContent && (
          <div className="mt-6 border-t pt-6">
            <h4 className="text-lg font-semibold text-textdark mb-3 flex justify-between items-center">
              Generated Worklist Preview
              <Button onClick={handleDownload} variant="secondary" size="sm">
                <Download size={16} className="mr-2" /> Download Markdown
              </Button>
            </h4>
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200 overflow-x-auto custom-scrollbar max-h-96">
              <pre className="whitespace-pre-wrap font-mono text-sm text-textdark">
                {generatedContent}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewTab;