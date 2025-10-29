// components/ScheduleTab.tsx
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Member, WeeklyScheduleDay, ScheduleShift, ParsedScheduleShift, ID, ShiftPattern, MemberAlias, ParsedScheduleData } from '../types';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { Upload, AlertTriangle, Pencil } from 'lucide-react';
import dayjs from 'dayjs';
import { DATE_FORMAT, WEEKDAY_NAMES, SHORT_WEEKDAY_NAMES } from '../../constants';
import { uuid, getWeekDays, assertUniqueKeys, generateChecksum, timeToMinutes } from '../../utils/helpers';
import { importSchedule } from '../../services/importSchedule';
import ManualScheduleEditor from './ManualScheduleEditor';
import ResolveAliasModal from './ResolveAliasModal'; 
import { useToast } from '../../components/Toast';

interface ScheduleTabProps {
  members: Member[];
  weeklySchedule: WeeklyScheduleDay[];
  shiftPatterns: ShiftPattern[];
  memberAliases: MemberAlias[];
  onSaveMember: (member: Member) => Promise<void>;
  onSaveWeeklySchedule: (scheduleDay: WeeklyScheduleDay | WeeklyScheduleDay[]) => Promise<void>;
  onDeleteWeeklySchedule: (id: ID) => Promise<void>;
  fetchData: () => Promise<void>;
  onSaveShiftPattern: (pattern: ShiftPattern) => Promise<void>;
  onDeleteShiftPattern: (id: ID) => Promise<void>;
  onSaveAlias: (alias: MemberAlias) => Promise<void>;
  initialShiftsForEditor?: ParsedScheduleShift[] | null;
  onEditorClosed?: () => void;
}

