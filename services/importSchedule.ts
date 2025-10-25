// services/importSchedule.ts
import { ParsedScheduleData } from '../types';
import { parsePdfMeijerKronos } from './parsers/pdfMeijerKronos';
import { parseUKGCsv } from './parsers/ukgCsv';
import { parseUKGXlsx } from './parsers/ukgXlsx';


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
            const arrayBuffer = await file.arrayBuffer();
            return parsePdfMeijerKronos(arrayBuffer);
        default:
            throw new Error(`Unsupported file type: .${fileExtension}`);
    }
};