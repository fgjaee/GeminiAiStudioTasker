// components/ScheduleTab.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Member, WeeklyScheduleDay, ScheduleShift, ParsedScheduleData, ParsedScheduleShift, Blob } from '../types'; // Fix: Import ParsedScheduleShift
import Button from './Button';
import Modal from './Modal';
import Input from './Input';
import Select from './Select';
import { Upload, Plus, Trash2, Pencil } from 'lucide-react';
import dayjs from 'dayjs';
import { DATE_FORMAT, WEEKDAY_NAMES, PDF_MOCK_TIMEOUT } from '../constants'; // Fix: Import PDF_MOCK_TIMEOUT
import { uuid, getWeekDays, assertUniqueKeys, generateChecksum } from '../utils/helpers'; // Fix: Import generateChecksum

interface ScheduleTabProps {
  members: Member[];
  weeklySchedule: WeeklyScheduleDay[];
  onSaveWeeklySchedule: (scheduleDay: WeeklyScheduleDay) => Promise<void>;
  onDeleteWeeklySchedule: (id: string) => Promise<void>;
  supabaseMock: {
    functions: {
      invoke: <T>(functionName: string, payload: any) => Promise<{ data: T | null; error: Error | null }>;
    };
    storage: {
      from: (bucketName: string) => {
        upload: (path: string, file: File | Blob, options?: { contentType?: string }) => Promise<{ data: { path: string } | null; error: Error | null }>;
      };
    };
  };
  fetchData: () => Promise<void>; // Callback to re-fetch all data after PDF upload
}

