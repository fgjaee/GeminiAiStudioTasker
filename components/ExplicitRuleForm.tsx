import React, { useState, useEffect, useCallback, useMemo } from 'react';
// FIX: Import ID type
import { ExplicitRule, Member, Task, PrimarySelector, ShiftClass, ID } from '../types';
import Input from './Input';
import Select from './Select';
import Button from './Button';
import Textarea from './Textarea'; // Import Textarea
import { Plus, Trash2 } from 'lucide-react';
import { uuid, assertUniqueKeys } from '../utils/helpers'; // Ensure uuid and assertUniqueKeys are imported
import { WEEKDAY_NAMES } from '../constants';

interface ExplicitRuleFormProps {
  rule?: ExplicitRule | null;
  onSave: (rule: ExplicitRule) => void;
  onCancel: () => void;
  members: Member[];
  tasks: Task[];
}

const weekdayOptions = WEEKDAY_NAMES.map(day => ({ value: day, label: day }));
const shiftClassOptions: { value: ShiftClass | undefined; label: string }[] = [
    { value: undefined, label: 'No Preference' },
    { value: 'Opening', label: 'Opening' },
    { value: 'Mid-Shift', label: 'Mid-Shift' },
    { value: 'Closing', label: 'Closing' },
    { value: 'Overnight', label: 'Overnight' },
    { value: 'Weekend', label: 'Weekend' },
    { value: 'General', label: 'General' },
];

