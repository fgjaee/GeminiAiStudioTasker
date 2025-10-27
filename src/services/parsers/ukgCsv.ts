
// src/services/parsers/ukgCsv.ts
import Papa from 'papaparse';
import { uuid, to24h, normName } from '../utils';
import type { ParsedScheduleShift } from '../../types';

const dayStr = (d: Date) => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()] as ParsedScheduleShift['day'];

export async function parseUKGCsv(file: File): Promise<ParsedScheduleShift[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const out: ParsedScheduleShift[] = [];
        for (const r of results.data as Record<string,string>[]) {
          const name = normName(`${r.FirstName||''} ${r.LastName||''}` || r.Employee || '');
          const dateStr = r.Date || r['Shift Date'] || r.StartDate;
          const startStr = r.StartTime || r['Start Time'] || '';
          const endStr   = r.EndTime   || r['End Time']   || '';
          
          if (!name || !dateStr || !startStr || !endStr) continue;

          // Handle various date formats that might appear in CSV
          const dt = new Date(dateStr);
          if (isNaN(dt.getTime())) continue;

          out.push({
            id: uuid(),
            memberName: name,
            day: dayStr(dt),
            start: to24h(startStr),
            end: to24h(endStr),
            rawText: JSON.stringify(r),
            confidence: 0.95
          });
        }
        resolve(out);
      },
      error: (error: Error) => {
        reject(error);
      }
    });
  });
}
