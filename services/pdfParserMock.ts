// services/pdfParserMock.ts
import { ParsedScheduleData, ParsedScheduleShift } from '../types';
import { DATE_FORMAT } from '../constants'; // Removed PDF_MOCK_TIMEOUT from import
import { uuid } from '../utils/helpers';
import dayjs from 'dayjs';

/**
 * A mock function to simulate parsing a PDF schedule.
 * In a real application, this would involve a backend service that
 * uses a PDF parsing library and potentially an AI model to extract
 * structured data from an uploaded PDF file.
 *
 * @param fileChecksum - A checksum of the PDF file, used for caching or uniqueness.
 * @param fileContent - The content of the PDF file (e.g., base64 string).
 * @returns A promise that resolves with the parsed schedule data.
 */
export const parseSchedulePdfMock = async (fileChecksum: string, fileContent: string): Promise<ParsedScheduleData> => {
  console.log(`PDF Parser Mock: Simulating parsing for checksum: ${fileChecksum}`);
  // Fix: Use the constant for delay.
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network/processing delay, using hardcoded 1000ms for now

  // Basic mock parsing logic:
  // We'll simulate a schedule for the current week starting from a specific date
  const today = dayjs().format(DATE_FORMAT);
  // Ensure the mock date is consistent, let's say the closest Monday
  const mockWeekStart = dayjs(today).startOf('week').add(1, 'day'); // Monday

  const createMockShift = (memberId: string, memberName: string, role: string, dayOffset: number, start: string, end: string, shift_class?: string): ParsedScheduleShift => ({
    id: uuid(),
    memberId,
    memberName,
    role,
    day: mockWeekStart.add(dayOffset, 'day').format('ddd'), // 'Mon', 'Tue' etc.
    start,
    end,
    shift_class,
    rawText: `${memberName} ${start}-${end}`,
    confidence: 0.95,
  });


  const parsedShifts: ParsedScheduleShift[] = [
    createMockShift('mem-prod-001', 'Alice Johnson', 'Produce Lead', 0, '07:00', '15:00', 'Opening'), // Monday
    createMockShift('mem-prod-002', 'Bob Smith', 'Produce Clerk', 0, '14:00', '22:00', 'Closing'),   // Monday
    createMockShift('mem-prod-003', 'Charlie Brown', 'Produce Clerk', 0, '10:00', '18:00', 'Mid-Shift'), // Monday

    createMockShift('mem-prod-001', 'Alice Johnson', 'Produce Lead', 1, '07:00', '15:00', 'Opening'), // Tuesday
    createMockShift('mem-prod-002', 'Bob Smith', 'Produce Clerk', 1, '14:00', '22:00', 'Closing'),   // Tuesday
    createMockShift('mem-prod-003', 'Charlie Brown', 'Produce Clerk', 1, '10:00', '18:00', 'Mid-Shift'), // Tuesday

    createMockShift('mem-prod-001', 'Alice Johnson', 'Produce Lead', 2, '07:00', '15:00', 'Opening'), // Wednesday
    createMockShift('mem-prod-002', 'Bob Smith', 'Produce Clerk', 2, '14:00', '22:00', 'Closing'),   // Wednesday
    createMockShift('mem-prod-003', 'Charlie Brown', 'Produce Clerk', 2, '10:00', '18:00', 'Mid-Shift'), // Wednesday

    createMockShift('mem-prod-001', 'Alice Johnson', 'Produce Lead', 3, '07:00', '15:00', 'Opening'), // Thursday
    createMockShift('mem-prod-002', 'Bob Smith', 'Produce Clerk', 3, '14:00', '22:00', 'Closing'),   // Thursday
    createMockShift('mem-prod-003', 'Charlie Brown', 'Produce Clerk', 3, '10:00', '18:00', 'Mid-Shift'), // Thursday

    createMockShift('mem-prod-001', 'Alice Johnson', 'Produce Lead', 4, '07:00', '15:00', 'Opening'), // Friday
    createMockShift('mem-prod-002', 'Bob Smith', 'Produce Clerk', 4, '14:00', '22:00', 'Closing'),   // Friday
    createMockShift('mem-prod-003', 'Charlie Brown', 'Produce Clerk', 4, '10:00', '18:00', 'Mid-Shift'), // Friday

    createMockShift('mem-prod-001', 'Alice Johnson', 'Produce Lead', 5, '08:00', '16:00', 'Weekend'), // Saturday
    createMockShift('mem-prod-002', 'Bob Smith', 'Produce Clerk', 5, '10:00', '18:00', 'Weekend'),   // Saturday

    createMockShift('mem-prod-001', 'Alice Johnson', 'Produce Lead', 6, '08:00', '16:00', 'Weekend'), // Sunday
    createMockShift('mem-prod-003', 'Charlie Brown', 'Produce Clerk', 6, '10:00', '18:00', 'Weekend'), // Sunday
  ];

  const parsedData: ParsedScheduleData = {
    date: mockWeekStart.format(DATE_FORMAT), // Week starts on Monday
    shifts: parsedShifts,
    flags: {
      source: 'mock_pdf_parser',
      timestamp: new Date().toISOString(),
      checksum: fileChecksum,
    },
  };

  console.log('PDF Parser Mock: Successfully parsed mock schedule.', parsedData);
  return parsedData;
};