const ExplicitRuleForm: React.FC<ExplicitRuleFormProps> = ({ rule, onSave, onCancel, members, tasks }) => {
  const [formData, setFormData] = useState<ExplicitRule>(rule || {
    id: uuid(),
    taskId: '',
    primary_selector: { id: uuid(), mode: 'tag', value: '' },
    fallback_selectors: [],
    exclude_day: [],
    max_per_member_per_day: null, // Default to null
    prefer_shift_class: undefined, // Default to undefined
    earliest_start: undefined,
    due_by: undefined,
    reason_template: 'Assigned automatically by rule.',
  });

  useEffect(() => {
    if (rule) {
      setFormData(rule);
    } else {
      setFormData({
        id: uuid(),
        taskId: '',
        primary_selector: { id: uuid(), mode: 'tag', value: '' },
        fallback_selectors: [],
        exclude_day: [],
        max_per_member_per_day: null,
        prefer_shift_class: undefined,
        earliest_start: undefined,
        due_by: undefined,
        reason_template: 'Assigned automatically by rule.',
      });
    }
  }, [rule]);

  const taskOptions = useMemo(() => tasks.map(t => ({ value: t.id, label: `${t.code}: ${t.name}` })).sort((a,b) => a.label.localeCompare(b.label)), [tasks]);
  const memberOptions = useMemo(() => members.map(m => ({ value: m.id, label: m.name })).sort((a,b) => a.label.localeCompare(b.label)), [members]);
  const allRoleTags = useMemo(() => {
    const tags = new Set<string>();
    members.forEach(m => m.role_tags.forEach(tag => tags.add(tag)));
    tasks.forEach(t => (t.skill_required || []).forEach(skill => tags.add(skill))); // Also consider skills as tags
    return Array.from(tags).sort().map(tag => ({ value: tag, label: tag }));
  }, [members, tasks]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: type === 'number' ? (value === '' ? null : parseFloat(value) || 0) : value,
    }));
  }, []);

  const handleSelectorChange = useCallback((
    selectorType: 'primary_selector' | 'fallback_selectors',
    selectorId: ID,
    field: keyof PrimarySelector,
    value: string
  ) => {
    if (selectorType === 'primary_selector') {
      setFormData(prev => ({
        ...prev,
        primary_selector: {
          ...prev.primary_selector,
          [field]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        fallback_selectors: prev.fallback_selectors?.map(s =>
          s.id === selectorId ? { ...s, [field]: value } : s
        ),
      }));
    }
  }, []);

  const handleAddFallback = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      fallback_selectors: [...(prev.fallback_selectors || []), { id: uuid(), mode: 'tag', value: '' }],
    }));
  }, []);

  const handleRemoveFallback = useCallback((id: ID) => {
    setFormData(prev => ({
      ...prev,
      fallback_selectors: prev.fallback_selectors?.filter(s => s.id !== id),
    }));
  }, []);

  const handleExcludeDayChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const { options } = e.target;
    // FIX: Cast option to HTMLOptionElement to access 'selected' and 'value' properties.
    const selectedDays = Array.from(options)
      .filter(option => (option as HTMLOptionElement).selected)
      .map(option => (option as HTMLOptionElement).value);
    setFormData(prev => ({ ...prev, exclude_day: selectedDays }));
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.taskId) {
        alert('Please select a task.');
        return;
    }
    if (!formData.primary_selector.value) {
        alert('Please specify a primary selector value.');
        return;
    }
    onSave(formData);
  }, [formData, onSave]);

  // Assert unique keys for fallback selectors (dev mode only)
  if (process.env.NODE_ENV !== "production") {
    assertUniqueKeys(formData.fallback_selectors?.map(f => f.id) || [], "ExplicitRuleForm.fallback_selectors");
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-card rounded-lg">
      <Select
        id="taskId"
        label="Task"
        options={taskOptions}
        value={formData.taskId}
        onChange={handleChange}
        required
      />

      <h3 className="text-md font-semibold text-textdark mt-4 mb-2">Primary Selector</h3>
      <div className="flex space-x-2 mb-4">
        <Select
          id="primary_selector_mode"
          label="Mode"
          options={[
            { value: 'member', label: 'Specific Member' },
            { value: 'tag', label: 'Role/Skill Tag' },
          ]}
          value={formData.primary_selector.mode}
          onChange={(e) => handleSelectorChange('primary_selector', formData.primary_selector.id, 'mode', e.target.value)}
          className="flex-1"
          required
        />
        {formData.primary_selector.mode === 'member' && (
          <Select
            id="primary_selector_value"
            label="Member"
            options={memberOptions}
            value={formData.primary_selector.value}
            onChange={(e) => handleSelectorChange('primary_selector', formData.primary_selector.id, 'value', e.target.value)}
            className="flex-1"
            required
          />
        )}
        {formData.primary_selector.mode === 'tag' && (
          <Select
            id="primary_selector_value"
            label="Tag"
            options={allRoleTags}
            value={formData.primary_selector.value}
            onChange={(e) => handleSelectorChange('primary_selector', formData.primary_selector.id, 'value', e.target.value)}
            className="flex-1"
            required
          />
        )}
      </div>

      <h3 className="text-md font-semibold text-textdark mt-4 mb-2">Fallback Selectors</h3>
      {(formData.fallback_selectors || []).map(selector => (
        <div key={selector.id} className="flex space-x-2 mb-2 p-2 border border-gray-200 rounded-md bg-gray-50 items-end">
          <Select
            id={`fallback_mode_${selector.id}`}
            label="Mode"
            options={[
              { value: 'member', label: 'Specific Member' },
              { value: 'tag', label: 'Role/Skill Tag' },
            ]}
            value={selector.mode}
            onChange={(e) => handleSelectorChange('fallback_selectors', selector.id, 'mode', e.target.value)}
            className="flex-1"
            required
          />
          {selector.mode === 'member' && (
            <Select
              id={`fallback_value_${selector.id}`}
              label="Member"
              options={memberOptions}
              value={selector.value}
              onChange={(e) => handleSelectorChange('fallback_selectors', selector.id, 'value', e.target.value)}
              className="flex-1"
              required
            />
          )}
          {selector.mode === 'tag' && (
            <Select
              id={`fallback_value_${selector.id}`}
              label="Tag"
              options={allRoleTags}
              value={selector.value}
              onChange={(e) => handleSelectorChange('fallback_selectors', selector.id, 'value', e.target.value)}
              className="flex-1"
              required
            />
          )}
          <Button type="button" variant="danger" size="sm" onClick={() => handleRemoveFallback(selector.id)} title="Remove Fallback">
            <Trash2 size={16} />
          </Button>
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" onClick={handleAddFallback} className="mt-2">
        <Plus size={16} className="mr-2" /> Add Fallback
      </Button>

      <h3 className="text-md font-semibold text-textdark mt-4 mb-2">Additional Criteria</h3>
      <Select
        id="exclude_day"
        label="Exclude Days (Hold Ctrl/Cmd to select multiple)"
        options={weekdayOptions}
        value={formData.exclude_day || []}
        onChange={handleExcludeDayChange}
        multiple
      />
      <Input
        id="max_per_member_per_day"
        label="Max times per member per day (leave empty for no limit)"
        type="number"
        value={formData.max_per_member_per_day === null ? '' : formData.max_per_member_per_day}
        onChange={handleChange}
        min="0"
      />
      <Select
        id="prefer_shift_class"
        label="Prefer Shift Class (Optional)"
        options={shiftClassOptions}
        value={formData.prefer_shift_class || ''}
        onChange={handleChange}
      />
      <Input
        id="earliest_start"
        label="Earliest Start Time (HH:mm, overrides task default) (Optional)"
        type="time"
        value={formData.earliest_start || ''}
        onChange={handleChange}
      />
      <Input
        id="due_by"
        label="Due By (HH:mm or 'EOD', overrides task default) (Optional)"
        type="text"
        value={formData.due_by || ''}
        onChange={handleChange}
      />
      <Textarea
        id="reason_template"
        label="Reason Template for Assignment (Handlebars-like syntax)"
        value={formData.reason_template}
        onChange={handleChange}
        rows={5}
        placeholder="e.g., Assigned to {{memberName}} by {{ruleName}} rule."
      />
       <p className="text-xs text-gray-500 mt-1">
        Use placeholders like <code>{'{{memberName}}'}</code>, <code>{'{{ruleName}}'}</code>.
      </p>

      <div className="flex justify-end space-x-2 mt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          Save Rule
        </Button>
      </div>
    </form>
  );
};

export default ExplicitRuleForm;
