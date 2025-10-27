
// src/services/parsers/ukgXlsx.ts
import { read, utils } from 'xlsx';
import { uuid, to24h, normName } from '../utils';
import type { ParsedScheduleShift } from '../../types';

export async function parseUKGXlsx(file: File): Promise<ParsedScheduleShift[]> {
  const buf = await file.arrayBuffer();
  const wb = read(buf);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = utils.sheet_to_json<Record<string,any>>(ws, { raw:false });
  const out: ParsedScheduleShift[] = [];
  const dayStr = (d: Date) => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()] as ParsedScheduleShift['day'];

  for (const r of rows) {
    const name = normName(`${r.FirstName||''} ${r.LastName||''}` || r.Employee || '');
    const dateStr = r.Date || r['Shift Date'] || r.StartDate;
    const startStr = r.StartTime || r['Start Time'] || '';
    const endStr   = r.EndTime   || r['End Time']   || '';
    
    if (!name || !dateStr || !startStr || !endStr) continue;

    // Handle Excel dates which can be numbers or strings
    let dt;
    if (typeof dateStr === 'number') {
        // Excel serial date
        dt = new Date(Date.UTC(1899, 11, 30 + dateStr));
    } else {
        dt = new Date(dateStr);
    }
    
    if (isNaN(dt.getTime())) continue;

    out.push({
      id: uuid(),
      memberName: name,
      day: dayStr(dt),
      start: to24h(startStr.toString()),
      end: to24h(endStr.toString()),
      rawText: JSON.stringify(r),
      confidence: 0.95
    });
  }
  return out;
}
