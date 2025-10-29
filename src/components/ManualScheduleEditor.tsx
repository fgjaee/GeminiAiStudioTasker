// components/ManualScheduleEditor.tsx
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Member, ID, ParsedScheduleShift, ShiftPattern } from '../types';
import Button from '../../components/Button';
import { Plus, Trash2, X, Edit2, Copy, Save, Repeat, RotateCcw, RotateCw } from 'lucide-react';
import { SHORT_WEEKDAY_NAMES } from '../../constants';
import { uuid, timeToMinutes, minutesToTime, assertUniqueKeys } from '../../utils/helpers';
import { useToast } from '../../components/Toast';
import Select from '../../components/Select';
import Input from '../../components/Input';

interface ManualScheduleEditorProps {
  initialShifts: ParsedScheduleShift[];
  members: Member[];
  onSave: (shifts: ParsedScheduleShift[]) => void;
  onCancel: () => void;
}

const ManualScheduleEditor: React.FC<ManualScheduleEditorProps> = ({
  initialShifts,
  members,
  onSave,
  onCancel,
}) => {
  const { addToast } = useToast();
  const [shifts, setShifts] = useState<ParsedScheduleShift[]>(
    // Ensure initial shifts have stable IDs
    initialShifts.map(s => ({ ...s, id: s.id || uuid() }))
  );

  const memberOptions = useMemo(() => members.map(m => ({ value: m.name, label: m.name })), [members]);
  const dayOptions = useMemo(() => SHORT_WEEKDAY_NAMES.map(d => ({ value: d, label: d })), []);

  const handleAddRow = useCallback(() => {
    setShifts(prev => [...prev, {
      id: uuid(),
      memberName: members[0]?.name || '',
      day: 'Mon',
      start: '09:00',
      end: '17:00',
    }]);
  }, [members]);

  const handleRemoveRow = useCallback((id: ID) => {
    setShifts(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleShiftChange = useCallback((id: ID, field: keyof ParsedScheduleShift, value: string) => {
    setShifts(prev => prev.map(s => (s.id === id ? { ...s, [field]: value } : s)));
  }, []);

  const handleSaveToWeek = useCallback(() => {
    // Basic validation
    for (const shift of shifts) {
      if (!shift.memberName) {
        addToast({ message: 'All rows must have a member selected.', type: 'error' });
        return;
      }
    }
    onSave(shifts);
    addToast({ message: 'Schedule saved successfully!', type: 'success' });
  }, [shifts, onSave, addToast]);
  
  // Dev-only check for unique keys
  assertUniqueKeys(shifts.map(s => s.id), "ManualScheduleEditor");

  return (
    <div className="p-4 bg-card rounded-lg w-full max-w-4xl mx-auto">
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
        {shifts.map(shift => (
          <div key={shift.id} className="grid grid-cols-12 gap-2 items-end p-2 border rounded-md bg-gray-50">
            <div className="col-span-4">
              <Select
                id={`ms-member-${shift.id}`}
                label="Member"
                options={memberOptions}
                value={shift.memberName}
                onChange={(e) => handleShiftChange(shift.id, 'memberName', e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <Select
                id={`ms-day-${shift.id}`}
                label="Day"
                options={dayOptions}
                value={shift.day}
                onChange={(e) => handleShiftChange(shift.id, 'day', e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <Input
                id={`ms-start-${shift.id}`}
                label="Start"
                type="time"
                value={shift.start}
                onChange={(e) => handleShiftChange(shift.id, 'start', e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <Input
                id={`ms-end-${shift.id}`}
                label="End"
                type="time"
                value={shift.end}
                onChange={(e) => handleShiftChange(shift.id, 'end', e.target.value)}
              />
            </div>
            <div className="col-span-2 flex justify-end pb-4">
               <Button variant="danger" size="sm" onClick={() => handleRemoveRow(shift.id)}>
                 <Trash2 size={16} />
               </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between items-center mt-4 pt-4 border-t">
        <Button variant="secondary" onClick={handleAddRow}>
          <Plus size={16} className="mr-2" /> Add Row
        </Button>
        <div className="space-x-2">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveToWeek}>Save to Week</Button>
        </div>
      </div>
    </div>
  );
};

export default ManualScheduleEditor;