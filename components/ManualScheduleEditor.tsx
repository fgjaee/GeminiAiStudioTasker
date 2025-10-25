// components/ManualScheduleEditor.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Member, ID, ParsedScheduleShift } from '../types';
import Button from './Button';
import Select from './Select';
import Input from './Input';
import { Plus, Trash2 } from 'lucide-react';
import { SHORT_WEEKDAY_NAMES } from '../constants';
import { uuid } from '../services/utils';

interface ManualScheduleEditorProps {
  initialShifts: ParsedScheduleShift[];
  members: Member[];
  onSave: (shifts: ParsedScheduleShift[]) => void;
  onCancel: () => void;
}

const weekdayOptions = SHORT_WEEKDAY_NAMES.map(day => ({ value: day, label: day }));

const ManualScheduleEditor: React.FC<ManualScheduleEditorProps> = ({ initialShifts, members, onSave, onCancel }) => {
  const [shifts, setShifts] = useState<ParsedScheduleShift[]>(initialShifts);

  const memberOptions = useMemo(() => {
    return members.map(m => ({ value: m.name, label: m.name }));
  }, [members]);

  const handleShiftChange = useCallback((id: ID, field: keyof ParsedScheduleShift, value: string) => {
    setShifts(prev =>
      prev.map(shift => (shift.id === id ? { ...shift, [field]: value } : shift))
    );
  }, []);

  const handleAddShift = useCallback(() => {
    const newShift: ParsedScheduleShift = {
      id: uuid(),
      memberName: members[0]?.name || '',
      day: 'Mon',
      start: '09:00',
      end: '17:00',
    };
    setShifts(prev => [...prev, newShift]);
  }, [members]);

  const handleRemoveShift = useCallback((id: ID) => {
    setShifts(prev => prev.filter(shift => shift.id !== id));
  }, []);
  
  const handleSaveClick = () => {
    // Add validation here if needed
    onSave(shifts);
  };

  return (
    <div className="p-4 bg-card rounded-lg">
      <h3 className="text-lg font-semibold text-textdark mb-4">Manual Schedule Editor</h3>
      <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
        {shifts.map(shift => (
          <div key={shift.id} className="grid grid-cols-12 gap-2 items-end p-2 border rounded-md bg-gray-50">
            <div className="col-span-4">
              <label htmlFor={`manual_member_${shift.id}`} className="block text-xs font-medium text-gray-700">Member</label>
              <Input
                id={`manual_member_${shift.id}`}
                type="text"
                list="member-datalist"
                value={shift.memberName}
                onChange={(e) => handleShiftChange(shift.id, 'memberName', e.target.value)}
                placeholder="Type or select name"
                className="w-full mt-1"
              />
            </div>
            <div className="col-span-2">
              <Select
                id={`manual_day_${shift.id}`}
                label="Day"
                options={weekdayOptions}
                value={shift.day}
                onChange={(e) => handleShiftChange(shift.id, 'day', e.target.value)}
              />
            </div>
            <div className="col-span-2">
               <Input
                id={`manual_start_${shift.id}`}
                label="Start"
                type="time"
                value={shift.start}
                onChange={(e) => handleShiftChange(shift.id, 'start', e.target.value)}
              />
            </div>
             <div className="col-span-2">
              <Input
                id={`manual_end_${shift.id}`}
                label="End"
                type="time"
                value={shift.end}
                onChange={(e) => handleShiftChange(shift.id, 'end', e.target.value)}
              />
            </div>
            <div className="col-span-2 flex justify-end space-x-1">
                <Button variant="danger" size="sm" onClick={() => handleRemoveShift(shift.id)}>
                    <Trash2 size={16} />
                </Button>
            </div>
          </div>
        ))}
      </div>
       <datalist id="member-datalist">
        {memberOptions.map(opt => <option key={opt.value} value={opt.value} />)}
      </datalist>
      <div className="flex justify-between mt-4">
        <Button variant="secondary" onClick={handleAddShift}>
          <Plus size={16} className="mr-2" /> Add Row
        </Button>
        <div className="space-x-2">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveClick}>Save Manual Shifts</Button>
        </div>
      </div>
    </div>
  );
};

export default ManualScheduleEditor;