import React, { useState, useEffect, useCallback } from 'react';
import { Member } from '../types';
import Input from './Input';
import Button from './Button';
import ChipInput from './ChipInput';
import { uuid } from '../utils/helpers'; // Import uuid

interface MemberFormProps {
  member?: Member | null;
  onSave: (member: Member) => void;
  onCancel: () => void;
  allTaskIds: string[]; // For default tasks dropdown (if implemented later)
}

const MemberForm: React.FC<MemberFormProps> = ({ member, onSave, onCancel, allTaskIds }) => {
  const [formData, setFormData] = useState<Member>(member || {
    id: uuid(), // Use uuid
    name: '',
    title: '',
    role_tags: [],
    strengths: [],
    fixed_commitments_minutes: 0,
    default_tasks: [],
  });

  useEffect(() => {
    if (member) {
      setFormData(member);
    } else {
      setFormData({
        id: uuid(), // Use uuid
        name: '',
        title: '',
        role_tags: [],
        strengths: [],
        fixed_commitments_minutes: 0,
        default_tasks: [],
      });
    }
  }, [member]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: type === 'number' ? parseFloat(value) || 0 : value,
    }));
  }, []);

  const handleAddChip = useCallback((field: 'role_tags' | 'strengths', chip: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], chip].filter((val, idx, arr) => arr.indexOf(val) === idx), // Add unique
    }));
  }, []);

  const handleRemoveChip = useCallback((field: 'role_tags' | 'strengths', chip: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter(c => c !== chip),
    }));
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  }, [formData, onSave]);

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-card rounded-lg">
      <Input
        id="name"
        label="Name"
        type="text"
        value={formData.name}
        onChange={handleChange}
        required
      />
      <Input
        id="title"
        label="Title"
        type="text"
        value={formData.title}
        onChange={handleChange}
        required
      />
      <ChipInput
        id="role_tags"
        label="Role Tags (e.g., Opener, Juicer, Closer)"
        chips={formData.role_tags}
        onAddChip={chip => handleAddChip('role_tags', chip)}
        onRemoveChip={chip => handleRemoveChip('role_tags', chip)}
        placeholder="Add a role tag..."
      />
      <ChipInput
        id="strengths"
        label="Strengths (e.g., Organization, Customer Service)"
        chips={formData.strengths}
        onAddChip={chip => handleAddChip('strengths', chip)}
        onRemoveChip={chip => handleRemoveChip('strengths', chip)}
        placeholder="Add a strength..."
      />
      <Input
        id="fixed_commitments_minutes"
        label="Fixed Commitments (minutes per shift, e.g., breaks, check-in)"
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