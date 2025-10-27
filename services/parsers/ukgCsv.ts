// services/parsers/ukgCsv.ts
// FIX: Import ParsedScheduleData
import { ParsedScheduleData, ParsedScheduleShift } from '../../types';
import { uuid, normName, to24h } from '../utils';
import dayjs from 'dayjs';

/**
 * Parses a CSV file exported from UKG.
 * In a real app, this would use a library like Papa Parse for robustness.
 * @param file The CSV file.
 * @returns A promise resolving to the parsed schedule data.
 */
export const parseUKGCsv = async (file: File): Promise<ParsedScheduleData> => {
    const content = await file.text();
    // A more robust CSV parser would handle quoted fields
    const rows = content.split('\n').slice(1).filter(r => r.trim() !== ''); // Skip header and empty rows
    if (rows.length === 0) {
        return { date: dayjs().format('YYYY-MM-DD'), shifts: [], diagnostics: { rowsParsed: 0, shiftsCreated: 0, membersResolved: 0, membersCreated: 0, rowsDiscarded: 0, reason: "CSV file is empty or has no data rows." }};
    }

    // FIX: Explicitly type the return value of the map callback to `ParsedScheduleShift | null` to resolve the type predicate error.
    const shifts: ParsedScheduleShift[] = rows.map((row): ParsedScheduleShift | null => {
        // Assuming a common UKG format: Employee,FirstName,LastName,Date,StartTime,EndTime
        const [emp, firstName, lastName, date, startTime, endTime] = row.split(',');
        if (!date || !startTime || !endTime) return null; // Skip invalid rows
        return {
            id: uuid(),
            memberName: normName(`${firstName} ${lastName}`),
            day: dayjs(date, 'MM/DD/YYYY').format('ddd') as ParsedScheduleShift['day'],
            start: to24h(startTime),
            end: to24h(endTime),
            confidence: 0.99
        };
    }).filter((s): s is ParsedScheduleShift => s !== null);

    const firstValidDate = rows.map(r => r.split(',')[3]).find(d => d) || dayjs().format('MM/DD/YYYY');

    return { 
        date: dayjs(firstValidDate, 'MM/DD/YYYY').format('YYYY-MM-DD'), 
        shifts,
        diagnostics: {
            rowsParsed: rows.length,
            shiftsCreated: shifts.length,
            membersResolved: 0, // To be filled later
            membersCreated: 0, // To be filled later
            rowsDiscarded: rows.length - shifts.length
        }
    };
};