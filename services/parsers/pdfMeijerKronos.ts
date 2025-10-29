// services/parsers/pdfMeijerKronos.ts
import { ParsedScheduleData, ParsedScheduleShift } from '../../types';
import { DATE_FORMAT, PDF_MOCK_TIMEOUT } from '../../constants';
import { uuid, normName, to24h, generateChecksum } from '../../utils/helpers';
import dayjs from 'dayjs';

/**
 * A more sophisticated mock function to simulate parsing a PDF schedule
 * using geometry-based text extraction, similar to what a Supabase Edge Function
 * with pdf.js would do.
 *
 * @param fileBuffer - The ArrayBuffer content of the PDF file.
 * @returns A promise that resolves with the parsed schedule data.
 */
export const parsePdfMeijerKronos = async (fileBuffer: ArrayBuffer): Promise<ParsedScheduleData> => {
  console.log(`PDF Parser Service: Simulating geometry-based parsing for Kronos/UKG.`);
  await new Promise(resolve => setTimeout(resolve, PDF_MOCK_TIMEOUT));

  // In a real function, we'd use pdf.js to get text items with x/y coordinates.
  // Here, we'll mock that structure to simulate a "Wall Schedule".
  const mockTextItems = [
    // Header Row with Day + Date
    { str: 'Sun 10/19', x: 150, y: 50 }, { str: 'Mon 10/20', x: 250, y: 50 },
    { str: 'Tue 10/21', x: 350, y: 50 }, { str: 'Wed 10/22', x: 450, y: 50 },
    
    // Employee Rows
    // Alice
    { str: 'Johnson, Alice', x: 20, y: 80 }, 
    { str: '8:00AM - 4:00PM', x: 245, y: 80 }, { str: '7:00AM - 3:00PM', x: 345, y: 80 },
    // Bob
    { str: 'Smith, Bob', x: 20, y: 100 }, 
    { str: '2:00PM - 10:00PM', x: 348, y: 100 }, { str: '2:00PM - 10:00PM', x: 452, y: 100 },
    // Charlie
    { str: 'Brown, Charlie', x: 20, y: 120 }, 
    { str: '10:00AM - 6:00PM', x: 251, y: 120 }, { str: '10:00AM - 6:00PM', x: 449, y: 120 },
  ];
  
  // 1. Detect Day Columns from Headers
  const dayHeaders = mockTextItems.filter(item => item.y < 60 && item.str.match(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)/));
  if (dayHeaders.length === 0) {
    return { date: dayjs().format(DATE_FORMAT), shifts: [], diagnostics: { reason: "No schedule day headers found (e.g., 'Sun 10/19').", rowsParsed: 0, shiftsCreated: 0, membersResolved:0, membersCreated:0, rowsDiscarded: mockTextItems.length }};
  }
  
  const columnBoundaries = dayHeaders.map((header, i) => {
      const nextHeader = dayHeaders[i+1];
      const midpoint = nextHeader ? (header.x + nextHeader.x) / 2 : header.x + 100;
      return { day: header.str.substring(0, 3) as ParsedScheduleShift['day'], startX: i === 0 ? 100 : (dayHeaders[i-1].x + header.x) / 2, endX: midpoint };
  });

  const parsedShifts: ParsedScheduleShift[] = [];
  const rows = new Map<number, { name: string, y: number, items: { text: string, x: number }[] }>();

  // 2. Group text items by row (y-coordinate)
  mockTextItems.filter(item => item.y >= 70).forEach(item => {
    if (!rows.has(item.y)) rows.set(item.y, { name: '', y: item.y, items: [] });
    rows.get(item.y)!.items.push({ text: item.str, x: item.x });
  });

  // 3. Process each row to find name and create shifts
  for (const [y, rowData] of rows.entries()) {
    // Find the name (usually the leftmost item)
    rowData.items.sort((a, b) => a.x - b.x);
    const nameItem = rowData.items.find(item => item.x < 100);
    const name = nameItem ? normName(nameItem.text) : 'Unknown';
    if (!nameItem) continue; // Skip rows without a name

    const timeItems = rowData.items.filter(item => item !== nameItem);
    
    for (const timeItem of timeItems) {
      const timeMatch = timeItem.text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*[-–]\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
      if (!timeMatch) continue;

      const [, startStr, , endStr] = timeMatch;
      const start = to24h(startStr);
      const end = to24h(endStr);

      // Find which column this time belongs to
      const column = columnBoundaries.find(col => timeItem.x >= col.startX && timeItem.x < col.endX);
      if (column) {
        parsedShifts.push({
          id: uuid(), memberName: name, day: column.day, start, end,
          confidence: 0.98, rawText: `${name} ${timeItem.text}`
        });
      }
    }
  }

  const fileChecksum = await generateChecksum(new TextDecoder().decode(fileBuffer));
  
  const parsedData: ParsedScheduleData = {
    date: dayjs().startOf('week').format(DATE_FORMAT), // Assume current week
    shifts: parsedShifts,
    flags: {
      source: 'mock_pdf_kronos_parser',
      timestamp: new Date().toISOString(),
      checksum: fileChecksum,
    },
    diagnostics: {
      rowsParsed: rows.size,
      shiftsCreated: parsedShifts.length,
      membersResolved: 0, // To be filled by consumer
      membersCreated: 0, // To be filled by consumer
      rowsDiscarded: mockTextItems.length - dayHeaders.length - (rows.size + parsedShifts.length),
    },
  };

  return parsedData;
};

// Legacy mock for compatibility if needed elsewhere
export const parseSchedulePdfMock = async (fileChecksum: string, fileContent: string): Promise<ParsedScheduleData> => {
    const buffer = new TextEncoder().encode(fileContent);
    return parsePdfMeijerKronos(buffer);
};