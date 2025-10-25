// components/MemberForm.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Member, ID, ShiftClass } from '../types';
import Input from './Input';
import ChipInput from './ChipInput';
import Button from './Button';
import Select from './Select';
import { uuid, assertUniqueKeys } from '../utils/helpers';
import { SHORT_WEEKDAY_NAMES } from '../constants';
import { Plus, Trash2 } from 'lucide-react';

interface MemberFormProps {
  member?: Member | null;
  onSave: (member: Member) => void;
  onCancel: () => void;
  existingMembers: Member[]; // For uniqueness validation of names
}

const weekdayOptions = SHORT_WEEKDAY_NAMES.map(day => ({ value: day, label: day }));
const shiftClassOptions: { value: ShiftClass; label: string }[] = [
  { value: 'Opening', label: 'Opening' },
  { value: 'Mid-Shift', label: 'Mid-Shift' },
  { value: 'Closing', label: 'Closing' },
  { value: 'Overnight', label: 'Overnight' },
  { value: 'Weekend', label: 'Weekend' },
  { value: 'General', label: 'General' },
];

const MemberForm: React.FC<MemberFormProps> = ({ member, onSave, onCancel, existingMembers }) => {
  const [formData, setFormData] = useState<Member>(member || {
    id: uuid(),
    name: '',
    title: '',
    role_tags: [],
    strengths: [],
    fixed_commitments_minutes: 0,
    default_tasks: [],
    max_daily_minutes: 480, // Default to 8 hours
    max_weekly_minutes: 2400, // Default to 40 hours
    shift_class_preference: [],
    availability: [],
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
        max_daily_minutes: 480,
        max_weekly_minutes: 2400,
        shift_class_preference: [],
        availability: [],
      });
    }
    setNameError(null); // Clear error on member change
  }, [member]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { id, value, type, checked } = e.target as HTMLInputElement;

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
      [id]: type === 'checkbox' ? checked : (type === 'number' ? parseFloat(value) || 0 : value),
    }));
  }, [formData.id, existingMembers]);

  const handleChipChange = useCallback((field: keyof Member, chips: string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: chips,
    }));
  }, []);

  const handleAvailabilityChange = useCallback((id: ID, field: keyof (typeof formData.availability)[0], value: string) => {
    setFormData(prev => ({
      ...prev,
      availability: prev.availability?.map(av => (av.id === id ? { ...av, [field]: value } : av)),
    }));
  }, []);

  const handleAddAvailability = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      availability: [...(prev.availability || []), { id: uuid(), day: 'Mon', start: '00:00', end: '23:59' }],
    }));
  }, []);

  const handleRemoveAvailability = useCallback((id: ID) => {
    setFormData(prev => ({
      ...prev,
      availability: prev.availability?.filter(av => av.id !== id),
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

  // Assert unique keys for availability (dev mode only)
  if (process.env.NODE_ENV !== "production") {
    assertUniqueKeys(formData.availability?.map(av => av.id) || [], "MemberForm.availability");
  }

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
        label="Title (e.g., Produce Lead, Clerk)"
        type="text"
        value={formData.title || ''}
        onChange={handleChange}
      />
      <ChipInput
        id="role_tags"
        label="Role Tags (e.g., Produce Lead, Ordering)"
        chips={formData.role_tags}
        onAddChip={chip => handleChipChange('role_tags', [...formData.role_tags, chip])}
        onRemoveChip={chip => handleChipChange('role_tags', formData.role_tags.filter(c => c !== chip))}
        placeholder="Add a role tag..."
      />
      <ChipInput
        id="strengths"
        label="Strengths (e.g., Wet Wall, Lifting)"
        chips={formData.strengths}
        onAddChip={chip => handleChipChange('strengths', [...formData.strengths, chip])}
        onRemoveChip={chip => handleChipChange('strengths', formData.strengths.filter(c => c !== chip))}
        placeholder="Add a strength..."
      />
      <Input
        id="fixed_commitments_minutes"
        label="Fixed Commitments (minutes/day, e.g., breaks, admin)"
        type="number"
        value={formData.fixed_commitments_minutes}
        onChange={handleChange}
        min="0"
        required
      />
      <Input
        id="max_daily_minutes"
        label="Max Daily Work Minutes (0 for no limit)"
        type="number"
        value={formData.max_daily_minutes || 0}
        onChange={handleChange}
        min="0"
      />
      <Input
        id="max_weekly_minutes"
        label="Max Weekly Work Minutes (0 for no limit)"
        type="number"
        value={formData.max_weekly_minutes || 0}
        onChange={handleChange}
        min="0"
      />
      <ChipInput
        id="shift_class_preference"
        label="Preferred Shift Classes (e.g., Opening, Closing)"
        chips={formData.shift_class_preference || []}
        onAddChip={chip => handleChipChange('shift_class_preference', [...(formData.shift_class_preference || []), chip])}
        onRemoveChip={chip => handleChipChange('shift_class_preference', (formData.shift_class_preference || []).filter(c => c !== chip))}
        placeholder="Add preferred shift class..."
      />

      <h3 className="text-md font-semibold text-textdark mt-4 mb-2">Daily Availability</h3>
      {(formData.availability || []).map(av => (
        <div key={av.id} className="flex space-x-2 mb-2 p-2 border border-gray-200 rounded-md bg-gray-50 items-end">
          <Select
            id={`availability_day_${av.id}`}
            label="Day"
            options={weekdayOptions}
            value={av.day}
            onChange={(e) => handleAvailabilityChange(av.id, 'day', e.target.value)}
            className="flex-1"
            required
          />
          <Input
            id={`availability_start_${av.id}`}
            label="Start Time"
            type="time"
            value={av.start}
            onChange={(e) => handleAvailabilityChange(av.id, 'start', e.target.value)}
            className="flex-1"
            required
          />
          <Input
            id={`availability_end_${av.id}`}
            label="End Time"
            type="time"
            value={av.end}
            onChange={(e) => handleAvailabilityChange(av.id, 'end', e.target.value)}
            className="flex-1"
            required
          />
          <Button type="button" variant="danger" size="sm" onClick={() => handleRemoveAvailability(av.id)} title="Remove Availability">
            <Trash2 size={16} />
          </Button>
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" onClick={handleAddAvailability} className="mt-2">
        <Plus size={16} className="mr-2" /> Add Availability
      </Button>


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