const ScheduleTab: React.FC<ScheduleTabProps> = ({
  members,
  weeklySchedule,
  onSaveWeeklySchedule,
  onDeleteWeeklySchedule,
  supabaseMock,
  fetchData,
}) => {
  const [isPdfUploadModalOpen, setIsPdfUploadModalOpen] = useState(false);
  const [isEditShiftModalOpen, setIsEditShiftModalOpen] = useState(false);
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [editingScheduleDay, setEditingScheduleDay] = useState<WeeklyScheduleDay | null>(null);
  const [editingShift, setEditingShift] = useState<ScheduleShift | null>(null);
  const [editingShiftDate, setEditingShiftDate] = useState<string | null>(null);

  const memberOptions = useMemo(() => members.map(m => ({ value: m.id, label: m.name })).sort((a,b) => a.label.localeCompare(b.label)), [members]);
  const memberMap = useMemo(() => new Map(members.map(m => [m.id, m])), [members]);

  const sortedSchedule = useMemo(() => {
    // Sort by date, then day of week (Monday first), then member name, then start time
    return [...weeklySchedule].sort((a, b) => {
      const dateComparison = dayjs(a.date).diff(dayjs(b.date));
      if (dateComparison !== 0) return dateComparison;
      // If same date, sort by member name
      const aMemberName = a.shifts[0] ? memberMap.get(a.shifts[0].memberId)?.name || '' : '';
      const bMemberName = b.shifts[0] ? memberMap.get(b.shifts[0].memberId)?.name || '' : '';
      return aMemberName.localeCompare(bMemberName);
    });
  }, [weeklySchedule, memberMap]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedPdfFile(e.target.files[0]);
      setUploadError(null);
    }
  }, []);

  const handleUploadPdf = useCallback(async () => {
    if (!selectedPdfFile) {
      setUploadError('Please select a PDF file to upload.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      // Step 1: Upload file to storage (mock)
      const fileName = `${uuid()}-${selectedPdfFile.name}`;
      const filePath = `schedules/${fileName}`;
      const { data: uploadData, error: uploadErrorRes } = await supabaseMock.storage.from('schedules').upload(filePath, selectedPdfFile, {
        contentType: 'application/pdf',
      });

      if (uploadErrorRes) throw uploadErrorRes;
      if (!uploadData?.path) throw new Error('File upload path missing.');

      // For mock, we'll directly read file content to pass to invoke,
      // in a real scenario, the invoke function would get it from storage.
      const fileContent = await selectedPdfFile.text(); // Assuming simple text content for mock parsing
      // Fix: Generate fileChecksum
      const computedFileChecksum = await generateChecksum(fileContent);

      // Step 2: Invoke parsing function
      const { data: parsedData, error: invokeError } = await supabaseMock.functions.invoke<ParsedScheduleData>('parse-schedule-pdf', {
        fileChecksum: computedFileChecksum, // Fix: Use the computed fileChecksum
        fileContent: fileContent, // Pass content for mock parsing
        filePath: uploadData.path, // Pass path if parser needs to fetch from storage
      });

      if (invokeError) throw invokeError;
      if (!parsedData) throw new Error('PDF parsing returned no data.');

      // Step 3: Save parsed data to weekly_schedule table
      const scheduleDate = parsedData.date; // The start date of the week from the parser

      // Group parsed shifts by day
      const shiftsByDate: Map<string, ParsedScheduleShift[]> = new Map();
      parsedData.shifts.forEach(shift => {
        // Assume parser's 'day' is like 'Mon', 'Tue'
        const shiftDayOfWeek = dayjs().startOf('week').day(WEEKDAY_NAMES.indexOf(shift.day || 'Monday') + 1).format(DATE_FORMAT); // Map day name to date
        if (!shiftsByDate.has(shiftDayOfWeek)) {
          shiftsByDate.set(shiftDayOfWeek, []);
        }
        shiftsByDate.get(shiftDayOfWeek)?.push(shift);
      });

      const updatedScheduleDays: WeeklyScheduleDay[] = [];

      for (const [date, shifts] of shiftsByDate.entries()) {
        const existingScheduleDay = weeklySchedule.find(s => s.date === date);

        const newShifts: ScheduleShift[] = shifts.map(shift => ({
          id: shift.id || uuid(),
          memberId: shift.memberId,
          start: shift.start,
          end: shift.end,
          shift_class: shift.shift_class,
        }));

        const scheduleDayToSave: WeeklyScheduleDay = {
          id: existingScheduleDay?.id || uuid(),
          date: date,
          shifts: existingScheduleDay ? [...existingScheduleDay.shifts, ...newShifts] : newShifts, // Merge with existing shifts
          flags: parsedData.flags || { source: 'pdf_upload', timestamp: new Date().toISOString(), checksum: computedFileChecksum }, // Fix: Use computedFileChecksum
        };
        updatedScheduleDays.push(scheduleDayToSave);
      }

      // Save/update all schedule days
      for (const sd of updatedScheduleDays) {
        await onSaveWeeklySchedule(sd);
      }

      // Re-fetch all data to ensure latest schedules are displayed
      await fetchData();
      alert('Schedule PDF uploaded and parsed successfully!');
      setIsPdfUploadModalOpen(false);
      setSelectedPdfFile(null);
    } catch (err) {
      console.error('Error uploading or parsing PDF:', err);
      setUploadError(`Failed to process PDF: ${(err as Error).message}`);
    } finally {
      setUploading(false);
    }
  }, [selectedPdfFile, weeklySchedule, onSaveWeeklySchedule, supabaseMock, fetchData]);

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

    // Create a new ScheduleShift array with the updated shift
    const updatedShifts = editingScheduleDay.shifts.map(s =>
      s.id === editingShift.id ? editingShift : s
    );

    // If the date changed, we need to handle it carefully:
    // 1. Remove from old date's schedule
    // 2. Add to new date's schedule
    let newScheduleDay = { ...editingScheduleDay, shifts: updatedShifts };

    if (editingShiftDate !== editingScheduleDay.date) {
      // Remove shift from its original day's schedule
      const originalScheduleDay = weeklySchedule.find(s => s.id === editingScheduleDay.id);
      if (originalScheduleDay) {
        const remainingShifts = originalScheduleDay.shifts.filter(s => s.id !== editingShift.id);
        await onSaveWeeklySchedule({ ...originalScheduleDay, shifts: remainingShifts });
      }

      // Add shift to the new target date's schedule
      const targetScheduleDay = weeklySchedule.find(s => s.date === editingShiftDate);
      if (targetScheduleDay) {
        const newTargetShifts = [...targetScheduleDay.shifts, editingShift];
        await onSaveWeeklySchedule({ ...targetScheduleDay, shifts: newTargetShifts });
      } else {
        // Create a new schedule day if it doesn't exist
        const newDay: WeeklyScheduleDay = {
          id: uuid(),
          date: editingShiftDate,
          shifts: [editingShift],
          flags: { createdManually: true },
        };
        await onSaveWeeklySchedule(newDay);
      }
    } else {
      // Same date, just update the existing schedule day
      await onSaveWeeklySchedule(newScheduleDay);
    }

    handleCloseEditShiftModal();
    await fetchData(); // Re-fetch to update all schedules
  }, [editingScheduleDay, editingShift, editingShiftDate, weeklySchedule, onSaveWeeklySchedule, fetchData, handleCloseEditShiftModal]);


  const handleRemoveShift = useCallback(async (scheduleDayId: string, shiftId: string) => {
    if (!window.confirm('Are you sure you want to remove this shift?')) return;
    const scheduleDay = weeklySchedule.find(s => s.id === scheduleDayId);
    if (scheduleDay) {
      const updatedShifts = scheduleDay.shifts.filter(s => s.id !== shiftId);
      await onSaveWeeklySchedule({ ...scheduleDay, shifts: updatedShifts });
      await fetchData(); // Re-fetch to update all schedules
    }
  }, [weeklySchedule, onSaveWeeklySchedule, fetchData]);

  // Assert unique keys for sortedSchedule (dev mode only)
  if (process.env.NODE_ENV !== "production") {
    assertUniqueKeys(sortedSchedule.map(sd => sd.id), "ScheduleTab.sortedSchedule");
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-textdark">Weekly Schedules</h2>
        <Button onClick={() => setIsPdfUploadModalOpen(true)} variant="primary">
          <Upload size={18} className="mr-2" /> Upload Schedule PDF
        </Button>
      </div>

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
                  No schedules uploaded yet.
                </td>
              </tr>
            ) : (
              sortedSchedule.flatMap(scheduleDay => (
                scheduleDay.shifts.length === 0 ? (
                  <tr key={scheduleDay.id} className="bg-gray-50">
                    <td colSpan={6} className="px-6 py-2 text-sm font-semibold text-gray-700">
                      {dayjs(scheduleDay.date).format('dddd, MMMM D, YYYY')} (No shifts)
                      <Button variant="danger" size="sm" onClick={() => onDeleteWeeklySchedule(scheduleDay.id)} className="ml-4">
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                ) : (
                  scheduleDay.shifts.map((shift, idx) => (
                    <tr key={`${scheduleDay.id}-${shift.id}`} className="hover:bg-gray-50">
                      {idx === 0 && (
                        <td rowSpan={scheduleDay.shifts.length} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-textdark border-r">
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
                )
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isPdfUploadModalOpen}
        onClose={() => setIsPdfUploadModalOpen(false)}
        title="Upload Schedule PDF"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsPdfUploadModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleUploadPdf} disabled={!selectedPdfFile || uploading}>
              {uploading ? 'Uploading...' : 'Upload & Parse'}
            </Button>
          </>
        }
      >
        <div className="p-4">
          <Input
            id="pdfFile"
            label="Select PDF File"
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            required
            className="mb-4"
          />
          {selectedPdfFile && (
            <p className="text-sm text-gray-600 mb-2">Selected: {selectedPdfFile.name}</p>
          )}
          {uploadError && (
            <p className="text-red-500 text-sm mt-2">{uploadError}</p>
          )}
          <p className="text-sm text-gray-500 mt-4">
            Upload a PDF containing your weekly staff schedule. The system will attempt to extract
            member shifts and add them to the schedule. This is a mock functionality for now.
          </p>
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
            onChange={(e) => setEditingShift(prev => prev ? { ...prev, shift_class: e.target.value } : null)}
          />
        </Modal>
      )}
    </div>
  );
};

export default ScheduleTab;