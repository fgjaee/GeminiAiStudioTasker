
// src/services/parsers/pdfMeijerKronos.ts
import { supabase } from '../supabaseClient';
import type { ParsedScheduleShift } from '../../types';
import { uuid } from '../utils';

/**
 * Client wrapper that POSTs an ArrayBuffer to the Supabase Edge Function
 * `/functions/v1/parse-schedule-pdf` and returns `ParsedScheduleShift[]`.
 *
 * @param fileBuffer The ArrayBuffer content of the PDF file.
 * @returns A promise that resolves with the parsed schedule shifts.
 */
export async function parsePdfMeijerKronos(fileBuffer: ArrayBuffer): Promise<ParsedScheduleShift[]> {
  const { data, error } = await supabase.functions.invoke('parse-schedule-pdf', {
    body: fileBuffer,
  });

  if (error) {
    throw new Error(`PDF parsing failed: ${error.message}`);
  }

  if (!Array.isArray(data)) {
    throw new Error('PDF parsing function returned an invalid format.');
  }

  // Ensure each shift has a stable client-side ID if the function didn't provide one.
  return data.map(shift => ({
    ...shift,
    id: shift.id || uuid(),
  }));
}
