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
            const warnings: string[] = [];

            if (typeof window !== 'undefined' && (window as any)?.pdfjsLib) {
                try {
                    const pdfjs = (window as any).pdfjsLib;
                    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
                    const pdf = await loadingTask.promise;
                    const textContents = [];
                    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
                        const page = await pdf.getPage(pageNumber);
                        const textContent = await page.getTextContent();
                        textContents.push(textContent);
                    }

                    const parsedWithPdfJs = await parsePdfMeijerKronos(arrayBuffer, { textContents });
                    if (parsedWithPdfJs.diagnostics) {
                        parsedWithPdfJs.diagnostics.mode = 'pdfjs-live';
                        parsedWithPdfJs.diagnostics.parser = 'parsePdfMeijerKronos';
                        parsedWithPdfJs.diagnostics.pagesProcessed = textContents.length;
                        parsedWithPdfJs.diagnostics.warnings = [
                            ...(parsedWithPdfJs.diagnostics.warnings ?? []),
                            ...warnings,
                        ];
                    }
                    return parsedWithPdfJs;
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    warnings.push(`pdf.js parsing failed: ${message}`);
                }
            } else {
                warnings.push('pdf.js runtime not detected - using geometry fixture fallback.');
            }

            const parsedFallback = await parsePdfMeijerKronos(arrayBuffer);
            if (parsedFallback.diagnostics) {
                parsedFallback.diagnostics.parser = 'parsePdfMeijerKronos';
                parsedFallback.diagnostics.mode = parsedFallback.diagnostics.mode ?? 'fixture';
                parsedFallback.diagnostics.warnings = [
                    ...(parsedFallback.diagnostics.warnings ?? []),
                    ...warnings,
                ];
                if (warnings.length && !parsedFallback.diagnostics.reason) {
                    parsedFallback.diagnostics.reason = warnings[0];
                }
            }
            return parsedFallback;
        default:
            throw new Error(`Unsupported file type: .${fileExtension}`);
    }
};