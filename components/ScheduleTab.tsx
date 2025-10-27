// components/ScheduleTab.tsx
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Member, WeeklyScheduleDay, ScheduleShift, ParsedScheduleData, ParsedScheduleShift, ID, ShiftClass, ShiftPattern } from '../types';
import Button from './Button';
import Modal from './Modal';
import Input from './Input';
import Select from './Select';
import { Upload, Plus, Trash2, Pencil, AlertTriangle } from 'lucide-react';
import dayjs from 'dayjs';
import { DATE_FORMAT, WEEKDAY_NAMES, SHORT_WEEKDAY_NAMES, PDF_MOCK_TIMEOUT } from '../constants';
import { uuid, getWeekDays, assertUniqueKeys, generateChecksum, timeToMinutes } from '../services/utils';
import { importSchedule } from '../services/importSchedule';
import ManualScheduleEditor from './ManualScheduleEditor';

interface ScheduleTabProps {
  members: Member[];
  weeklySchedule: WeeklyScheduleDay[];
  shiftPatterns: ShiftPattern[];
  onSaveMember: (member: Member) => Promise<void>;
  onSaveWeeklySchedule: (scheduleDay: WeeklyScheduleDay | WeeklyScheduleDay[]) => Promise<void>;
  onDeleteWeeklySchedule: (id: ID) => Promise<void>;
  fetchData: () => Promise<void>;
  onSaveShiftPattern: (pattern: ShiftPattern) => Promise<void>;
  onDeleteShiftPattern: (id: ID) => Promise<void>;
  initialShiftsForEditor?: ParsedScheduleShift[] | null;
  onEditorClosed?: () => void;
}

