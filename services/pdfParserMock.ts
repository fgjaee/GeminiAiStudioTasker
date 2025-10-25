// services/pdfParserService.ts
import { ParsedScheduleData, ParsedScheduleShift, ShiftClass } from '../types';
import { DATE_FORMAT, PDF_MOCK_TIMEOUT, SHORT_WEEKDAY_NAMES } from '../constants';
// FIX: Import 'generateChecksum' to resolve the error.
import { uuid, normName, to24h, generateChecksum } from '../utils/helpers';
import dayjs from 'dayjs';

/**
 * A more sophisticated mock function to simulate parsing a PDF schedule
 * using geometry-based text extraction, similar to what a Supabase Edge Function
 * with pdf.js would do.
 *
 * @param fileContent - The content of the PDF file (e.g., base64 string).
 * @returns A promise that resolves with the parsed schedule data.
 */
export const parsePdfGeometry = async (fileContent: string): Promise<ParsedScheduleData> => {
  console.log(`PDF Parser Service: Simulating geometry-based parsing.`);
  await new Promise(resolve => setTimeout(resolve, PDF_MOCK_TIMEOUT)); // Simulate network/processing delay

  // In a real function, we'd use pdf.js to get text items with x/y coordinates.
  // Here, we'll mock that structure.
  // Let's assume day headers are at specific x-coordinates.
  const DAY_X_COORDS = { Sun: 50, Mon: 150, Tue: 250, Wed: 350, Thu: 450, Fri: 550, Sat: 650 };
  
  // Mock text items extracted from a PDF.
  const mockTextItems = [
    // Headers
    { str: 'Sun', x: 50, y: 50 }, { str: 'Mon', x: 150, y: 50 }, { str: 'Tue', x: 250, y: 50 },
    { str: 'Wed', x: 350, y: 50 }, { str: 'Thu', x: 450, y: 50 }, { str: 'Fri', x: 550, y: 50 }, { str: 'Sat', x: 650, y: 50 },
    // Shifts (y-coordinate groups people together)
    { str: 'Johnson, Alice', x: 10, y: 80 }, { str: '8:00 AM-4:00 PM', x: 150, y: 80 }, { str: '7:00 AM-3:00 PM', x: 250, y: 80 },
    { str: 'Smith, Bob', x: 10, y: 100 }, { str: '2:00 PM-10:00 PM', x: 250, y: 100 }, { str: '2:00 PM-10:00 PM', x: 350, y: 100 },
    { str: 'Brown, Charlie', x: 10, y: 120 }, { str: '10:00 AM-6:00 PM', x: 150, y: 120 }, { str: '10:00 AM-6:00 PM', x: 350, y: 120 },
    { str: 'Deb', x: 10, y: 140 }, { str: '1:00 PM-9:00 PM', x: 550, y: 140 },
  ];

  const parsedShifts: ParsedScheduleShift[] = [];
  const rows = new Map<number, { name: string, shifts: { text: string, x: number }[] }>();

  // 1. Group text items by row (y-coordinate)
  for (const item of mockTextItems) {
    if (item.y > 60) { // Skip headers
      if (!rows.has(item.y)) {
        rows.set(item.y, { name: '', shifts: [] });
      }
      if (item.x < 100) { // Assume name is in the first column
        rows.get(item.y)!.name = normName(item.str);
      } else {
        rows.get(item.y)!.shifts.push({ text: item.str, x: item.x });
      }
    }
  }

  // 2. Process each row to create shifts
  for (const [y, rowData] of rows.entries()) {
    if (!rowData.name) continue;

    for (const shiftText of rowData.shifts) {
      // Find which day this shift belongs to based on x-coordinate
      let closestDay: ParsedScheduleShift['day'] = 'Sun';
      let minDistance = Infinity;
      for (const [day, x] of Object.entries(DAY_X_COORDS)) {
        const distance = Math.abs(shiftText.x - x);
        if (distance < minDistance) {
          minDistance = distance;
          closestDay = day as ParsedScheduleShift['day'];
        }
      }

      // Parse start/end times
      const [startStr, endStr] = shiftText.text.split('-');
      const start = to24h(startStr);
      const end = to24h(endStr);
      
      parsedShifts.push({
        id: uuid(),
        memberName: rowData.name,
        day: closestDay,
        start,
        end,
        confidence: 0.98,
        rawText: `${rowData.name} ${shiftText.text}`
      });
    }
  }

  if (parsedShifts.length === 0 && fileContent !== 'empty_mock') {
    throw new Error('No schedule columns detected (Sun..Sat). Try CSV/XLSX from UKG or enable OCR.');
  }
  
  const mockWeekStart = dayjs().startOf('week').day(1); // Monday
  const parsedData: ParsedScheduleData = {
    date: mockWeekStart.format(DATE_FORMAT),
    shifts: parsedShifts,
    flags: {
      source: 'mock_pdf_geometry_parser',
      timestamp: new Date().toISOString(),
      checksum: await generateChecksum(fileContent),
    },
    diagnostics: {
      rowsParsed: rows.size,
      shiftsCreated: parsedShifts.length,
      membersResolved: parsedShifts.length, // Mock value
      membersCreated: 0, // Mock value
      rowsDiscarded: 0, // Mock value
    },
  };

  console.log('PDF Parser Service: Successfully parsed mock schedule.', parsedData);
  return parsedData;
};

// Keep old mock for compatibility if needed, but new one is preferred
export { parseSchedulePdfMock } from './pdfParserMock_legacy';