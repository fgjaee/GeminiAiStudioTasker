// components/MemberForm.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Member, ID, ShiftClass, Skill, MemberSkill } from '../types';
import Input from '../../components/Input';
import ChipInput from '../../components/ChipInput';
import Button from '../../components/Button';
import Select from '../../components/Select';
import { uuid } from '../../utils/helpers';

interface MemberFormProps {
  member?: Member | null;
  onSave: (member: Member) => void;
  onCancel: () => void;
  existingMembers: Member[];
  allSkills: Skill[];
  memberSkills: MemberSkill[];
}

const MemberForm: React.FC<MemberFormProps> = ({ member, onSave, onCancel, existingMembers, allSkills, memberSkills }) => {
  const [formData, setFormData] = useState<Member>(member || {
    id: uuid(),
    name: '',
    title: '',
    role_tags: [],
    skill_ids: [],
    fixed_commitments_minutes: 0,
    default_tasks: [],
  });
  
  useEffect(() => {
    if (member) {
        const currentSkillIds = memberSkills
            .filter(ms => ms.member_id === member.id)
            .map(ms => ms.skill_id);
      setFormData({...member, skill_ids: currentSkillIds});
    } else {
      setFormData({
        id: uuid(), name: '', title: '', role_tags: [], skill_ids: [], fixed_commitments_minutes: 0, default_tasks: [],
      });
    }
  }, [member, memberSkills]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  }, []);

  const handleSkillChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      // FIX: Cast option to HTMLOptionElement to access the 'value' property correctly.
      const selectedIds = Array.from((e.target as HTMLSelectElement).selectedOptions, (option: HTMLOptionElement) => option.value);
      setFormData(prev => ({...prev, skill_ids: selectedIds}));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-card rounded-lg">
      <Input id="name" label="Member Name" value={formData.name} onChange={handleChange} required />
      <Input id="title" label="Title" value={formData.title || ''} onChange={handleChange} />
      <ChipInput
        id="role_tags"
        label="Role Tags"
        chips={formData.role_tags}
        onAddChip={chip => setFormData(p => ({ ...p, role_tags: [...p.role_tags, chip] }))}
        onRemoveChip={chip => setFormData(p => ({ ...p, role_tags: p.role_tags.filter(c => c !== chip) }))}
      />
      <div className="mb-4">
        <label htmlFor="skill_ids" className="block text-sm font-medium text-textdark mb-1">Skills (Hold Ctrl/Cmd to select multiple)</label>
        <select
            id="skill_ids"
            multiple
            value={formData.skill_ids || []}
            onChange={handleSkillChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 bg-card h-32"
        >
            {allSkills.map(skill => (
                <option key={skill.id} value={skill.id}>{skill.name}</option>
            ))}
        </select>
      </div>
      <Input
        id="fixed_commitments_minutes"
        label="Fixed Commitments (minutes/day)"
        type="number"
        value={formData.fixed_commitments_minutes}
        onChange={handleChange}
        min="0"
        required
      />
      <div className="flex justify-end space-x-2 mt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save Member</Button>
      </div>
    </form>
  );
};

export default MemberForm;