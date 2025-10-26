// components/Planner/ShiftPatternManager.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { Member, ShiftPattern, PlannedShift, ID } from '../../types';
import Button from '../Button';
import Select from '../Select';
import { Save, Copy, Trash2 } from 'lucide-react';
import { uuid } from '../../utils/helpers';
import dayjs from 'dayjs';

interface ShiftPatternManagerProps {
  members: Member[];
  shiftPatterns: ShiftPattern[];
  plannedShifts: PlannedShift[];
  targetDates: string[];
  onSavePattern: (pattern: ShiftPattern) => Promise<void>;
  onDeletePattern: (id: ID) => Promise<void>;
  onApplyPattern: (patternShifts: Omit<PlannedShift, 'id'>[]) => void;
}

const ShiftPatternManager: React.FC<ShiftPatternManagerProps> = ({
  members,
  shiftPatterns,
  plannedShifts,
  targetDates,
  onSavePattern,
  onDeletePattern,
  onApplyPattern,
}) => {
  const [selectedMemberId, setSelectedMemberId] = useState<ID | ''>('');

  const memberOptions = useMemo(() => {
    return [{ value: '', label: 'Select Member for Patterns' }, ...members.map(m => ({ value: m.id, label: m.name }))];
  }, [members]);

  const memberPattern = useMemo(() => {
    return shiftPatterns.find(p => p.member_id === selectedMemberId);
  }, [selectedMemberId, shiftPatterns]);

  const handleSavePattern = useCallback(async () => {
    if (!selectedMemberId) {
        alert('Please select a member first.');
        return;
    }
    const memberName = members.find(m => m.id === selectedMemberId)?.name || 'Member';
    const shiftsInWeek = plannedShifts.filter(s => s.member_id === selectedMemberId && targetDates.includes(s.date));

    if (shiftsInWeek.length === 0) {
        alert(`No shifts found for ${memberName} in the current week to save as a pattern.`);
        return;
    }

    const patternShifts: ShiftPattern['shifts'] = shiftsInWeek.map(({ day, start, end, area_id }) => ({ day, start, end, area_id }));
    
    const newPattern: ShiftPattern = {
        id: memberPattern?.id || uuid(),
        member_id: selectedMemberId,
        name: `${memberName}'s Standard Week`,
        shifts: patternShifts,
    };
    
    await onSavePattern(newPattern);
  }, [selectedMemberId, members, plannedShifts, targetDates, onSavePattern, memberPattern]);

  const handleApplyPattern = useCallback(() => {
    if (!memberPattern) {
        alert('No pattern saved for this member.');
        return;
    }
    // FIX: Add a guard clause to ensure a member is selected. This also helps TypeScript narrow the type of selectedMemberId.
    if (!selectedMemberId) {
        alert('Please select a member to apply the pattern to.');
        return;
    }
    const dateMap = new Map(targetDates.map(d => [dayjs(d).format('ddd'), d]));
    const shiftsToCreate: Omit<PlannedShift, 'id'>[] = [];

    memberPattern.shifts.forEach(patternShift => {
        const targetDate = dateMap.get(patternShift.day);
        if (targetDate) {
            shiftsToCreate.push({
                member_id: selectedMemberId,
                date: targetDate,
                day: patternShift.day,
                start: patternShift.start,
                end: patternShift.end,
                area_id: patternShift.area_id,
                status: 'draft',
                source: 'template',
                reason: `Applied from '${memberPattern.name}'`,
            });
        }
    });

    onApplyPattern(shiftsToCreate);

  }, [memberPattern, targetDates, onApplyPattern, selectedMemberId]);

  return (
    <div className="bg-gray-50 shadow-md rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-textdark mb-2">Shift Pattern Manager</h3>
        <div className="flex items-end space-x-2">
            <div className="flex-grow">
                <Select
                    id="pattern-member-select"
                    label="Select Member"
                    options={memberOptions}
                    value={selectedMemberId}
                    onChange={e => setSelectedMemberId(e.target.value)}
                />
            </div>
            <Button onClick={handleSavePattern} disabled={!selectedMemberId}><Save size={16} className="mr-2"/> Save Current Week as Pattern</Button>
            <Button onClick={handleApplyPattern} disabled={!memberPattern}><Copy size={16} className="mr-2"/> Apply Pattern to Week</Button>
            {memberPattern && (
                <Button variant="danger" onClick={() => onDeletePattern(memberPattern.id)}><Trash2 size={16} className="mr-2" /> Delete Pattern</Button>
            )}
        </div>
    </div>
  );
};

export default ShiftPatternManager;
