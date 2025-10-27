import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Task, Area, RecurrenceType, TaskType } from '../types';
import Input from './Input';
import Textarea from './Textarea';
import Select from './Select';
import Button from './Button';
import ChipInput from './ChipInput'; // Import ChipInput
import { uuid } from '../utils/helpers'; // Ensure uuid is imported

interface TaskFormProps {
  task?: Task | null;
  onSave: (task: Task) => void;
  onCancel: () => void;
  existingTasks: Task[]; // For uniqueness validation of codes
  areas: Area[]; // For areaId select
}

const recurrenceTypeOptions: { value: RecurrenceType; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'one-time', label: 'One-Time' },
];

const taskTypeOptions: { value: TaskType; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'upkeep', label: 'Upkeep (Doesn\'t count towards workload)' },
  { value: 'project', label: 'Project' },
];

const TaskForm: React.FC<TaskFormProps> = ({ task, onSave, onCancel, existingTasks, areas }) => {
  const [formData, setFormData] = useState<Task>(task || {
    id: uuid(),
    code: '',
    name: '',
    description: '',
    // FIX: Rename skill_required to skill_ids
    skill_ids: [],
    priority_weight: 50,
    earliest_start: '07:00',
    due_by: '17:00',
    estimated_duration: 30,
    recurrence_type: 'daily',
    task_type: 'standard',
    allow_multi_assign: true,
    areaId: undefined,
    is_must_run: false,
    min_coverage: 0,
  });
  const [codeError, setCodeError] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setFormData(task);
    } else {
      setFormData({
        id: uuid(),
        code: '',
        name: '',
        description: '',
        skill_ids: [],
        priority_weight: 50,
        earliest_start: '07:00',
        due_by: '17:00',
        estimated_duration: 30,
        recurrence_type: 'daily',
        task_type: 'standard',
        allow_multi_assign: true,
        areaId: undefined,
        is_must_run: false,
        min_coverage: 0,
      });
    }
    setCodeError(null); // Clear error on task change
  }, [task]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value, type } = e.target as HTMLInputElement;
    const isCheckbox = type === 'checkbox';
    const checked = isCheckbox ? (e.target as HTMLInputElement).checked : false;

    if (id === 'code') {
      const isUnique = existingTasks.every(
        (t) => t.id === formData.id || t.code.toLowerCase() !== value.toLowerCase()
      );
      if (!isUnique) {
        setCodeError('Task code must be unique (case-insensitive).');
      } else {
        setCodeError(null);
      }
    }

    setFormData(prev => ({
      ...prev,
      [id]: isCheckbox ? checked : (type === 'number' ? parseFloat(value) || 0 : value),
    }));
  }, [formData.id, existingTasks]);

  const handleSkillChange = useCallback((skills: string[]) => {
    setFormData(prev => ({
      ...prev,
      skill_ids: skills,
    }));
  }, []);

  const areaOptions = useMemo(() => {
    return [{ value: '', label: 'None' }, ...areas.map(a => ({ value: a.id, label: a.name }))];
  }, [areas]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (codeError) {
      alert(codeError);
      return;
    }
    if (!formData.name.trim()) {
        alert('Task Name is required.');
        return;
    }
    if (!formData.code.trim()) {
        alert('Task Code is required.');
        return;
    }
    onSave(formData);
  }, [formData, onSave, codeError]);

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-card rounded-lg">
      <Input
        id="name"
        label="Task Name"
        type="text"
        value={formData.name}
        onChange={handleChange}
        required
      />
      <Input
        id="code"
        label="Task Code (e.g., T1, W1, INV)"
        type="text"
        value={formData.code}
        onChange={handleChange}
        required
        className={codeError ? 'border-red-500' : ''}
      />
      {codeError && <p className="text-red-500 text-sm -mt-2 mb-2">{codeError}</p>}
      <Textarea
        id="description"
        label="Description"
        value={formData.description || ''}
        onChange={handleChange}
      />
      <ChipInput
        id="skill_ids"
        label="Required Skills (e.g., Ordering, Lifting)"
        chips={formData.skill_ids as any[]}
        onAddChip={chip => handleSkillChange([...(formData.skill_ids || []), chip])}
        onRemoveChip={chip => handleSkillChange((formData.skill_ids || []).filter(s => s !== chip))}
        placeholder="Add a skill..."
      />
      <Select
        id="areaId"
        label="Area (Optional)"
        options={areaOptions}
        value={formData.areaId || ''}
        onChange={handleChange}
      />
      <Input
        id="priority_weight"
        label="Priority Weight (1-100, lower is higher priority)"
        type="number"
        value={formData.priority_weight}
        onChange={handleChange}
        min="1"
        max="100"
        required
      />
      <Input
        id="earliest_start"
        label="Earliest Start Time (HH:mm)"
        type="time"
        value={formData.earliest_start}
        onChange={handleChange}
        required
      />
      <Input
        id="due_by"
        label="Due By (HH:mm or 'EOD')"
        type="text"
        value={formData.due_by}
        onChange={handleChange}
        required
      />
      <Input
        id="estimated_duration"
        label="Estimated Duration (minutes)"
        type="number"
        value={formData.estimated_duration}
        onChange={handleChange}
        min="0"
        required
      />
      <Select
        id="recurrence_type"
        label="Recurrence Type"
        options={recurrenceTypeOptions}
        value={formData.recurrence_type}
        onChange={handleChange}
        required
      />
      <Select
        id="task_type"
        label="Task Type"
        options={taskTypeOptions}
        value={formData.task_type}
        onChange={handleChange}
        required
      />
      <div className="mb-4">
        <label htmlFor="allow_multi_assign" className="block text-sm font-medium text-textdark mb-1">
          Allow Multiple Assignees
        </label>
        <input
          id="allow_multi_assign"
          type="checkbox"
          checked={formData.allow_multi_assign}
          onChange={handleChange}
          className="mt-1 h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
        />
        <span className="ml-2 text-sm text-gray-600">
          If checked, multiple team members can be assigned to this task.
        </span>
      </div>
       <div className="mb-4">
        <label htmlFor="is_must_run" className="block text-sm font-medium text-textdark mb-1">
          Must Run Task
        </label>
        <input
          id="is_must_run"
          name="is_must_run"
          type="checkbox"
          checked={formData.is_must_run || false}
          onChange={handleChange}
          className="mt-1 h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
        />
        <span className="ml-2 text-sm text-gray-600">
          If checked, the engine will highly prioritize assigning this task.
        </span>
      </div>
      <Input
        id="min_coverage"
        label="Minimum Coverage (number of members)"
        type="number"
        value={formData.min_coverage || 0}
        onChange={handleChange}
        min="0"
      />


      <div className="flex justify-end space-x-2 mt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          Save Task
        </Button>
      </div>
    </form>
  );
};

export default TaskForm;