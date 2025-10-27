
// src/services/importSchedule.ts
import { parsePdfMeijerKronos } from './parsers/pdfMeijerKronos';
import { parseUKGCsv } from './parsers/ukgCsv';
import { parseUKGXlsx } from './parsers/ukgXlsx';
import type { ParsedScheduleShift } from '../types';

/**
 * Main schedule import service.
 * Routes the file to the correct parser based on its extension/MIME type.
 *
 * @param file The schedule file (CSV, XLSX, or PDF).
 * @returns A promise resolving to an array of parsed shifts.
 * @throws A friendly error if the file type is unsupported.
 */
export const importSchedule = async (file: File): Promise<ParsedScheduleShift[]> => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    try {
        switch (fileExtension) {
            case 'csv':
                return await parseUKGCsv(file);
            case 'xlsx':
                return await parseUKGXlsx(file);
            case 'pdf':
                const arrayBuffer = await file.arrayBuffer();
                return await parsePdfMeijerKronos(arrayBuffer);
            default:
                throw new Error(`Unsupported file type: .${fileExtension}. Please use a .pdf, .csv, or .xlsx file.`);
        }
    } catch (error) {
        console.error(`Error parsing file with extension ${fileExtension}:`, error);
        throw new Error(`Failed to process ${file.name}. Reason: ${(error as Error).message}`);
    }
};
