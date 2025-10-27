
// components/ScheduleTab.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Member, WeeklyScheduleDay, ScheduleShift, ParsedScheduleShift, ID, MemberAlias } from '../types';
import Button from './Button';
import Modal from './Modal';
import { Upload, AlertTriangle, Pencil } from 'lucide-react';
import dayjs from 'dayjs';
// FIX: Import uuid and SHORT_WEEKDAY_NAMES
import { assertUniqueKeys, uuid } from '../services/utils';
import { SHORT_WEEKDAY_NAMES } from '../constants';
import { importSchedule } from '../services/importSchedule';
import ManualScheduleEditor from './ManualScheduleEditor';
import ResolveAliasModal from './ResolveAliasModal';
import { useToast } from './Toast';

interface ScheduleTabProps {
  members: Member[];
  weeklySchedule: WeeklyScheduleDay[];
  memberAliases: MemberAlias[];
  onSaveWeeklySchedule: (scheduleDay: WeeklyScheduleDay | WeeklyScheduleDay[]) => Promise<void>;
  onDeleteWeeklySchedule: (id: ID) => Promise<void>;
  onSaveAlias: (alias: MemberAlias) => Promise<void>;
  fetchData: () => void;
}

const ScheduleTab: React.FC<ScheduleTabProps> = ({
  members,
  weeklySchedule,
  memberAliases,
  onSaveWeeklySchedule,
  onDeleteWeeklySchedule,
  onSaveAlias,
  fetchData,
}) => {
  const { addToast } = useToast();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isManualEditorOpen, setIsManualEditorOpen] = useState(false);
  const [isAliasModalOpen, setIsAliasModalOpen] = useState(false);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const [unresolvedQueue, setUnresolvedQueue] = useState<ParsedScheduleShift[]>([]);
  const [currentUnresolvedName, setCurrentUnresolvedName] = useState<string>('');
  
  const memberMap = useMemo(() => new Map(members.map(m => [m.id, m])), [members]);
  const nameMap = useMemo(() => new Map(members.map(m => [m.name.toLowerCase(), m.id])), [members]);
  const aliasMap = useMemo(() => new Map(memberAliases.map(a => [a.alias.toLowerCase(), a.member_id])), [memberAliases]);

  const sortedSchedule = useMemo(() => {
    const schedule = [...weeklySchedule].sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
    assertUniqueKeys(schedule.map(sd => sd.id), "ScheduleTab.sortedSchedule");
    return schedule;
  }, [weeklySchedule]);
  
  const processAndSaveShifts = useCallback(async (shiftsToProcess: ParsedScheduleShift[]) => {
    const shiftsByDate = new Map<string, ScheduleShift[]>();

    for (const parsedShift of shiftsToProcess) {
        if (!parsedShift.member_id) continue;
        const date = dayjs().startOf('week').day(SHORT_WEEKDAY_NAMES.indexOf(parsedShift.day)).format('YYYY-MM-DD');
        if (!shiftsByDate.has(date)) shiftsByDate.set(date, []);
        
        shiftsByDate.get(date)!.push({
            id: parsedShift.id,
            memberId: parsedShift.member_id,
            start: parsedShift.start,
            end: parsedShift.end,
            source: 'import',
        });
    }

    const daysToSave: WeeklyScheduleDay[] = Array.from(shiftsByDate.entries()).map(([date, shifts]) => {
        const existingDay = weeklySchedule.find(d => d.date === date);
        return {
            id: existingDay?.id || uuid(),
            date,
            shifts: [...(existingDay?.shifts || []), ...shifts],
        };
    });

    if (daysToSave.length > 0) {
        await onSaveWeeklySchedule(daysToSave);
        addToast({ message: 'Schedule imported and saved!', type: 'success' });
    }
  }, [onSaveWeeklySchedule, weeklySchedule, addToast]);

  const processQueue = useCallback((queue: ParsedScheduleShift[]) => {
    const nextShift = queue[0];
    if (!nextShift) {
        setIsAliasModalOpen(false);
        processAndSaveShifts(initialShiftsRef.current);
        initialShiftsRef.current = [];
        return;
    }
    
    const nameLower = nextShift.memberName.toLowerCase();
    const memberId = nameMap.get(nameLower) || aliasMap.get(nameLower);

    if (memberId) {
        nextShift.member_id = memberId;
        processQueue(queue.slice(1));
    } else {
        setCurrentUnresolvedName(nextShift.memberName);
        setIsAliasModalOpen(true);
    }
  }, [nameMap, aliasMap, processAndSaveShifts]);

  const initialShiftsRef = React.useRef<ParsedScheduleShift[]>([]);

  const handleImportSchedule = useCallback(async () => {
    if (!selectedFile) {
      setImportError('Please select a file.'); return;
    }
    setImporting(true); setImportError(null);
    try {
      const parsedShifts = await importSchedule(selectedFile);
      if (parsedShifts.length === 0) {
        setImportError("No shifts were parsed. You can add them manually.");
        setIsManualEditorOpen(true);
      } else {
        initialShiftsRef.current = parsedShifts;
        setUnresolvedQueue(parsedShifts);
        processQueue(parsedShifts);
      }
      setIsImportModalOpen(false);
    } catch (err) {
      setImportError((err as Error).message);
    } finally {
      setImporting(false);
    }
  }, [selectedFile, processQueue]);

  const handleResolve = useCallback(async (name: string, memberId: ID) => {
    await onSaveAlias({ id: uuid(), member_id: memberId, alias: name.toLowerCase() });
    await fetchData(); // Refetch data to update aliasMap

    const updatedQueue = unresolvedQueue.map(s => s.memberName === name ? { ...s, member_id: memberId } : s);
    setUnresolvedQueue(updatedQueue);
    processQueue(updatedQueue.filter(s => !s.member_id));
  }, [onSaveAlias, unresolvedQueue, processQueue, fetchData]);
  
  const handleSkip = useCallback((name: string) => {
      const remainingQueue = unresolvedQueue.slice(1);
      setUnresolvedQueue(remainingQueue);
      processQueue(remainingQueue);
  }, [unresolvedQueue, processQueue]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-textdark">Weekly Schedule</h2>
        <div className="flex space-x-2">
            <Button onClick={() => setIsManualEditorOpen(true)} variant="secondary">
                <Pencil size={18} className="mr-2" /> Manual Editor
            </Button>
            <Button onClick={() => { setImportError(null); setSelectedFile(null); setIsImportModalOpen(true); }} variant="primary">
                <Upload size={18} className="mr-2" /> Import Schedule
            </Button>
        </div>
      </div>
      
      {weeklySchedule.length === 0 && (
          <div className="text-center p-8 bg-card rounded-lg shadow-md">
              <p className="text-gray-500">No schedule data found. Please import a schedule file.</p>
          </div>
      )}

      {sortedSchedule.map(day => (
        <div key={day.id} className="mb-6 bg-card shadow-lg rounded-lg p-4">
          <h3 className="font-bold text-lg mb-2">{dayjs(day.date).format('dddd, MMMM D')}</h3>
          {day.shifts.length === 0 ? <p className="text-sm text-gray-500">No staff scheduled.</p> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {day.shifts.map(shift => (
                <div key={shift.id} className="bg-gray-100 p-2 rounded text-sm">
                  <strong>{memberMap.get(shift.memberId)?.name || 'Unknown'}</strong>: {shift.start} - {shift.end}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      
      <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Import Schedule">
          <div className="p-4">
              <input type="file" accept=".pdf,.csv,.xlsx" onChange={e => setSelectedFile(e.target.files ? e.target.files[0] : null)} />
              {importError && <p className="text-red-500 mt-2">{importError}</p>}
          </div>
          <div className="flex justify-end p-4 border-t">
              <Button variant="primary" onClick={handleImportSchedule} disabled={importing || !selectedFile}>
                  {importing ? 'Processing...' : 'Import'}
              </Button>
          </div>
      </Modal>

      <Modal isOpen={isManualEditorOpen} onClose={() => setIsManualEditorOpen(false)} title="Manual Schedule Editor">
          <ManualScheduleEditor
              initialShifts={[]}
              members={members}
              onSave={(shifts) => { processAndSaveShifts(shifts); setIsManualEditorOpen(false); }}
              onCancel={() => setIsManualEditorOpen(false)}
          />
      </Modal>

      <ResolveAliasModal
        isOpen={isAliasModalOpen}
        unresolvedName={currentUnresolvedName}
        members={members}
        onResolve={handleResolve}
        onSkip={handleSkip}
      />
    </div>
  );
};

export default ScheduleTab;