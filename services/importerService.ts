// services/importerService.ts
import { ParsedScheduleData, ParsedScheduleShift } from '../types';
import { uuid, normName, to24h } from '../utils/helpers';
import dayjs from 'dayjs';
import { parsePdfGeometry } from './pdfParserMock';

// --- Mock Parsers for CSV and XLSX ---
// In a real app, these would use libraries like Papa Parse and SheetJS.

const parseUKGCsv = async (file: File): Promise<ParsedScheduleData> => {
    // Mock implementation of CSV parsing
    const content = await file.text();
    const rows = content.split('\n').slice(1).filter(r => r.trim() !== ''); // Skip header and empty rows
    const shifts: ParsedScheduleShift[] = rows.map(row => {
        const [emp, firstName, lastName, date, startTime, endTime] = row.split(',');
        return {
            id: uuid(),
            memberName: normName(`${firstName} ${lastName}`),
            day: dayjs(date, 'MM/DD/YYYY').format('ddd') as ParsedScheduleShift['day'],
            start: to24h(startTime),
            end: to24h(endTime),
            confidence: 0.95
        };
    });
    return { 
        date: dayjs(rows[0].split(',')[3], 'MM/DD/YYYY').format('YYYY-MM-DD'), 
        shifts,
        diagnostics: {
            rowsParsed: rows.length,
            shiftsCreated: shifts.length,
            membersResolved: shifts.length, // Mock
            membersCreated: 0, // Mock
            rowsDiscarded: 0
        }
    };
};

const parseUKGXlsx = async (file: File): Promise<ParsedScheduleData> => {
    // Mock implementation of XLSX parsing. Logic is similar to CSV for the mock.
    // A real implementation would use a library to read sheets.
    const shifts: ParsedScheduleShift[] = [
        // Mock data similar to what would be extracted
        { id: uuid(), memberName: 'Alice Johnson', day: 'Mon', start: '08:00', end: '16:00' },
        { id: uuid(), memberName: 'Bob Smith', day: 'Mon', start: '10:00', end: '18:00' }
    ];
    return { 
        date: dayjs().format('YYYY-MM-DD'), 
        shifts,
        diagnostics: {
            rowsParsed: 2,
            shiftsCreated: 2,
            membersResolved: 2,
            membersCreated: 0,
            rowsDiscarded: 0
        }
    };
};


/**
 * Main schedule import service.
 * Routes the file to the correct parser based on its extension.
 * @param file The schedule file (CSV, XLSX, or PDF).
 * @returns A promise resolving to the parsed schedule data.
 */
export const importSchedule = async (file: File): Promise<ParsedScheduleData> => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    switch (fileExtension) {
        case 'csv':
            return parseUKGCsv(file);
        case 'xlsx':
            return parseUKGXlsx(file);
        case 'pdf':
            const fileContent = await file.text(); // Mock content for the parser
            return parsePdfGeometry(fileContent);
        default:
            throw new Error(`Unsupported file type: .${fileExtension}`);
    }
};