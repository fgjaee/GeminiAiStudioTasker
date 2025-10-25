// services/pdfParserMock_legacy.ts
// This file preserves the old mock logic for compatibility or testing purposes.
import { ParsedScheduleData, ParsedScheduleShift, ShiftClass } from '../types';
import { DATE_FORMAT, PDF_MOCK_TIMEOUT, SHORT_WEEKDAY_NAMES } from '../constants';
import { uuid } from '../utils/helpers';
import dayjs from 'dayjs';

export const parseSchedulePdfMock = async (fileChecksum: string, fileContent: string): Promise<ParsedScheduleData> => {
  console.log(`PDF Parser Mock (Legacy): Simulating parsing for checksum: ${fileChecksum}`);
  await new Promise(resolve => setTimeout(resolve, PDF_MOCK_TIMEOUT));

  const mockWeekStart = dayjs().startOf('week').day(1);

  const createMockShift = (memberId: string, memberName: string, role: string, dayOffset: number, start: string, end: string, shift_class?: ShiftClass): ParsedScheduleShift => ({
    id: uuid(),
    memberId,
    memberName,
    role,
    day: SHORT_WEEKDAY_NAMES[mockWeekStart.add(dayOffset, 'day').day()] as ParsedScheduleShift['day'],
    start,
    end,
    shift_class,
    rawText: `${memberName} ${start}-${end}`,
    confidence: 0.95,
  });

  const parsedShifts: ParsedScheduleShift[] = [
    createMockShift('m_alice', 'Alice Johnson', 'Produce Lead', 0, '08:00', '16:00', 'Weekend'),
    createMockShift('m_charlie', 'Charlie Brown', 'Produce Clerk', 0, '10:00', '18:00', 'Weekend'),
    createMockShift('m_alice', 'Alice Johnson', 'Produce Lead', 1, '07:00', '15:00', 'Opening'),
    createMockShift('m_bob', 'Bob Smith', 'Produce Clerk', 1, '14:00', '22:00', 'Closing'),
    createMockShift('m_charlie', 'Charlie Brown', 'Produce Clerk', 1, '10:00', '18:00', 'Mid-Shift'),
  ];

  const parsedData: ParsedScheduleData = {
    date: mockWeekStart.format(DATE_FORMAT),
    shifts: parsedShifts,
    flags: {
      source: 'mock_pdf_parser_legacy',
      timestamp: new Date().toISOString(),
      checksum: fileChecksum,
    },
  };

  return parsedData;
};