const ScheduleTab: React.FC<ScheduleTabProps> = ({
  members,
  weeklySchedule,
  shiftPatterns,
  onSaveMember,
  onSaveWeeklySchedule,
  onDeleteWeeklySchedule,
  fetchData,
  onSaveShiftPattern,
  onDeleteShiftPattern,
  initialShiftsForEditor,
  onEditorClosed,
}) => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEditShiftModalOpen, setIsEditShiftModalOpen] = useState(false);
  const [isManualEditorOpen, setIsManualEditorOpen] = useState(false);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importDiagnostics, setImportDiagnostics] = useState<ParsedScheduleData['diagnostics'] | null>(null);
  
  const [editingScheduleDay, setEditingScheduleDay] = useState<WeeklyScheduleDay | null>(null);
  const [editingShift, setEditingShift] = useState<ScheduleShift | null>(null);
  const [editingShiftDate, setEditingShiftDate] = useState<string | null>(null);

  const [parsedShiftsForManualEdit, setParsedShiftsForManualEdit] = useState<ParsedScheduleShift[]>([]);

  const memberOptions = useMemo(() => members.map(m => ({ value: m.id, label: m.name })).sort((a,b) => a.label.localeCompare(b.label)), [members]);
  const memberMap = useMemo(() => new Map(members.map(m => [m.id, m])), [members]);
  
  useEffect(() => {
    if (initialShiftsForEditor && initialShiftsForEditor.length > 0) {
      setParsedShiftsForManualEdit(initialShiftsForEditor);
      setIsManualEditorOpen(true);
    }
  }, [initialShiftsForEditor]);

  const handleCloseManualEditor = useCallback(() => {
      setIsManualEditorOpen(false);
      if (onEditorClosed) {
          onEditorClosed();
      }
  }, [onEditorClosed]);


  const sortedSchedule = useMemo(() => {
    const groupedByDate = weeklySchedule.reduce((acc, day) => {
        if (!acc.has(day.date)) {
            acc.set(day.date, JSON.parse(JSON.stringify(day)));
        } else {
            const existingDay = acc.get(day.date)!;
            const existingShiftIds = new Set(existingDay.shifts.map(s => s.id));
            const newShifts = day.shifts.filter(s => !existingShiftIds.has(s.id));
            existingDay.shifts.push(...newShifts);
        }
        return acc;
    // FIX: Explicitly type the Map to ensure correct type inference for `WeeklyScheduleDay` objects.
    }, new Map<string, WeeklyScheduleDay>());

    const finalSchedule = Array.from(groupedByDate.values());
    
    if (process.env.NODE_ENV !== "production") {
      assertUniqueKeys(finalSchedule.map(sd => sd.id), "ScheduleTab.sortedSchedule");
    }
    
    return finalSchedule.sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
  }, [weeklySchedule]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setImportError(null);
      setImportDiagnostics(null);
    }
  }, []);

  const ensureMemberExists = async (name: string): Promise<ID> => {
    const existingMember = members.find(m => m.name.toLowerCase() === name.toLowerCase());
    if (existingMember) {
      return existingMember.id;
    }
    const newMember: Member = {
      id: uuid(),
      name: name,
      title: 'Placeholder',
      role_tags: [],
      // FIX: Use 'skill_ids' instead of deprecated 'strengths' property.
      skill_ids: [],
      fixed_commitments_minutes: 0,
      default_tasks: [],
    };
    await onSaveMember(newMember);
    return newMember.id;
  };

  const processAndSaveParsedShifts = useCallback(async (parsedShifts: ParsedScheduleShift[], weekStartDate: string) => {
    const weekDates = getWeekDays(weekStartDate);

    const shiftsByFullDate = new Map<string, ParsedScheduleShift[]>();
    for (const shift of parsedShifts) {
      const dayIndex = SHORT_WEEKDAY_NAMES.indexOf(shift.day);
      if (dayIndex === -1) continue;
      
      const memberId = await ensureMemberExists(shift.memberName);
      // FIX: Assign to 'member_id' which is the correct property on ParsedScheduleShift.
      shift.member_id = memberId;

      const shiftFullDate = dayjs(weekStartDate).startOf('week').day(dayIndex).format(DATE_FORMAT);
      if (!shiftsByFullDate.has(shiftFullDate)) {
        shiftsByFullDate.set(shiftFullDate, []);
      }
      shiftsByFullDate.get(shiftFullDate)!.push(shift);
    }

    const scheduleDaysToSave: WeeklyScheduleDay[] = [];
    for (const [date, shifts] of shiftsByFullDate.entries()) {
      const newScheduleShifts: ScheduleShift[] = shifts.map(s => ({
        id: s.id || uuid(),
        // FIX: Read from 'member_id' on ParsedScheduleShift to map to 'memberId' on ScheduleShift.
        memberId: s.member_id!,
        start: s.start,
        end: s.end,
        shift_class: s.shift_class,
      }));
      scheduleDaysToSave.push({
        id: uuid(), date: date, shifts: newScheduleShifts,
        flags: { source: 'file_import', timestamp: new Date().toISOString() },
      });
    }

    if (scheduleDaysToSave.length > 0) {
      // First, delete all existing schedule days for the affected week to prevent duplicates
      for (const date of weekDates) {
        const existingDay = weeklySchedule.find(d => d.date === date);
        if (existingDay) await onDeleteWeeklySchedule(existingDay.id);
      }
      await onSaveWeeklySchedule(scheduleDaysToSave);
    }
    
    await fetchData();
    alert('Schedule imported successfully!');
  }, [members, onSaveMember, weeklySchedule, onSaveWeeklySchedule, onDeleteWeeklySchedule, fetchData]);

  const handleImportSchedule = useCallback(async () => {
    if (!selectedFile) {
      setImportError('Please select a file to upload.'); return;
    }
    setImporting(true); setImportError(null); setImportDiagnostics(null);
    try {
      const { date: weekStartDate, shifts: parsedShifts, diagnostics } = await importSchedule(selectedFile);
      setImportDiagnostics(diagnostics || null);
      if (parsedShifts.length === 0) {
          setImportError("No shifts were parsed from the file. You can add them manually.");
          setParsedShiftsForManualEdit([]); // Start with a clean slate
          setIsManualEditorOpen(true);
          setIsImportModalOpen(false);
          return;
      }
      await processAndSaveParsedShifts(parsedShifts, weekStartDate);
      setIsImportModalOpen(false);
      setSelectedFile(null);
    } catch (err) {
      console.error('Error importing schedule:', err);
      setImportError(`Failed to process file: ${(err as Error).message}`);
    } finally {
      setImporting(false);
    }
  }, [selectedFile, processAndSaveParsedShifts]);
  
  const handleSaveManualShifts = useCallback(async (shifts: ParsedScheduleShift[]) => {
      await processAndSaveParsedShifts(shifts, dayjs().format(DATE_FORMAT));
      handleCloseManualEditor();
  }, [processAndSaveParsedShifts, handleCloseManualEditor]);


  const handleOpenEditShiftModal = useCallback((scheduleDay: WeeklyScheduleDay, shift: ScheduleShift) => {
    setEditingScheduleDay(scheduleDay);
    setEditingShift(shift);
    setEditingShiftDate(scheduleDay.date);
    setIsEditShiftModalOpen(true);
  }, []);

  const handleCloseEditShiftModal = useCallback(() => {
    setIsEditShiftModalOpen(false);
    setEditingScheduleDay(null);
    setEditingShift(null);
    setEditingShiftDate(null);
  }, []);

  const handleSaveEditedShift = useCallback(async () => {
    if (!editingScheduleDay || !editingShift || !editingShiftDate) return;

    if (!editingShift.memberId || !editingShift.start || !editingShift.end) {
      alert('Please fill in all required shift fields.');
      return;
    }
    if (timeToMinutes(editingShift.start) >= timeToMinutes(editingShift.end)) {
        alert('Shift end time must be after start time.');
        return;
    }

    const dateChanged = editingShiftDate !== editingScheduleDay.date;
    const allDaysToUpdate : WeeklyScheduleDay[] = [];

    if (dateChanged) {
      const originalDay = weeklySchedule.find(s => s.id === editingScheduleDay.id);
      if (originalDay) {
        const remainingShifts = originalDay.shifts.filter(s => s.id !== editingShift.id);
        allDaysToUpdate.push({ ...originalDay, shifts: remainingShifts });
      }

      const targetDay = weeklySchedule.find(s => s.date === editingShiftDate);
      if (targetDay) {
        allDaysToUpdate.push({ ...targetDay, shifts: [...targetDay.shifts, editingShift] });
      } else {
        allDaysToUpdate.push({ id: uuid(), date: editingShiftDate, shifts: [editingShift], flags: { source: 'manual_entry' } });
      }
    } else {
      const updatedShifts = editingScheduleDay.shifts.map(s => s.id === editingShift.id ? editingShift : s);
      allDaysToUpdate.push({ ...editingScheduleDay, shifts: updatedShifts });
    }
    
    await onSaveWeeklySchedule(allDaysToUpdate);
    handleCloseEditShiftModal();
  }, [editingScheduleDay, editingShift, editingShiftDate, weeklySchedule, onSaveWeeklySchedule, handleCloseEditShiftModal]);


  const handleRemoveShift = useCallback(async (scheduleDayId: ID, shiftId: ID) => {
    if (!window.confirm('Are you sure you want to remove this shift?')) return;
    const scheduleDay = weeklySchedule.find(s => s.id === scheduleDayId);
    if (scheduleDay) {
      const updatedShifts = scheduleDay.shifts.filter(s => s.id !== shiftId);
      if (updatedShifts.length === 0) {
        await onDeleteWeeklySchedule(scheduleDay.id);
      } else {
        await onSaveWeeklySchedule({ ...scheduleDay, shifts: updatedShifts });
      }
    }
  }, [weeklySchedule, onSaveWeeklySchedule, onDeleteWeeklySchedule]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-textdark">Weekly Schedules</h2>
        <div className="flex space-x-2">
            <Button onClick={() => { setIsManualEditorOpen(true); setParsedShiftsForManualEdit([]); }} variant="secondary">
              <Pencil size={18} className="mr-2" /> Add Manually
            </Button>
            <Button onClick={() => { setIsImportModalOpen(true); setImportDiagnostics(null); setImportError(null); setSelectedFile(null); }} variant="primary">
              <Upload size={18} className="mr-2" /> Import Schedule
            </Button>
        </div>
      </div>
      
      {isManualEditorOpen && (
          <Modal isOpen={isManualEditorOpen} onClose={handleCloseManualEditor} title="Manual Schedule Editor">
              <ManualScheduleEditor
                  initialShifts={parsedShiftsForManualEdit}
                  members={members}
                  shiftPatterns={shiftPatterns}
                  onSave={handleSaveManualShifts}
                  onCancel={handleCloseManualEditor}
                  onSavePattern={onSaveShiftPattern}
                  onDeletePattern={onDeleteShiftPattern}
              />
          </Modal>
      )}

      <div className="bg-card shadow-lg rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift Start</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift End</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedSchedule.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                  No schedules imported yet.
                </td>
              </tr>
            ) : (
              sortedSchedule.flatMap(scheduleDay => {
                if (process.env.NODE_ENV !== "production") {
                    assertUniqueKeys(scheduleDay.shifts.map(s => s.id), `ScheduleTab.scheduleDay.shifts for ${scheduleDay.date}`);
                }
                const sortedShiftsForDay = [...scheduleDay.shifts].sort((a, b) => {
                    const memberCmp = memberMap.get(a.memberId)?.name?.localeCompare(memberMap.get(b.memberId)?.name || '') || 0;
                    if (memberCmp !== 0) return memberCmp;
                    return timeToMinutes(a.start) - timeToMinutes(b.start);
                });

                return sortedShiftsForDay.length === 0 ? (
                  <tr key={scheduleDay.id} className="bg-gray-50">
                    <td colSpan={6} className="px-6 py-2 text-sm font-semibold text-gray-700">
                      {dayjs(scheduleDay.date).format('dddd, MMMM D, YYYY')} (No shifts)
                      <Button variant="danger" size="sm" onClick={() => onDeleteWeeklySchedule(scheduleDay.id)} className="ml-4">
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                ) : (
                  sortedShiftsForDay.map((shift, idx, arr) => (
                    <tr key={`${scheduleDay.id}-${shift.id}`} className="hover:bg-gray-50">
                      {idx === 0 && (
                        <td rowSpan={arr.length} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-textdark border-r">
                          {dayjs(scheduleDay.date).format('dddd, MMMM D, YYYY')}
                          <Button variant="danger" size="sm" onClick={() => onDeleteWeeklySchedule(scheduleDay.id)} className="ml-2">
                            <Trash2 size={16} />
                          </Button>
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{memberMap.get(shift.memberId)?.name || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{shift.start}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{shift.end}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{shift.shift_class || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleOpenEditShiftModal(scheduleDay, shift)} title="Edit Shift">
                            <Pencil size={16} />
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => handleRemoveShift(scheduleDay.id, shift.id)} title="Remove Shift">
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Schedule from File"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>Close</Button>
            <Button variant="primary" onClick={handleImportSchedule} disabled={!selectedFile || importing}>
              {importing ? 'Importing...' : 'Import & Parse'}
            </Button>
          </>
        }
      >
        <div className="p-4">
          <Input
            id="scheduleFile"
            label="Select Schedule File (PDF, CSV, XLSX)"
            type="file"
            accept=".pdf,.csv,.xlsx"
            onChange={handleFileChange}
            required
            className="mb-4"
          />
          {selectedFile && (
            <p className="text-sm text-gray-600 mb-2">Selected: {selectedFile.name}</p>
          )}
          {importError && (
            <p className="text-red-500 text-sm mt-2">{importError}</p>
          )}
          {importDiagnostics && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800">
              <h4 className="font-semibold mb-2">Import Diagnostics</h4>
              <p>Rows Parsed: {importDiagnostics.rowsParsed}</p>
              <p>Shifts Created: {importDiagnostics.shiftsCreated}</p>
              {importDiagnostics.reason && <p>Details: {importDiagnostics.reason}</p>}
            </div>
          )}
        </div>
      </Modal>

      {editingShift && editingScheduleDay && (
        <Modal
          isOpen={isEditShiftModalOpen}
          onClose={handleCloseEditShiftModal}
          title={`Edit Shift for ${memberMap.get(editingShift.memberId)?.name || 'N/A'}`}
          footer={
            <>
              <Button variant="outline" onClick={handleCloseEditShiftModal}>Cancel</Button>
              <Button variant="primary" onClick={handleSaveEditedShift}>Save Changes</Button>
            </>
          }
        >
          <Input
            id="shiftDate"
            label="Date"
            type="date"
            value={editingShiftDate || ''}
            onChange={(e) => setEditingShiftDate(e.target.value)}
            required
          />
          <Select
            id="memberId"
            label="Member"
            options={memberOptions}
            value={editingShift.memberId}
            onChange={(e) => setEditingShift(prev => prev ? { ...prev, memberId: e.target.value } : null)}
            required
          />
          <Input
            id="shiftStart"
            label="Start Time"
            type="time"
            value={editingShift.start}
            onChange={(e) => setEditingShift(prev => prev ? { ...prev, start: e.target.value } : null)}
            required
          />
          <Input
            id="shiftEnd"
            label="End Time"
            type="time"
            value={editingShift.end}
            onChange={(e) => setEditingShift(prev => prev ? { ...prev, end: e.target.value } : null)}
            required
          />
          <Input
            id="shiftClass"
            label="Shift Class (e.g., Opening, Mid-Shift, Closing)"
            type="text"
            value={editingShift.shift_class || ''}
            onChange={(e) => setEditingShift(prev => prev ? { ...prev, shift_class: e.target.value as ShiftClass } : null)}
          />
        </Modal>
      )}
    </div>
  );
};

export default ScheduleTab;