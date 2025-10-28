import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Task, Area, RecurrenceType, TaskType, Skill, ID } from '../types';
import Input from '../../components/Input';
import Textarea from '../../components/Textarea';
import Select from '../../components/Select';
import Button from '../../components/Button';
import { uuid } from '../services/utils';

interface TaskFormProps {
  task?: Task | null;
  onSave: (task: Task) => void;
  onCancel: () => void;
  existingTasks: Task[];
  areas: Area[];
  skills: Skill[];
}

const recurrenceTypeOptions: { value: RecurrenceType; label: string }[] = [
  { value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' }, { value: 'one-time', label: 'One-Time' },
];

const taskTypeOptions: { value: TaskType; label: string }[] = [
  { value: 'standard', label: 'Standard' }, { value: 'upkeep', label: 'Upkeep' },
  { value: 'project', label: 'Project' },
];

const TaskForm: React.FC<TaskFormProps> = ({ task, onSave, onCancel, existingTasks, areas, skills }) => {
  const [formData, setFormData] = useState<Task>(task || {
    id: uuid(), code: '', name: '', skill_ids: [], priority_weight: 50,
    earliest_start: '07:00', due_by: 'EOD', estimated_duration: 30,
    recurrence_type: 'daily', task_type: 'standard', allow_multi_assign: true,
    is_must_run: false, min_coverage: 1,
  });
  
  useEffect(() => { if (task) setFormData(task); }, [task]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value, type } = e.target as HTMLInputElement;
    const isCheckbox = type === 'checkbox';
    const checked = isCheckbox ? e.target.checked : false;

    setFormData(prev => ({
      ...prev, [id]: isCheckbox ? checked : (type === 'number' ? parseFloat(value) || 0 : value),
    }));
  }, []);

   const handleSkillChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      // FIX: Cast e.target to HTMLSelectElement to access selectedOptions
      const selectedIds = Array.from((e.target as HTMLSelectElement).selectedOptions, (option: HTMLOptionElement) => option.value);
      setFormData(prev => ({...prev, skill_ids: selectedIds}));
  };

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  }, [formData, onSave]);

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-card rounded-lg">
      <Input id="name" label="Task Name" value={formData.name} onChange={handleChange} required />
      <Input id="code" label="Task Code" value={formData.code} onChange={handleChange} required />
      <Textarea id="description" label="Description" value={formData.description || ''} onChange={handleChange} />
      
       <div className="mb-4">
        <label htmlFor="skill_ids" className="block text-sm font-medium text-textdark mb-1">Skills Required (Hold Ctrl/Cmd)</label>
        <select
            id="skill_ids"
            multiple
            value={formData.skill_ids || []}
            onChange={handleSkillChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm h-32"
        >
            {skills.map(skill => (
                <option key={skill.id} value={skill.id}>{skill.name}</option>
            ))}
        </select>
      </div>

      <Input id="priority_weight" label="Priority Weight (Higher is more important)" type="number" value={formData.priority_weight} onChange={handleChange} required />
      <Input id="earliest_start" label="Earliest Start" type="time" value={formData.earliest_start} onChange={handleChange} required />
      <Input id="due_by" label="Due By" type="text" value={formData.due_by} onChange={handleChange} required placeholder="HH:mm or EOD"/>
      <Input id="estimated_duration" label="Duration (minutes)" type="number" value={formData.estimated_duration} onChange={handleChange} min="0" required />
      <Select id="recurrence_type" label="Recurrence" options={recurrenceTypeOptions} value={formData.recurrence_type} onChange={handleChange} required />
      <Select id="task_type" label="Task Type" options={taskTypeOptions} value={formData.task_type} onChange={handleChange} required />
      
      <div className="flex items-center my-4">
        <input id="is_must_run" name="is_must_run" type="checkbox" checked={formData.is_must_run} onChange={handleChange} />
        <label htmlFor="is_must_run" className="ml-2">Must Run Task</label>
      </div>
       <div className="flex items-center my-4">
        <input id="allow_multi_assign" name="allow_multi_assign" type="checkbox" checked={formData.allow_multi_assign} onChange={handleChange} />
        <label htmlFor="allow_multi_assign" className="ml-2">Allow Multiple Assignees</label>
      </div>
      <Input id="min_coverage" label="Minimum Coverage" type="number" value={formData.min_coverage || 1} onChange={handleChange} min="1" />

      <div className="flex justify-end space-x-2 mt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Task</Button>
      </div>
    </form>
  );
};

export default TaskForm;