import React, { useState, useEffect, useCallback } from 'react';
import { Member } from '../types';
import Input from './Input';
import Button from './Button';
import ChipInput from './ChipInput';
import { uuid } from '../utils/helpers';

interface MemberFormProps {
  member?: Member | null;
  onSave: (member: Member) => void;
  onCancel: () => void;
  existingMembers: Member[]; // For uniqueness validation of member names
}

const MemberForm: React.FC<MemberFormProps> = ({ member, onSave, onCancel, existingMembers }) => {
  const [formData, setFormData] = useState<Member>(member || {
    id: uuid(),
    name: '',
    title: '',
    role_tags: [],
    strengths: [],
    fixed_commitments_minutes: 0,
    default_tasks: [],
  });
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (member) {
      setFormData(member);
    } else {
      setFormData({
        id: uuid(),
        name: '',
        title: '',
        role_tags: [],
        strengths: [],
        fixed_commitments_minutes: 0,
        default_tasks: [],
      });
    }
    setNameError(null); // Clear error on member change
  }, [member]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value, type } = e.target;

    if (id === 'name') {
      const isUnique = existingMembers.every(
        (m) => m.id === formData.id || m.name.toLowerCase() !== value.toLowerCase()
      );
      if (!isUnique) {
        setNameError('Member name must be unique (case-insensitive).');
      } else {
        setNameError(null);
      }
    }

    setFormData(prev => ({
      ...prev,
      [id]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  }, [formData.id, existingMembers]);

  const handleRoleTagsChange = useCallback((tags: string[]) => {
    setFormData(prev => ({
      ...prev,
      role_tags: tags,
    }));
  }, []);

  const handleStrengthsChange = useCallback((strengths: string[]) => {
    setFormData(prev => ({
      ...prev,
      strengths: strengths,
    }));
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (nameError) {
      alert(nameError);
      return;
    }
    onSave(formData);
  }, [formData, onSave, nameError]);

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-card rounded-lg">
      <Input
        id="name"
        label="Member Name"
        type="text"
        value={formData.name}
        onChange={handleChange}
        required
        className={nameError ? 'border-red-500' : ''}
      />
      {nameError && <p className="text-red-500 text-sm -mt-2 mb-2">{nameError}</p>}
      <Input
        id="title"
        label="Title/Role"
        type="text"
        value={formData.title}
        onChange={handleChange}
        required
      />
      <ChipInput
        id="role_tags"
        label="Role Tags (e.g., Lead, Clerk, Produce)"
        chips={formData.role_tags}
        onAddChip={chip => handleRoleTagsChange([...formData.role_tags, chip])}
        onRemoveChip={chip => handleRoleTagsChange(formData.role_tags.filter(t => t !== chip))}
        placeholder="Add a role tag..."
      />
      <ChipInput
        id="strengths"
        label="Strengths (Skills, e.g., Ordering, Merchandising)"
        chips={formData.strengths}
        onAddChip={chip => handleStrengthsChange([...formData.strengths, chip])}
        onRemoveChip={chip => handleStrengthsChange(formData.strengths.filter(s => s !== chip))}
        placeholder="Add a strength/skill..."
      />
      <Input
        id="fixed_commitments_minutes"
        label="Fixed Commitments (minutes per day)"
        type="number"
        value={formData.fixed_commitments_minutes}
        onChange={handleChange}
        min="0"
        required
      />

      <div className="flex justify-end space-x-2 mt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          Save Member
        </Button>
      </div>
    </form>
  );
};

export default MemberForm;