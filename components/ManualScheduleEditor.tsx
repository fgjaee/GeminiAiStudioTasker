// components/ManualScheduleEditor.tsx
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Member, ID, ParsedScheduleShift, ShiftPattern } from '../types';
import Button from './Button';
import { Plus, Trash2, X, Edit2, Copy, Save, Repeat, RotateCcw, RotateCw } from 'lucide-react';
import { SHORT_WEEKDAY_NAMES } from '../constants';
import { uuid, timeToMinutes, minutesToTime, assertUniqueKeys } from '../utils/helpers';
import { useToast } from './Toast';

const GRID_START_HOUR = 5; // Start timeline at 5 AM
const GRID_END_HOUR = 23; // End timeline at 11 PM
const SLOT_DURATION = 15; // 15-minute increments
const ROW_HEIGHT_PER_HOUR = 60; // Pixels per hour

interface ManualScheduleEditorProps {
  initialShifts: ParsedScheduleShift[];
  members: Member[];
  shiftPatterns: ShiftPattern[];
  onSave: (shifts: ParsedScheduleShift[]) => void;
  onCancel: () => void;
  onSavePattern: (pattern: ShiftPattern) => Promise<void>;
  onDeletePattern: (id: ID) => Promise<void>;
}

const ManualScheduleEditor: React.FC<ManualScheduleEditorProps> = ({
  initialShifts,
  members,
  shiftPatterns,
  onSave,
  onCancel,
  onSavePattern,
  onDeletePattern
}) => {
  const { addToast } = useToast();
  const [shifts, setShifts] = useState<ParsedScheduleShift[]>(initialShifts.map(s => ({...s, id: s.id || uuid()})));
  const gridBodyRef = useRef<HTMLDivElement>(null);
  
  // State for drag interactions
  const [dragAction, setDragAction] = useState<{
    type: 'create' | 'move' | 'resize-start' | 'resize-end';
    shiftId: ID;
    memberName: string;
    day: string;
    startY: number;
    originalTop: number;
    originalHeight: number;
  } | null>(null);

  // State for history (undo/redo)
  const [history, setHistory] = useState<ParsedScheduleShift[][]>([shifts]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const pixelsPerMinute = ROW_HEIGHT_PER_HOUR / 60;

  const allMemberNames = useMemo(() => {
    const names = new Set(members.map(m => m.name));
    shifts.forEach(s => names.add(s.memberName));
    return Array.from(names).sort();
  }, [members, shifts]);
  
  // Debounced save effect
  useEffect(() => {
    const handler = setTimeout(() => {
      if (history[historyIndex] !== initialShifts) { // Only save if there are changes
        onSave(shifts);
      }
    }, 1500); // Autosave after 1.5 seconds of inactivity
    return () => clearTimeout(handler);
  }, [shifts, onSave]);

  const recordHistory = (newShifts: ParsedScheduleShift[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newShifts);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setShifts(history[newIndex]);
      addToast({ message: 'Undo successful', type: 'info' });
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setShifts(history[newIndex]);
      addToast({ message: 'Redo successful', type: 'info' });
    }
  };

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let h = GRID_START_HOUR; h < GRID_END_HOUR; h++) {
      slots.push(`${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'am' : 'pm'}`);
    }
    return slots;
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, memberName: string, day: string) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const startY = e.clientY - rect.top;
    const startMinutes = Math.round((startY / pixelsPerMinute) / SLOT_DURATION) * SLOT_DURATION + (GRID_START_HOUR * 60);
    
    const newShift: ParsedScheduleShift = {
      id: uuid(),
      memberName, day: day as any,
      start: minutesToTime(startMinutes),
      end: minutesToTime(startMinutes + 60), // Default 1 hour
    };

    recordHistory([...shifts, newShift]);
    setShifts(prev => [...prev, newShift]);

    setDragAction({
      type: 'resize-end',
      shiftId: newShift.id,
      memberName, day, startY,
      originalTop: startY,
      originalHeight: 60 * pixelsPerMinute,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragAction || !gridBodyRef.current) return;
    e.preventDefault();

    const gridRect = gridBodyRef.current.getBoundingClientRect();
    const currentY = e.clientY - gridRect.top - (allMemberNames.indexOf(dragAction.memberName) * ROW_HEIGHT_PER_HOUR * (GRID_END_HOUR - GRID_START_HOUR));
    
    setShifts(currentShifts => currentShifts.map(s => {
      if (s.id !== dragAction.shiftId) return s;
      
      let newTop, newHeight;
      switch (dragAction.type) {
        case 'move':
          const dy = currentY - dragAction.startY;
          newTop = dragAction.originalTop + dy;
          break;
        case 'resize-start':
          const heightChangeStart = dragAction.originalTop - currentY;
          newHeight = dragAction.originalHeight + heightChangeStart;
          newTop = currentY;
          break;
        case 'resize-end':
          newHeight = currentY - dragAction.originalTop;
          newTop = dragAction.originalTop;
          break;
        default: return s;
      }
      
      newTop = Math.max(0, newTop);
      newHeight = Math.max(SLOT_DURATION * pixelsPerMinute, newHeight);

      const startMinutes = Math.round((newTop / pixelsPerMinute) / SLOT_DURATION) * SLOT_DURATION + (GRID_START_HOUR * 60);
      const endMinutes = Math.round(((newTop + newHeight) / pixelsPerMinute) / SLOT_DURATION) * SLOT_DURATION + (GRID_START_HOUR * 60);
      
      return { ...s, start: minutesToTime(startMinutes), end: minutesToTime(endMinutes) };
    }));
  };
  
  const handleMouseUp = () => {
    if (dragAction) {
      recordHistory(shifts);
      setDragAction(null);
    }
  };

  const handleDeleteShift = (id: ID) => {
    const newShifts = shifts.filter(s => s.id !== id);
    recordHistory(newShifts);
    setShifts(newShifts);
  };

  const handleSavePatternForMember = (memberName: string) => {
    const memberId = members.find(m => m.name === memberName)?.id;
    if (!memberId) {
      addToast({ message: `Could not find a member profile for ${memberName}.`, type: 'error' });
      return;
    }
    const shiftsForMember = shifts.filter(s => s.memberName === memberName);
    if(shiftsForMember.length === 0) {
      addToast({ message: `No shifts to save for ${memberName}.`, type: 'info' });
      return;
    }
    const pattern: ShiftPattern = {
      id: shiftPatterns.find(p => p.member_id === memberId)?.id || uuid(),
      member_id: memberId,
      name: `${memberName}'s Weekly Pattern`,
      shifts: shiftsForMember.map(({ day, start, end, memberName }) => ({ day, start, end, memberName })),
    };
    onSavePattern(pattern);
    addToast({ message: `Pattern saved for ${memberName}.`, type: 'success' });
  };
  
  const handleApplyPatternForMember = (memberName: string) => {
    const memberId = members.find(m => m.name === memberName)?.id;
    const pattern = shiftPatterns.find(p => p.member_id === memberId);
    if (!pattern) {
      addToast({ message: `No pattern found for ${memberName}.`, type: 'info' });
      return;
    }
    const shiftsWithoutMember = shifts.filter(s => s.memberName !== memberName);
    const newShiftsFromPattern = pattern.shifts.map(ps => ({
      ...ps, id: uuid(), memberName,
    }));
    const newShifts = [...shiftsWithoutMember, ...newShiftsFromPattern];
    recordHistory(newShifts);
    setShifts(newShifts);
    addToast({ message: `Pattern applied for ${memberName}.`, type: 'success' });
  };

  return (
    <div className="p-2 bg-card rounded-lg w-full max-w-7xl mx-auto" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <div className="flex justify-between items-center mb-4 px-2">
        <h3 className="text-xl font-semibold text-textdark">Interactive Schedule Timeline</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleUndo} disabled={historyIndex === 0}><RotateCcw size={14} className="mr-1"/> Undo</Button>
          <Button variant="outline" size="sm" onClick={handleRedo} disabled={historyIndex === history.length - 1}><RotateCw size={14} className="mr-1"/> Redo</Button>
          <Button variant="outline" onClick={onCancel}>Close</Button>
        </div>
      </div>
      
      <div className="flex">
        {/* Member Column */}
        <div className="w-48">
          <div className="h-8 border-b border-r text-sm font-medium text-gray-600 flex items-center justify-center">Member</div>
          {allMemberNames.map(name => (
            <div key={name} className="h-24 border-b border-r p-2 flex flex-col justify-center items-start">
              <span className="font-medium text-sm text-gray-800">{name}</span>
              <div className="flex items-center gap-1 mt-1">
                <Button size="sm" variant="outline" className="h-6 px-1" title="Save Pattern" onClick={() => handleSavePatternForMember(name)}><Save size={12}/></Button>
                <Button size="sm" variant="outline" className="h-6 px-1" title="Apply Pattern" onClick={() => handleApplyPatternForMember(name)}><Repeat size={12}/></Button>
              </div>
            </div>
          ))}
        </div>

        {/* Timeline Grid */}
        <div className="flex-1 overflow-x-auto">
          <div className="grid grid-cols-7 min-w-[800px]">
            {SHORT_WEEKDAY_NAMES.map(day => (
              <div key={day} className="h-8 border-b border-r text-sm font-medium text-gray-600 flex items-center justify-center">{day}</div>
            ))}
            {allMemberNames.map(memberName => (
              <React.Fragment key={memberName}>
                {SHORT_WEEKDAY_NAMES.map(day => (
                  <div 
                    key={`${memberName}-${day}`} 
                    className="h-24 border-b border-r relative bg-gray-50"
                    onMouseDown={(e) => handleMouseDown(e, memberName, day)}
                  >
                    {shifts.filter(s => s.memberName === memberName && s.day === day).map(shift => {
                      const top = (timeToMinutes(shift.start) - GRID_START_HOUR * 60) / (60 / ROW_HEIGHT_PER_HOUR);
                      const height = (timeToMinutes(shift.end) - timeToMinutes(shift.start)) / (60 / ROW_HEIGHT_PER_HOUR);
                      return (
                        <div
                          key={shift.id}
                          className="absolute bg-blue-500 text-white rounded border border-blue-700 p-1 text-[10px] w-[95%] left-[2.5%] cursor-move select-none"
                          style={{ top: `${top}px`, height: `${height}px` }}
                          onMouseDown={e => {
                            e.stopPropagation();
                            setDragAction({ type: 'move', shiftId: shift.id, memberName, day, startY: e.clientY, originalTop: top, originalHeight: height });
                          }}
                        >
                          <div className="h-1 w-full cursor-n-resize" onMouseDown={e => {
                            e.stopPropagation();
                            setDragAction({ type: 'resize-start', shiftId: shift.id, memberName, day, startY: e.clientY, originalTop: top, originalHeight: height });
                          }}></div>
                          <span className="font-bold">{shift.start} - {shift.end}</span>
                          <button className="absolute top-0 right-0 p-0.5 text-white hover:text-red-300" onClick={(e) => {e.stopPropagation(); handleDeleteShift(shift.id);}}><X size={10}/></button>
                          <div className="absolute bottom-0 h-1 w-full cursor-s-resize" onMouseDown={e => {
                             e.stopPropagation();
                             setDragAction({ type: 'resize-end', shiftId: shift.id, memberName, day, startY: e.clientY, originalTop: top, originalHeight: height });
                          }}></div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualScheduleEditor;