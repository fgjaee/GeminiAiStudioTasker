// components/Planner/ShiftEditorModal.tsx
// FIX: Import `useMemo` from react.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PlannedShift, Member, Area, ID } from '../../types';
import Modal from '../Modal';
import Button from '../Button';
import Select from '../Select';
import Input from '../Input';
import { uuid, calculateDuration } from '../../utils/helpers';

interface ShiftEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shift: PlannedShift) => void;
  onDelete: (id: ID) => void;
  shiftData: Partial<PlannedShift>;
  isNew: boolean;
  members: Member[];
  areas: Area[];
}

const ShiftEditorModal: React.FC<ShiftEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  shiftData,
  isNew,
  members,
  areas,
}) => {
  const [formData, setFormData] = useState<Partial<PlannedShift>>({});

  useEffect(() => {
    setFormData(shiftData);
  }, [shiftData]);

  const memberOptions = useMemo(() => {
    return [{ value: '', label: 'Select a Member' }, ...members.map(m => ({ value: m.id, label: m.name }))];
  }, [members]);

  const areaOptions = useMemo(() => {
    return [{ value: '', label: 'No Specific Area' }, ...areas.map(a => ({ value: a.id, label: a.name }))];
  }, [areas]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  }, []);

  const handleTimeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const { id, value } = e.target;
      setFormData(prev => {
          const newStart = id === 'start' ? value : prev.start;
          const newEnd = id === 'end' ? value : prev.end;
          if (calculateDuration(newStart!, newEnd!) < 0) {
              // Handle invalid time range, maybe show an error
              return { ...prev, [id]: value };
          }
          return { ...prev, [id]: value };
      });
  }, []);

  const handleSave = () => {
    if (!formData.member_id) {
        alert('Please select a team member.');
        return;
    }
    const finalShift: PlannedShift = {
        id: formData.id || uuid(),
        member_id: formData.member_id,
        date: formData.date!,
        day: formData.day!,
        start: formData.start!,
        end: formData.end!,
        area_id: formData.area_id || undefined,
        status: 'draft',
        source: formData.source || 'manual',
    };
    onSave(finalShift);
  };
  
  const handleDelete = () => {
    if (formData.id && !isNew) {
      onDelete(formData.id);
    }
  };


  const footer = (
    <div className="w-full flex justify-between">
        <div>
            {!isNew && (
                <Button variant="danger" onClick={handleDelete}>Delete Shift</Button>
            )}
        </div>
        <div className="space-x-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleSave}>
                {isNew ? 'Create Shift' : 'Save Changes'}
            </Button>
        </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isNew ? 'Create New Shift' : 'Edit Shift'}
      footer={footer}
    >
      <div className="p-4 space-y-4">
        <Select
          id="member_id"
          label="Team Member"
          options={memberOptions}
          value={formData.member_id || ''}
          onChange={handleChange}
          required
        />
        <Select
          id="area_id"
          label="Area (Optional)"
          options={areaOptions}
          value={formData.area_id || ''}
          onChange={handleChange}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            id="start"
            label="Start Time"
            type="time"
            value={formData.start || ''}
            onChange={handleTimeChange}
            required
          />
          <Input
            id="end"
            label="End Time"
            type="time"
            value={formData.end || ''}
            onChange={handleTimeChange}
            required
          />
        </div>
        <p className="text-sm text-gray-500">
            Date: {formData.date}
        </p>
      </div>
    </Modal>
  );
};

export default ShiftEditorModal;