const ScheduleTab: React.FC<ScheduleTabProps> = ({
  members,
  weeklySchedule,
  memberAliases,
  onSaveWeeklySchedule,
  onSaveAlias,
  fetchData,
  initialShiftsForEditor,
  onEditorClosed,
}) => {
  const { addToast } = useToast();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isManualEditorOpen, setIsManualEditorOpen] = useState(!!initialShiftsForEditor);
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
    return [...weeklySchedule].sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
  }, [weeklySchedule]);

  const initialShiftsRef = useRef<ParsedScheduleShift[]>(initialShiftsForEditor || []);
  
  const processAndSaveShifts = useCallback(async (shiftsToProcess: ParsedScheduleShift[]) => {
    const shiftsByDate = new Map<string, ScheduleShift[]>();
    const shiftsWithMemberId = shiftsToProcess.filter(s => s.member_id);

    for (const parsedShift of shiftsWithMemberId) {
        const date = dayjs().startOf('week').day(SHORT_WEEKDAY_NAMES.indexOf(parsedShift.day)).format('YYYY-MM-DD');
        if (!shiftsByDate.has(date)) shiftsByDate.set(date, []);
        
        shiftsByDate.get(date)!.push({
            id: parsedShift.id || uuid(),
            memberId: parsedShift.member_id!,
            start: parsedShift.start,
            end: parsedShift.end,
            source: 'import',
        });
    }

    const daysToSave: WeeklyScheduleDay[] = Array.from(shiftsByDate.entries()).map(([date, shifts]) => {
        const existingDay = weeklySchedule.find(d => d.date === date);
        const existingShiftIds = new Set(existingDay?.shifts.map(s => s.id));
        const newShifts = shifts.filter(s => !existingShiftIds.has(s.id));
        return {
            id: existingDay?.id || uuid(),
            date,
            shifts: [...(existingDay?.shifts || []), ...newShifts],
        };
    });

    if (daysToSave.length > 0) {
        await onSaveWeeklySchedule(daysToSave);
        addToast({ message: `${shiftsWithMemberId.length} shifts imported and saved!`, type: 'success' });
    } else {
        addToast({ message: 'No new shifts to save.', type: 'info' });
    }
  }, [onSaveWeeklySchedule, weeklySchedule, addToast]);

  const processQueue = useCallback((queue: ParsedScheduleShift[]) => {
    const remainingQueue = [...queue];
    while(remainingQueue.length > 0) {
      const nextShift = remainingQueue[0];
      const nameLower = nextShift.memberName.toLowerCase();
      const memberId = nameMap.get(nameLower) || aliasMap.get(nameLower);

      if (memberId) {
          nextShift.member_id = memberId;
          remainingQueue.shift(); // Process next in queue
      } else {
          setCurrentUnresolvedName(nextShift.memberName);
          setUnresolvedQueue(remainingQueue);
          setIsAliasModalOpen(true);
          return; // Pause queue processing
      }
    }

    // If we get here, all shifts were resolved
    setIsAliasModalOpen(false);
    processAndSaveShifts(initialShiftsRef.current);
    initialShiftsRef.current = [];
  }, [nameMap, aliasMap, processAndSaveShifts]);


  const handleImportSchedule = useCallback(async () => {
    if (!selectedFile) {
      setImportError('Please select a file.'); return;
    }
    setImporting(true); setImportError(null);
    try {
      // FIX: The import function returns an array of shifts, not a ParsedScheduleData object.
      const parsedData = await importSchedule(selectedFile);
      const parsedShifts = parsedData.shifts;
      if (parsedShifts.length === 0) {
        addToast({ message: "No shifts were parsed. Opening manual editor.", type: 'info'});
        initialShiftsRef.current = [];
        setIsManualEditorOpen(true);
      } else {
        addToast({ message: `Parsed ${parsedShifts.length} shifts. Resolving members...`, type: 'info'});
        initialShiftsRef.current = parsedShifts;
        processQueue(parsedShifts);
      }
      setIsImportModalOpen(false);
    } catch (err) {
      setImportError((err as Error).message);
    } finally {
      setImporting(false);
    }
  }, [selectedFile, processQueue, addToast]);

  const handleResolve = useCallback(async (name: string, memberId: ID) => {
    await onSaveAlias({ id: uuid(), member_id: memberId, alias: name.toLowerCase() });
    await fetchData(); // Refetch data to update aliasMap
    
    // Continue processing after alias is saved and data is fresh
    setTimeout(() => {
        const updatedQueue = unresolvedQueue.map(s => s.memberName === name ? { ...s, member_id: memberId } : s);
        processQueue(updatedQueue);
    }, 100);

  }, [onSaveAlias, unresolvedQueue, processQueue, fetchData]);
  
  const handleSkip = useCallback((name: string) => {
      const remainingQueue = unresolvedQueue.filter(s => s.memberName !== name);
      initialShiftsRef.current = initialShiftsRef.current.filter(s => s.memberName !== name);
      processQueue(remainingQueue);
  }, [unresolvedQueue, processQueue]);
  
  const handleSaveFromManual = useCallback((shifts: ParsedScheduleShift[]) => {
      initialShiftsRef.current = shifts;
      processQueue(shifts);
      setIsManualEditorOpen(false);
      if (onEditorClosed) onEditorClosed();
  }, [processQueue, onEditorClosed]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-textdark">Weekly Schedule</h2>
        <div className="flex space-x-2">
            <Button onClick={() => { initialShiftsRef.current = []; setIsManualEditorOpen(true); }} variant="secondary">
                <Pencil size={18} className="mr-2" /> Manual Editor
            </Button>
            <Button onClick={() => setIsImportModalOpen(true)} variant="primary">
                <Upload size={18} className="mr-2" /> Import Schedule
            </Button>
        </div>
      </div>
      
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
      
      <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Import Schedule File">
        <div className="p-4 space-y-4">
            <p className="text-sm text-gray-600">Select a PDF, CSV, or XLSX schedule file to import.</p>
            <input type="file" accept=".pdf,.csv,.xlsx" onChange={e => setSelectedFile(e.target.files ? e.target.files[0] : null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"/>
            {importError && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3" role="alert"><p className="font-bold">Import Error</p><p>{importError}</p></div>}
        </div>
        <div className="flex justify-end p-4 border-t bg-gray-50 rounded-b-lg">
            <Button variant="outline" onClick={() => setIsImportModalOpen(false)} className="mr-2">Cancel</Button>
            <Button variant="primary" onClick={handleImportSchedule} disabled={importing || !selectedFile}>
                {importing ? 'Processing...' : 'Import'}
            </Button>
        </div>
      </Modal>

      {isManualEditorOpen && (
        <Modal isOpen={isManualEditorOpen} onClose={() => setIsManualEditorOpen(false)} title="Manual Schedule Editor">
            <ManualScheduleEditor
                initialShifts={initialShiftsRef.current}
                members={members}
                onSave={handleSaveFromManual}
                onCancel={() => { setIsManualEditorOpen(false); if (onEditorClosed) onEditorClosed(); }}
            />
        </Modal>
      )}

      {isAliasModalOpen && (
        <ResolveAliasModal
          isOpen={isAliasModalOpen}
          unresolvedName={currentUnresolvedName}
          members={members}
          onResolve={handleResolve}
          onSkip={handleSkip}
        />
      )}
    </div>
  );
};

export default ScheduleTab;