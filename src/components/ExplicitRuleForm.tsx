import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ExplicitRule, Member, Task, PrimarySelector, ID, Skill } from '../types';
import Select from '../../components/Select';
import Button from '../../components/Button';
import { Plus, Trash2 } from 'lucide-react';
import { uuid, assertUniqueKeys } from '../../utils/helpers';

interface ExplicitRuleFormProps {
  rule?: ExplicitRule | null;
  onSave: (rule: ExplicitRule) => void;
  onCancel: () => void;
  members: Member[];
  tasks: Task[];
  skills: Skill[];
}

const ExplicitRuleForm: React.FC<ExplicitRuleFormProps> = ({ rule, onSave, onCancel, members, tasks, skills }) => {
  const [formData, setFormData] = useState<ExplicitRule>(rule || {
    id: uuid(), task_id: '',
    primary_selector: { id: uuid(), mode: 'skill', value: '' },
    fallback_selectors: [],
  });

  useEffect(() => { if (rule) setFormData(rule); }, [rule]);

  const taskOptions = useMemo(() => tasks.map(t => ({ value: t.id, label: `${t.code}: ${t.name}` })), [tasks]);
  const memberOptions = useMemo(() => members.map(m => ({ value: m.id, label: m.name })), [members]);
  const skillOptions = useMemo(() => skills.map(s => ({ value: s.id, label: s.name })), [skills]);
  const roleTagOptions = useMemo(() => {
      const tags = new Set<string>();
      members.forEach(m => m.role_tags.forEach(t => tags.add(t)));
      return Array.from(tags).map(t => ({ value: t, label: t}));
  }, [members]);

  const getSelectorValueOptions = (mode: PrimarySelector['mode']) => {
      if (mode === 'member') return memberOptions;
      if (mode === 'skill') return skillOptions;
      return roleTagOptions;
  };

  const handleChange = (id: string, value: any) => setFormData(p => ({ ...p, [id]: value }));

  const handleSelectorChange = (type: 'primary' | 'fallback', id: ID, field: keyof PrimarySelector, value: string) => {
    if (type === 'primary') {
        const newSelector = { ...formData.primary_selector, [field]: value };
        if (field === 'mode') newSelector.value = ''; // Reset value when mode changes
        handleChange('primary_selector', newSelector);
    } else {
        const newFallbacks = formData.fallback_selectors.map(s => {
            if (s.id === id) {
                const newSelector = { ...s, [field]: value };
                if (field === 'mode') newSelector.value = '';
                return newSelector;
            }
            return s;
        });
        handleChange('fallback_selectors', newFallbacks);
    }
  };

  const handleAddFallback = () => handleChange('fallback_selectors', [...formData.fallback_selectors, { id: uuid(), mode: 'skill', value: '' }]);
  const handleRemoveFallback = (id: ID) => handleChange('fallback_selectors', formData.fallback_selectors.filter(s => s.id !== id));

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(formData); };
  
  assertUniqueKeys(formData.fallback_selectors.map(f => f.id), "ExplicitRuleForm.fallbacks");

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-card rounded-lg">
      <Select id="task_id" label="Task" options={taskOptions} value={formData.task_id} onChange={e => handleChange('task_id', e.target.value)} required />

      <h3 className="text-md font-semibold mt-4 mb-2">Primary Selector</h3>
      <div className="flex gap-2">
        <Select id="primary_mode" label="Mode" value={formData.primary_selector.mode} options={[{value: 'member', label: 'Member'}, {value: 'skill', label: 'Skill'}, {value: 'role_tag', label: 'Role Tag'}]} onChange={e => handleSelectorChange('primary', formData.primary_selector.id, 'mode', e.target.value)} />
        <Select id="primary_value" label="Value" value={formData.primary_selector.value} options={getSelectorValueOptions(formData.primary_selector.mode)} onChange={e => handleSelectorChange('primary', formData.primary_selector.id, 'value', e.target.value)} />
      </div>

      <h3 className="text-md font-semibold mt-4 mb-2">Fallback Selectors (in order)</h3>
      {formData.fallback_selectors.map(s => (
        <div key={s.id} className="flex gap-2 items-end mb-2 p-2 border rounded">
            <Select id={`fb_mode_${s.id}`} label="Mode" value={s.mode} options={[{value: 'member', label: 'Member'}, {value: 'skill', label: 'Skill'}, {value: 'role_tag', label: 'Role Tag'}]} onChange={e => handleSelectorChange('fallback', s.id, 'mode', e.target.value)} />
            <Select id={`fb_value_${s.id}`} label="Value" value={s.value} options={getSelectorValueOptions(s.mode)} onChange={e => handleSelectorChange('fallback', s.id, 'value', e.target.value)} />
            <Button variant="danger" size="sm" onClick={() => handleRemoveFallback(s.id)}><Trash2 size={16}/></Button>
        </div>
      ))}
      <Button variant="secondary" size="sm" onClick={handleAddFallback}><Plus size={16} className="mr-2"/> Add Fallback</Button>

      <div className="flex justify-end space-x-2 mt-6">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Rule</Button>
      </div>
    </form>
  );
};

export default ExplicitRuleForm;