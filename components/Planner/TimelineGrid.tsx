// components/Planner/TimelineGrid.tsx
import React, { useState, useMemo, useCallback, useRef, MouseEvent } from 'react';
import { Member, Area, PlannedShift, ManagerSettings, ID } from '../../types';
import { timeToMinutes, minutesToTime } from '../../utils/helpers';
import dayjs from 'dayjs';

interface TimelineGridProps {
  targetDates: string[];
  plannedShifts: PlannedShift[];
  members: Member[];
  areas: Area[];
  settings: ManagerSettings;
  onShiftClick: (shift: PlannedShift) => void;
  onNewShift: (shiftData: Partial<PlannedShift>) => void;
}

const GRID_START_HOUR = 6;
const GRID_END_HOUR = 22;
const ROW_HEIGHT = 20; // Height for a 30-minute slot

const TimelineGrid: React.FC<TimelineGridProps> = ({
  targetDates,
  plannedShifts,
  members,
  areas,
  settings,
  onShiftClick,
  onNewShift,
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [ghostShift, setGhostShift] = useState<{ date: string; start: number; end: number } | null>(null);

  const memberMap = useMemo(() => new Map(members.map(m => [m.id, m])), [members]);
  const areaMap = useMemo(() => new Map(areas.map(a => [a.id, a])), [areas]);
  const slotDuration = settings.defaultSlotDuration || 30;
  const pixelsPerMinute = ROW_HEIGHT / slotDuration;

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = GRID_START_HOUR; hour < GRID_END_HOUR; hour++) {
      slots.push(`${String(hour).padStart(2, '0')}:00`);
      slots.push(`${String(hour).padStart(2, '0')}:30`);
    }
    return slots;
  }, []);

  const getMinutesFromTop = (e: MouseEvent<HTMLDivElement>): number => {
    if (!gridRef.current) return 0;
    const rect = gridRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minutes = Math.floor(y / pixelsPerMinute / slotDuration) * slotDuration;
    return minutes + GRID_START_HOUR * 60;
  };

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>, date: string) => {
    e.preventDefault();
    setIsCreating(true);
    const startMinutes = getMinutesFromTop(e);
    setGhostShift({
      date,
      start: startMinutes,
      end: startMinutes + slotDuration,
    });
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isCreating || !ghostShift) return;
    const currentMinutes = getMinutesFromTop(e);
    setGhostShift(prev => prev ? { ...prev, end: Math.max(currentMinutes + slotDuration, prev.start + slotDuration) } : null);
  };

  const handleMouseUp = (e: MouseEvent<HTMLDivElement>) => {
    if (!isCreating || !ghostShift) return;
    setIsCreating(false);
    
    onNewShift({
      date: ghostShift.date,
      day: dayjs(ghostShift.date).format('ddd') as PlannedShift['day'],
      start: minutesToTime(ghostShift.start),
      end: minutesToTime(ghostShift.end),
      status: 'draft',
      source: 'manual',
    });

    setGhostShift(null);
  };

  const renderShift = (shift: PlannedShift) => {
    const top = (timeToMinutes(shift.start) - GRID_START_HOUR * 60) * pixelsPerMinute;
    const height = (timeToMinutes(shift.end) - timeToMinutes(shift.start)) * pixelsPerMinute;
    const member = memberMap.get(shift.member_id);
    const area = shift.area_id ? areaMap.get(shift.area_id) : null;

    return (
      <div
        key={shift.id}
        className="absolute w-full px-1 py-0.5 bg-blue-500 border border-blue-700 rounded-md text-white text-xs cursor-pointer hover:bg-blue-600"
        style={{ top: `${top}px`, height: `${height}px`, minHeight: '15px' }}
        onClick={() => onShiftClick(shift)}
      >
        <p className="font-bold truncate">{member?.name || 'Unassigned'}</p>
        {area && <p className="truncate opacity-80">{area.name}</p>}
      </div>
    );
  };
  
  return (
    <div className="flex select-none">
      {/* Time Gutter */}
      <div className="w-16 text-right pr-2 text-xs text-gray-500">
        <div className="h-8"></div> {/* Spacer for date header */}
        {timeSlots.map(time => (
          <div key={time} style={{ height: `${ROW_HEIGHT}px` }} className="relative -top-2">
            {time.endsWith(':00') && time}
          </div>
        ))}
      </div>

      {/* Grid Content */}
      <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${targetDates.length}, 1fr)` }} onMouseUp={handleMouseUp} onMouseLeave={() => {setIsCreating(false); setGhostShift(null);}}>
        {targetDates.map(date => (
          <div key={date} className="relative border-l border-gray-200">
            {/* Date Header */}
            <div className="h-8 sticky top-0 bg-card z-10 text-center font-semibold border-b">
              {dayjs(date).format('ddd, MMM D')}
            </div>

            {/* Column for shifts and creation */}
            <div
              className="relative"
              ref={gridRef}
              onMouseDown={(e) => handleMouseDown(e, date)}
              onMouseMove={handleMouseMove}
            >
              {/* Time Slot Lines */}
              {timeSlots.map(time => (
                <div key={`${date}-${time}`} style={{ height: `${ROW_HEIGHT}px` }} className="border-b border-gray-100"></div>
              ))}
              
              {/* Shifts for this day */}
              {plannedShifts.filter(s => s.date === date).map(renderShift)}

              {/* Ghost Shift for creation */}
              {isCreating && ghostShift && ghostShift.date === date && (
                 <div
                    className="absolute w-full bg-blue-300 border-2 border-dashed border-blue-500 rounded-md opacity-70 pointer-events-none"
                    style={{
                        top: `${(ghostShift.start - GRID_START_HOUR * 60) * pixelsPerMinute}px`,
                        height: `${(ghostShift.end - ghostShift.start) * pixelsPerMinute}px`,
                    }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimelineGrid;
